#!/usr/bin/env node

/**
 * Backup Health Monitoring System
 *
 * Monitors the health of Supabase backups and sends alerts
 * when issues are detected or thresholds are exceeded.
 */

const fs = require('fs').promises;
const path = require('path');

class BackupHealthMonitor {
  constructor(config = {}) {
    this.config = {
      logDir: process.env.BACKUP_LOG_DIR || './backup-validation-logs',
      drillLogDir: process.env.BACKUP_DRILL_LOG_DIR || './backup-drill-logs',
      alertWebhook: process.env.BACKUP_ALERT_WEBHOOK,
      metricsWebhook: process.env.METRICS_WEBHOOK,
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 90,
      alertThresholds: {
        maxFailedValidations: 3,
        maxFailedDrills: 2,
        maxValidationAgeHours: 48,
        maxDrillAgeHours: 168, // 7 days
        minBackupSizeMB: 1,
        maxBackupSizeMB: 10240 // 10GB
      },
      ...config
    };

    this.metrics = {
      timestamp: new Date().toISOString(),
      validations: {
        total: 0,
        passed: 0,
        failed: 0,
        lastRun: null,
        lastSuccess: null
      },
      drills: {
        total: 0,
        passed: 0,
        failed: 0,
        lastRun: null,
        lastSuccess: null
      },
      alerts: [],
      health: {
        status: 'unknown',
        score: 0,
        issues: []
      }
    };
  }

  log(level, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...data
    };

    console.log(`[${level.toUpperCase()}] ${message}`, data);
    return logEntry;
  }

  async collectValidationMetrics() {
    this.log('info', '📊 Collecting validation metrics...');

    try {
      // Check if log directory exists
      try {
        await fs.access(this.config.logDir);
      } catch {
        this.log('warning', 'Validation log directory does not exist', { dir: this.config.logDir });
        return;
      }

      // Read validation report files
      const files = await fs.readdir(this.config.logDir);
      const reportFiles = files.filter(f => f.startsWith('validation-report-') && f.endsWith('.json'));

      this.log('info', `Found ${reportFiles.length} validation reports`);

      let totalValidations = 0;
      let passedValidations = 0;
      let failedValidations = 0;
      let lastRun = null;
      let lastSuccess = null;

      for (const file of reportFiles) {
        try {
          const filePath = path.join(this.config.logDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const report = JSON.parse(content);

          totalValidations++;

          if (report.status === 'pass') {
            passedValidations++;
            if (!lastSuccess || new Date(report.timestamp) > new Date(lastSuccess)) {
              lastSuccess = report.timestamp;
            }
          } else {
            failedValidations++;
          }

          if (!lastRun || new Date(report.timestamp) > new Date(lastRun)) {
            lastRun = report.timestamp;
          }

        } catch (error) {
          this.log('warning', `Failed to parse validation report: ${file}`, { error: error.message });
        }
      }

      this.metrics.validations = {
        total: totalValidations,
        passed: passedValidations,
        failed: failedValidations,
        lastRun,
        lastSuccess
      };

      this.log('info', '✅ Validation metrics collected', this.metrics.validations);

    } catch (error) {
      this.log('error', '❌ Failed to collect validation metrics', { error: error.message });
    }
  }

  async collectDrillMetrics() {
    this.log('info', '🔄 Collecting drill metrics...');

    try {
      // Check if drill log directory exists
      try {
        await fs.access(this.config.drillLogDir);
      } catch {
        this.log('warning', 'Drill log directory does not exist', { dir: this.config.drillLogDir });
        return;
      }

      const files = await fs.readdir(this.config.drillLogDir);
      const reportFiles = files.filter(f => f.startsWith('drill-report-') && f.endsWith('.json'));

      this.log('info', `Found ${reportFiles.length} drill reports`);

      let totalDrills = 0;
      let passedDrills = 0;
      let failedDrills = 0;
      let lastRun = null;
      let lastSuccess = null;

      for (const file of reportFiles) {
        try {
          const filePath = path.join(this.config.drillLogDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const report = JSON.parse(content);

          totalDrills++;

          if (report.status === 'success') {
            passedDrills++;
            if (!lastSuccess || new Date(report.timestamp) > new Date(lastSuccess)) {
              lastSuccess = report.timestamp;
            }
          } else {
            failedDrills++;
          }

          if (!lastRun || new Date(report.timestamp) > new Date(lastRun)) {
            lastRun = report.timestamp;
          }

        } catch (error) {
          this.log('warning', `Failed to parse drill report: ${file}`, { error: error.message });
        }
      }

      this.metrics.drills = {
        total: totalDrills,
        passed: passedDrills,
        failed: failedDrills,
        lastRun,
        lastSuccess
      };

      this.log('info', '✅ Drill metrics collected', this.metrics.drills);

    } catch (error) {
      this.log('error', '❌ Failed to collect drill metrics', { error: error.message });
    }
  }

  checkHealthThresholds() {
    this.log('info', '🩺 Checking health thresholds...');

    const alerts = [];
    const { thresholds } = this.config.alert;
    const now = new Date();

    // Check validation failures
    if (this.metrics.validations.failed >= this.config.alertThresholds.maxFailedValidations) {
      alerts.push({
        level: 'critical',
        type: 'validation_failures',
        message: `Too many validation failures: ${this.metrics.validations.failed}`,
        threshold: this.config.alertThresholds.maxFailedValidations,
        actual: this.metrics.validations.failed
      });
    }

    // Check drill failures
    if (this.metrics.drills.failed >= this.config.alertThresholds.maxFailedDrills) {
      alerts.push({
        level: 'critical',
        type: 'drill_failures',
        message: `Too many drill failures: ${this.metrics.drills.failed}`,
        threshold: this.config.alertThresholds.maxFailedDrills,
        actual: this.metrics.drills.failed
      });
    }

    // Check validation age
    if (this.metrics.validations.lastRun) {
      const ageHours = (now - new Date(this.metrics.validations.lastRun)) / (1000 * 60 * 60);
      if (ageHours > this.config.alertThresholds.maxValidationAgeHours) {
        alerts.push({
          level: 'warning',
          type: 'stale_validation',
          message: `Last validation is too old: ${Math.round(ageHours)} hours`,
          threshold: this.config.alertThresholds.maxValidationAgeHours,
          actual: Math.round(ageHours)
        });
      }
    } else {
      alerts.push({
        level: 'critical',
        type: 'no_validations',
        message: 'No validation reports found'
      });
    }

    // Check drill age
    if (this.metrics.drills.lastRun) {
      const ageHours = (now - new Date(this.metrics.drills.lastRun)) / (1000 * 60 * 60);
      if (ageHours > this.config.alertThresholds.maxDrillAgeHours) {
        alerts.push({
          level: 'warning',
          type: 'stale_drill',
          message: `Last drill is too old: ${Math.round(ageHours)} hours`,
          threshold: this.config.alertThresholds.maxDrillAgeHours,
          actual: Math.round(ageHours)
        });
      }
    } else {
      alerts.push({
        level: 'warning',
        type: 'no_drills',
        message: 'No drill reports found'
      });
    }

    this.metrics.alerts = alerts;

    // Calculate health score
    this.calculateHealthScore();

    this.log('info', `🔍 Health check completed: ${alerts.length} alerts found`);
  }

  calculateHealthScore() {
    let score = 100;
    const issues = [];

    // Reduce score based on alerts
    for (const alert of this.metrics.alerts) {
      switch (alert.level) {
        case 'critical':
          score -= 30;
          issues.push(alert.message);
          break;
        case 'warning':
          score -= 15;
          issues.push(alert.message);
          break;
        case 'info':
          score -= 5;
          break;
      }
    }

    // Adjust based on success rates
    const validationSuccessRate = this.metrics.validations.total > 0 ?
      (this.metrics.validations.passed / this.metrics.validations.total) : 0;
    const drillSuccessRate = this.metrics.drills.total > 0 ?
      (this.metrics.drills.passed / this.metrics.drills.total) : 0;

    if (validationSuccessRate < 0.8) {
      score -= 20;
      issues.push(`Low validation success rate: ${Math.round(validationSuccessRate * 100)}%`);
    }

    if (drillSuccessRate < 0.8) {
      score -= 20;
      issues.push(`Low drill success rate: ${Math.round(drillSuccessRate * 100)}%`);
    }

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    // Determine health status
    let status;
    if (score >= 90) status = 'excellent';
    else if (score >= 70) status = 'good';
    else if (score >= 50) status = 'fair';
    else if (score >= 30) status = 'poor';
    else status = 'critical';

    this.metrics.health = {
      status,
      score,
      issues
    };
  }

  async sendAlerts() {
    if (!this.config.alertWebhook) {
      this.log('info', '📢 No alert webhook configured - skipping alerts');
      return;
    }

    const criticalAlerts = this.metrics.alerts.filter(a => a.level === 'critical');
    const warningAlerts = this.metrics.alerts.filter(a => a.level === 'warning');

    if (criticalAlerts.length === 0 && warningAlerts.length === 0) {
      this.log('info', '✅ No alerts to send');
      return;
    }

    this.log('info', '🚨 Sending backup health alerts...');

    const color = criticalAlerts.length > 0 ? 'danger' : 'warning';
    const icon = criticalAlerts.length > 0 ? '🚨' : '⚠️';

    const payload = {
      text: `${icon} Backup Health Alert`,
      attachments: [
        {
          color,
          fields: [
            {
              title: "Health Status",
              value: this.metrics.health.status.toUpperCase(),
              short: true
            },
            {
              title: "Health Score",
              value: `${this.metrics.health.score}/100`,
              short: true
            },
            {
              title: "Critical Alerts",
              value: criticalAlerts.length.toString(),
              short: true
            },
            {
              title: "Warning Alerts",
              value: warningAlerts.length.toString(),
              short: true
            }
          ]
        }
      ]
    };

    // Add alert details
    if (criticalAlerts.length > 0) {
      payload.attachments.push({
        color: 'danger',
        title: '🚨 Critical Issues',
        text: criticalAlerts.map(a => `• ${a.message}`).join('\n'),
        mrkdwn_in: ['text']
      });
    }

    if (warningAlerts.length > 0) {
      payload.attachments.push({
        color: 'warning',
        title: '⚠️ Warnings',
        text: warningAlerts.map(a => `• ${a.message}`).join('\n'),
        mrkdwn_in: ['text']
      });
    }

    try {
      const response = await fetch(this.config.alertWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        this.log('info', '✅ Alerts sent successfully');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      this.log('error', '❌ Failed to send alerts', { error: error.message });
    }
  }

  async sendMetrics() {
    if (!this.config.metricsWebhook) {
      this.log('info', '📊 No metrics webhook configured - skipping metrics');
      return;
    }

    this.log('info', '📊 Sending backup metrics...');

    const payload = {
      timestamp: this.metrics.timestamp,
      source: 'pingbuoy-backup-monitor',
      metrics: {
        'backup.validation.total': this.metrics.validations.total,
        'backup.validation.passed': this.metrics.validations.passed,
        'backup.validation.failed': this.metrics.validations.failed,
        'backup.drill.total': this.metrics.drills.total,
        'backup.drill.passed': this.metrics.drills.passed,
        'backup.drill.failed': this.metrics.drills.failed,
        'backup.health.score': this.metrics.health.score,
        'backup.alerts.critical': this.metrics.alerts.filter(a => a.level === 'critical').length,
        'backup.alerts.warning': this.metrics.alerts.filter(a => a.level === 'warning').length
      },
      tags: {
        service: 'pingbuoy',
        component: 'backup-system',
        environment: process.env.NODE_ENV || 'production'
      }
    };

    try {
      const response = await fetch(this.config.metricsWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        this.log('info', '✅ Metrics sent successfully');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      this.log('error', '❌ Failed to send metrics', { error: error.message });
    }
  }

  async generateHealthReport() {
    this.log('info', '📋 Generating health report...');

    const reportPath = path.join(this.config.logDir, `health-report-${Date.now()}.json`);

    // Ensure directory exists
    await fs.mkdir(path.dirname(reportPath), { recursive: true });

    // Write detailed health report
    await fs.writeFile(reportPath, JSON.stringify(this.metrics, null, 2));

    // Generate human-readable summary
    const summaryPath = path.join(this.config.logDir, `health-summary-${Date.now()}.txt`);
    const summaryContent = this.generateHealthSummary();
    await fs.writeFile(summaryPath, summaryContent);

    this.log('info', '✅ Health report generated', { reportPath, summaryPath });

    return { reportPath, summaryPath };
  }

  generateHealthSummary() {
    const { health, validations, drills, alerts } = this.metrics;

    let content = `🩺 Backup Health Summary\n`;
    content += `=========================\n\n`;
    content += `Timestamp: ${this.metrics.timestamp}\n`;
    content += `Health Status: ${health.status.toUpperCase()}\n`;
    content += `Health Score: ${health.score}/100\n\n`;

    content += `Validation Metrics:\n`;
    content += `  Total: ${validations.total}\n`;
    content += `  Passed: ${validations.passed}\n`;
    content += `  Failed: ${validations.failed}\n`;
    content += `  Success Rate: ${validations.total > 0 ? Math.round((validations.passed / validations.total) * 100) : 0}%\n`;
    content += `  Last Run: ${validations.lastRun || 'Never'}\n`;
    content += `  Last Success: ${validations.lastSuccess || 'Never'}\n\n`;

    content += `Drill Metrics:\n`;
    content += `  Total: ${drills.total}\n`;
    content += `  Passed: ${drills.passed}\n`;
    content += `  Failed: ${drills.failed}\n`;
    content += `  Success Rate: ${drills.total > 0 ? Math.round((drills.passed / drills.total) * 100) : 0}%\n`;
    content += `  Last Run: ${drills.lastRun || 'Never'}\n`;
    content += `  Last Success: ${drills.lastSuccess || 'Never'}\n\n`;

    if (alerts.length > 0) {
      content += `Alerts:\n`;
      for (const alert of alerts) {
        const icon = alert.level === 'critical' ? '🚨' : alert.level === 'warning' ? '⚠️' : 'ℹ️';
        content += `  ${icon} [${alert.level.toUpperCase()}] ${alert.message}\n`;
      }
      content += `\n`;
    }

    if (health.issues.length > 0) {
      content += `Issues:\n`;
      for (const issue of health.issues) {
        content += `  • ${issue}\n`;
      }
      content += `\n`;
    }

    content += `Recommendations:\n`;
    if (validations.failed > 0) {
      content += `  • Review failed validations and fix underlying issues\n`;
    }
    if (drills.failed > 0) {
      content += `  • Investigate drill failures and update procedures\n`;
    }
    if (!validations.lastRun) {
      content += `  • Set up automated backup validation\n`;
    }
    if (!drills.lastRun) {
      content += `  • Set up automated backup restore drills\n`;
    }
    if (alerts.filter(a => a.level === 'critical').length > 0) {
      content += `  • Address critical alerts immediately\n`;
    }

    return content;
  }

  async cleanupOldReports() {
    this.log('info', '🧹 Cleaning up old reports...');

    const directories = [this.config.logDir, this.config.drillLogDir];
    const cutoffDate = new Date(Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000));

    let cleaned = 0;

    for (const dir of directories) {
      try {
        const files = await fs.readdir(dir);

        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = await fs.stat(filePath);

          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
            cleaned++;
          }
        }
      } catch (error) {
        this.log('warning', `Failed to cleanup directory: ${dir}`, { error: error.message });
      }
    }

    this.log('info', `✅ Cleanup completed: ${cleaned} files removed`);
  }

  async runHealthCheck() {
    this.log('info', '🚀 Starting backup health check...');

    try {
      // Collect metrics
      await this.collectValidationMetrics();
      await this.collectDrillMetrics();

      // Check health thresholds
      this.checkHealthThresholds();

      // Send alerts if needed
      await this.sendAlerts();

      // Send metrics
      await this.sendMetrics();

      // Generate reports
      await this.generateHealthReport();

      // Cleanup old reports
      await this.cleanupOldReports();

      const statusIcon = this.metrics.health.status === 'excellent' || this.metrics.health.status === 'good' ? '✅' : '⚠️';
      this.log('info', `${statusIcon} Health check completed - Status: ${this.metrics.health.status}`);

      return this.metrics;

    } catch (error) {
      this.log('error', '❌ Health check failed', { error: error.message });
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const monitor = new BackupHealthMonitor();

  try {
    const results = await monitor.runHealthCheck();
    const exitCode = results.alerts.some(a => a.level === 'critical') ? 1 : 0;
    process.exit(exitCode);
  } catch (error) {
    console.error('Health check failed:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = { BackupHealthMonitor };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}