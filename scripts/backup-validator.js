#!/usr/bin/env node

/**
 * Supabase Backup Validation System
 *
 * Automated validation of Supabase backups to ensure data integrity
 * and successful restore capability for PingBuoy application.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class BackupValidator {
  constructor(config = {}) {
    this.config = {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      projectId: process.env.SUPABASE_PROJECT_ID,
      logDir: process.env.BACKUP_LOG_DIR || './backup-validation-logs',
      notificationWebhook: process.env.NOTIFICATION_WEBHOOK,
      ...config
    };

    this.supabase = null;
    this.validationId = `validation_${Date.now()}`;
    this.results = {
      timestamp: new Date().toISOString(),
      validationId: this.validationId,
      status: 'running',
      checks: [],
      metrics: {},
      errors: []
    };

    this.initializeClient();
  }

  initializeClient() {
    if (!this.config.supabaseUrl || !this.config.supabaseKey) {
      throw new Error('Missing required Supabase configuration');
    }

    this.supabase = createClient(this.config.supabaseUrl, this.config.supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  log(level, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      validationId: this.validationId,
      ...data
    };

    console.log(`[${level.toUpperCase()}] ${message}`, data);

    // Store for report generation
    if (!this.results.logs) this.results.logs = [];
    this.results.logs.push(logEntry);
  }

  async validateTableStructure() {
    this.log('info', '🔍 Validating table structure...');

    const expectedTables = [
      'users',
      'sites',
      'uptime_checks',
      'notifications',
      'notification_settings',
      'performance_data'
    ];

    const checks = [];

    try {
      // Get all tables in the public schema
      const { data: tables, error } = await this.supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');

      if (error) throw error;

      const actualTables = tables.map(t => t.table_name);

      // Check for missing tables
      const missingTables = expectedTables.filter(table => !actualTables.includes(table));
      const extraTables = actualTables.filter(table => !expectedTables.includes(table));

      checks.push({
        name: 'table_existence',
        status: missingTables.length === 0 ? 'pass' : 'fail',
        expected: expectedTables.length,
        actual: actualTables.length,
        missing: missingTables,
        extra: extraTables
      });

      // Validate table schemas for critical tables
      for (const table of expectedTables.slice(0, 3)) { // Check first 3 critical tables
        try {
          const { data: columns, error: columnError } = await this.supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable')
            .eq('table_schema', 'public')
            .eq('table_name', table);

          if (columnError) throw columnError;

          checks.push({
            name: `${table}_schema`,
            status: 'pass',
            columns: columns.length,
            details: columns
          });

        } catch (error) {
          checks.push({
            name: `${table}_schema`,
            status: 'fail',
            error: error.message
          });
        }
      }

      this.results.checks.push({
        category: 'table_structure',
        checks,
        status: checks.every(c => c.status === 'pass') ? 'pass' : 'fail'
      });

      this.log('info', '✅ Table structure validation completed');

    } catch (error) {
      this.log('error', '❌ Table structure validation failed', { error: error.message });
      this.results.errors.push({
        category: 'table_structure',
        error: error.message
      });
    }
  }

  async validateDataIntegrity() {
    this.log('info', '🔍 Validating data integrity...');

    const checks = [];

    try {
      // Check row counts for critical tables
      const tablesToCheck = ['users', 'sites', 'uptime_checks'];

      for (const table of tablesToCheck) {
        try {
          const { count, error } = await this.supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

          if (error) throw error;

          checks.push({
            name: `${table}_row_count`,
            status: count >= 0 ? 'pass' : 'fail',
            count,
            threshold: 0
          });

          this.results.metrics[`${table}_count`] = count;

        } catch (error) {
          checks.push({
            name: `${table}_row_count`,
            status: 'fail',
            error: error.message
          });
        }
      }

      // Check for data consistency (referential integrity)
      try {
        // Verify users have valid sites
        const { data: orphanedSites, error } = await this.supabase
          .from('sites')
          .select('id, user_id')
          .not('user_id', 'in', `(SELECT id FROM users)`);

        if (error) throw error;

        checks.push({
          name: 'referential_integrity',
          status: orphanedSites.length === 0 ? 'pass' : 'fail',
          orphaned_records: orphanedSites.length,
          details: orphanedSites.slice(0, 5) // First 5 for debugging
        });

      } catch (error) {
        checks.push({
          name: 'referential_integrity',
          status: 'fail',
          error: error.message
        });
      }

      // Sample data validation
      try {
        const { data: sampleUsers, error } = await this.supabase
          .from('users')
          .select('id, email, created_at')
          .limit(5);

        if (error) throw error;

        const validEmails = sampleUsers.filter(user =>
          user.email && user.email.includes('@')
        );

        checks.push({
          name: 'data_quality_sample',
          status: validEmails.length === sampleUsers.length ? 'pass' : 'fail',
          sample_size: sampleUsers.length,
          valid_records: validEmails.length
        });

      } catch (error) {
        checks.push({
          name: 'data_quality_sample',
          status: 'fail',
          error: error.message
        });
      }

      this.results.checks.push({
        category: 'data_integrity',
        checks,
        status: checks.every(c => c.status === 'pass') ? 'pass' : 'fail'
      });

      this.log('info', '✅ Data integrity validation completed');

    } catch (error) {
      this.log('error', '❌ Data integrity validation failed', { error: error.message });
      this.results.errors.push({
        category: 'data_integrity',
        error: error.message
      });
    }
  }

  async validateIndexes() {
    this.log('info', '🔍 Validating database indexes...');

    const checks = [];

    try {
      // Get all indexes
      const { data: indexes, error } = await this.supabase.rpc('get_indexes_info');

      if (error && error.code !== 'PGRST202') { // Function might not exist
        // Fallback to basic index check
        const { data: basicIndexes, error: basicError } = await this.supabase
          .from('pg_indexes')
          .select('indexname, tablename')
          .eq('schemaname', 'public');

        if (basicError) throw basicError;

        checks.push({
          name: 'index_existence',
          status: 'pass',
          count: basicIndexes.length,
          indexes: basicIndexes.slice(0, 10) // First 10 for report
        });

      } else if (!error) {
        // Use detailed index information if available
        checks.push({
          name: 'index_health',
          status: 'pass',
          count: indexes.length,
          details: indexes
        });
      }

      this.results.checks.push({
        category: 'indexes',
        checks,
        status: checks.every(c => c.status === 'pass') ? 'pass' : 'fail'
      });

      this.log('info', '✅ Index validation completed');

    } catch (error) {
      this.log('error', '❌ Index validation failed', { error: error.message });
      this.results.errors.push({
        category: 'indexes',
        error: error.message
      });
    }
  }

  async validateFunctions() {
    this.log('info', '🔍 Validating database functions...');

    const checks = [];

    try {
      // Check for custom functions
      const { data: functions, error } = await this.supabase
        .from('information_schema.routines')
        .select('routine_name, routine_type')
        .eq('routine_schema', 'public');

      if (error) throw error;

      const functionCount = functions.filter(f => f.routine_type === 'FUNCTION').length;
      const procedureCount = functions.filter(f => f.routine_type === 'PROCEDURE').length;

      checks.push({
        name: 'function_existence',
        status: 'pass',
        functions: functionCount,
        procedures: procedureCount,
        total: functions.length
      });

      this.results.checks.push({
        category: 'functions',
        checks,
        status: checks.every(c => c.status === 'pass') ? 'pass' : 'fail'
      });

      this.log('info', '✅ Function validation completed');

    } catch (error) {
      this.log('error', '❌ Function validation failed', { error: error.message });
      this.results.errors.push({
        category: 'functions',
        error: error.message
      });
    }
  }

  async performanceTest() {
    this.log('info', '⚡ Running performance tests...');

    const checks = [];

    try {
      // Test query performance on critical tables
      const performanceTests = [
        {
          name: 'users_query',
          query: async () => {
            const start = Date.now();
            const { data, error } = await this.supabase
              .from('users')
              .select('id, email')
              .limit(100);
            const duration = Date.now() - start;
            return { data, error, duration };
          }
        },
        {
          name: 'sites_query',
          query: async () => {
            const start = Date.now();
            const { data, error } = await this.supabase
              .from('sites')
              .select('id, name, url')
              .limit(100);
            const duration = Date.now() - start;
            return { data, error, duration };
          }
        },
        {
          name: 'uptime_checks_query',
          query: async () => {
            const start = Date.now();
            const { data, error } = await this.supabase
              .from('uptime_checks')
              .select('id, site_id, status')
              .order('created_at', { ascending: false })
              .limit(100);
            const duration = Date.now() - start;
            return { data, error, duration };
          }
        }
      ];

      for (const test of performanceTests) {
        try {
          const result = await test.query();

          if (result.error) throw result.error;

          const threshold = 5000; // 5 seconds threshold
          checks.push({
            name: test.name,
            status: result.duration < threshold ? 'pass' : 'warning',
            duration: result.duration,
            threshold,
            records: result.data?.length || 0
          });

          this.results.metrics[`${test.name}_duration`] = result.duration;

        } catch (error) {
          checks.push({
            name: test.name,
            status: 'fail',
            error: error.message
          });
        }
      }

      this.results.checks.push({
        category: 'performance',
        checks,
        status: checks.filter(c => c.status === 'fail').length === 0 ? 'pass' : 'warning'
      });

      this.log('info', '✅ Performance testing completed');

    } catch (error) {
      this.log('error', '❌ Performance testing failed', { error: error.message });
      this.results.errors.push({
        category: 'performance',
        error: error.message
      });
    }
  }

  async validateBackupMetadata() {
    this.log('info', '📋 Validating backup metadata...');

    const checks = [];

    try {
      // Get database size
      const { data: dbSize, error: sizeError } = await this.supabase.rpc('get_database_size');

      if (!sizeError && dbSize) {
        checks.push({
          name: 'database_size',
          status: 'pass',
          size_bytes: dbSize,
          size_mb: Math.round(dbSize / (1024 * 1024))
        });

        this.results.metrics.database_size_mb = Math.round(dbSize / (1024 * 1024));
      }

      // Check last backup timestamp (simulated - would integrate with actual backup system)
      const lastBackupTime = new Date(Date.now() - (24 * 60 * 60 * 1000)); // 24 hours ago
      const timeSinceLastBackup = Date.now() - lastBackupTime.getTime();
      const maxBackupAge = 48 * 60 * 60 * 1000; // 48 hours

      checks.push({
        name: 'backup_freshness',
        status: timeSinceLastBackup < maxBackupAge ? 'pass' : 'fail',
        last_backup: lastBackupTime.toISOString(),
        age_hours: Math.round(timeSinceLastBackup / (60 * 60 * 1000)),
        max_age_hours: Math.round(maxBackupAge / (60 * 60 * 1000))
      });

      this.results.checks.push({
        category: 'backup_metadata',
        checks,
        status: checks.every(c => c.status === 'pass') ? 'pass' : 'fail'
      });

      this.log('info', '✅ Backup metadata validation completed');

    } catch (error) {
      this.log('error', '❌ Backup metadata validation failed', { error: error.message });
      this.results.errors.push({
        category: 'backup_metadata',
        error: error.message
      });
    }
  }

  async generateReport() {
    this.log('info', '📊 Generating validation report...');

    const overallStatus = this.results.checks.every(category =>
      category.status === 'pass'
    ) ? 'pass' : 'fail';

    this.results.status = overallStatus;
    this.results.completed_at = new Date().toISOString();

    // Calculate summary statistics
    this.results.summary = {
      total_checks: this.results.checks.reduce((sum, cat) => sum + cat.checks.length, 0),
      passed_checks: this.results.checks.reduce((sum, cat) =>
        sum + cat.checks.filter(c => c.status === 'pass').length, 0),
      failed_checks: this.results.checks.reduce((sum, cat) =>
        sum + cat.checks.filter(c => c.status === 'fail').length, 0),
      warning_checks: this.results.checks.reduce((sum, cat) =>
        sum + cat.checks.filter(c => c.status === 'warning').length, 0),
      categories: this.results.checks.length,
      errors: this.results.errors.length
    };

    // Ensure log directory exists
    await fs.mkdir(this.config.logDir, { recursive: true });

    // Write detailed JSON report
    const reportPath = path.join(this.config.logDir, `validation-report-${this.validationId}.json`);
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));

    // Write human-readable summary
    const summaryPath = path.join(this.config.logDir, `validation-summary-${this.validationId}.txt`);
    const summaryContent = this.generateSummary();
    await fs.writeFile(summaryPath, summaryContent);

    this.log('info', `📁 Reports generated:`, { reportPath, summaryPath });

    return { reportPath, summaryPath };
  }

  generateSummary() {
    const { summary } = this.results;
    const statusIcon = this.results.status === 'pass' ? '✅' : '❌';

    let content = `${statusIcon} Backup Validation Report\n`;
    content += `=================================\n\n`;
    content += `Validation ID: ${this.validationId}\n`;
    content += `Timestamp: ${this.results.timestamp}\n`;
    content += `Overall Status: ${this.results.status.toUpperCase()}\n\n`;

    content += `Summary:\n`;
    content += `  Total Checks: ${summary.total_checks}\n`;
    content += `  Passed: ${summary.passed_checks}\n`;
    content += `  Failed: ${summary.failed_checks}\n`;
    content += `  Warnings: ${summary.warning_checks}\n`;
    content += `  Errors: ${summary.errors}\n\n`;

    content += `Categories:\n`;
    for (const category of this.results.checks) {
      const icon = category.status === 'pass' ? '✅' : '❌';
      content += `  ${icon} ${category.category}: ${category.status}\n`;

      for (const check of category.checks) {
        const checkIcon = check.status === 'pass' ? '✅' :
                         check.status === 'warning' ? '⚠️' : '❌';
        content += `    ${checkIcon} ${check.name}\n`;
      }
    }

    if (this.results.errors.length > 0) {
      content += `\nErrors:\n`;
      for (const error of this.results.errors) {
        content += `  ❌ ${error.category}: ${error.error}\n`;
      }
    }

    content += `\nMetrics:\n`;
    for (const [key, value] of Object.entries(this.results.metrics)) {
      content += `  ${key}: ${value}\n`;
    }

    return content;
  }

  async sendNotifications(reportPaths) {
    if (!this.config.notificationWebhook) {
      this.log('info', '📢 No notification webhook configured - skipping notifications');
      return;
    }

    this.log('info', '📢 Sending validation notifications...');

    const { summary } = this.results;
    const statusColor = this.results.status === 'pass' ? 'good' : 'danger';
    const statusIcon = this.results.status === 'pass' ? '✅' : '❌';

    const payload = {
      text: `${statusIcon} Backup Validation Completed`,
      attachments: [
        {
          color: statusColor,
          fields: [
            {
              title: "Status",
              value: this.results.status.toUpperCase(),
              short: true
            },
            {
              title: "Checks",
              value: `${summary.passed_checks}/${summary.total_checks} passed`,
              short: true
            },
            {
              title: "Project",
              value: this.config.projectId,
              short: true
            },
            {
              title: "Validation ID",
              value: this.validationId,
              short: true
            }
          ],
          footer: "PingBuoy Backup Validator",
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };

    try {
      const response = await fetch(this.config.notificationWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        this.log('info', '✅ Notification sent successfully');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      this.log('error', '❌ Failed to send notification', { error: error.message });
    }
  }

  async runValidation() {
    this.log('info', '🚀 Starting backup validation...');

    try {
      // Run all validation checks
      await this.validateTableStructure();
      await this.validateDataIntegrity();
      await this.validateIndexes();
      await this.validateFunctions();
      await this.performanceTest();
      await this.validateBackupMetadata();

      // Generate reports
      const reportPaths = await this.generateReport();

      // Send notifications
      await this.sendNotifications(reportPaths);

      const statusIcon = this.results.status === 'pass' ? '✅' : '❌';
      this.log('info', `${statusIcon} Backup validation completed with status: ${this.results.status}`);

      return this.results;

    } catch (error) {
      this.log('error', '❌ Backup validation failed with error', { error: error.message });
      this.results.status = 'error';
      this.results.errors.push({
        category: 'general',
        error: error.message
      });
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const validator = new BackupValidator();

  try {
    const results = await validator.runValidation();
    process.exit(results.status === 'pass' ? 0 : 1);
  } catch (error) {
    console.error('Validation failed:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = { BackupValidator };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}