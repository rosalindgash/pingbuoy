/**
 * Production Log Monitoring System
 *
 * This module provides:
 * - Real-time log analysis for sensitive data leakage
 * - Automated alerts for security violations
 * - Log aggregation and structured analysis
 * - Integration with monitoring services
 */

interface LogEntry {
  timestamp: string
  level: string
  message: string
  component?: string
  error?: any
  [key: string]: any
}

interface SecurityViolation {
  type: 'sensitive_data' | 'stack_trace' | 'pii_exposure' | 'secret_leak'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  logEntry: LogEntry
  detectedPattern: string
}

interface MonitoringConfig {
  enableRealTimeAnalysis: boolean
  enableAlerts: boolean
  sensitivePatterns: RegExp[]
  alertWebhookUrl?: string
  logRetentionDays: number
}

class LogMonitor {
  private config: MonitoringConfig
  private violations: SecurityViolation[] = []

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      enableRealTimeAnalysis: process.env.NODE_ENV === 'production',
      enableAlerts: process.env.NODE_ENV === 'production',
      logRetentionDays: 30,
      sensitivePatterns: [
        // JWT tokens
        /\b[A-Za-z0-9-_]{20,}\.[A-Za-z0-9-_]{20,}\.[A-Za-z0-9-_]{20,}\b/g,
        // API keys
        /\b[sS][kK]_[a-zA-Z0-9]{20,}\b/g,
        // Long hex strings (potential keys/hashes)
        /\b[a-f0-9]{32,}\b/g,
        // Email addresses (PII)
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
        // Phone numbers
        /\b\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
        // Credit card patterns
        /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
        // Stack trace patterns
        /at\s+[^(]+\([^)]*:\d+:\d+\)/g,
        // File paths that might expose sensitive info
        /(?:[C-Z]:)?[\\\/](?:Users|home)[\\\/][^\\\/\s]+/g,
        // Database connection strings
        /(?:postgres|mysql|mongodb):\/\/[^@\s]+:[^@\s]+@/g
      ],
      ...config
    }
  }

  /**
   * Analyze a log entry for security violations
   */
  analyzeLogEntry(logEntry: LogEntry): SecurityViolation[] {
    if (!this.config.enableRealTimeAnalysis) {
      return []
    }

    const violations: SecurityViolation[] = []
    const logText = JSON.stringify(logEntry)

    // Check for sensitive patterns
    for (const pattern of this.config.sensitivePatterns) {
      const matches = logText.match(pattern)
      if (matches && matches.length > 0) {
        for (const match of matches) {
          violations.push({
            type: this.classifyViolationType(match, pattern),
            severity: this.assessSeverity(match, pattern),
            message: `Potential sensitive data detected in logs: ${match.substring(0, 20)}...`,
            logEntry,
            detectedPattern: match
          })
        }
      }
    }

    // Check for stack traces in production
    if (process.env.NODE_ENV === 'production' && logEntry.error &&
        typeof logEntry.error === 'object' && logEntry.error.stack) {
      violations.push({
        type: 'stack_trace',
        severity: 'medium',
        message: 'Stack trace detected in production logs',
        logEntry,
        detectedPattern: 'stack trace'
      })
    }

    // Store violations for analysis
    this.violations.push(...violations)

    // Trigger alerts if needed
    if (violations.length > 0 && this.config.enableAlerts) {
      this.triggerSecurityAlert(violations)
    }

    return violations
  }

  /**
   * Classify the type of violation based on the detected pattern
   */
  private classifyViolationType(match: string, pattern: RegExp): SecurityViolation['type'] {
    if (match.includes('@') && pattern.toString().includes('email')) {
      return 'pii_exposure'
    }
    if (match.match(/^[sS][kK]_/) || match.match(/[A-Za-z0-9-_]{20,}\.[A-Za-z0-9-_]{20,}/)) {
      return 'secret_leak'
    }
    if (match.includes('at ') && match.includes(':')) {
      return 'stack_trace'
    }
    return 'sensitive_data'
  }

  /**
   * Assess severity of the violation
   */
  private assessSeverity(match: string, pattern: RegExp): SecurityViolation['severity'] {
    // API keys and secrets are critical
    if (match.match(/^[sS][kK]_/) || match.length > 40) {
      return 'critical'
    }
    // JWT tokens are high risk
    if (match.includes('.') && match.length > 30) {
      return 'high'
    }
    // Email addresses are medium risk (PII)
    if (match.includes('@')) {
      return 'medium'
    }
    // Other patterns are low risk
    return 'low'
  }

  /**
   * Trigger security alerts for violations
   */
  private async triggerSecurityAlert(violations: SecurityViolation[]): Promise<void> {
    const criticalViolations = violations.filter(v => v.severity === 'critical')
    const highViolations = violations.filter(v => v.severity === 'high')

    if (criticalViolations.length > 0 || highViolations.length > 0) {
      const alertMessage = {
        alert: 'SECURITY_LOG_VIOLATION',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        criticalCount: criticalViolations.length,
        highCount: highViolations.length,
        totalCount: violations.length,
        violations: violations.map(v => ({
          type: v.type,
          severity: v.severity,
          message: v.message,
          component: v.logEntry.component
        }))
      }

      // Send to monitoring webhook if configured
      if (this.config.alertWebhookUrl) {
        try {
          await fetch(this.config.alertWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alertMessage)
          })
        } catch (error) {
          // Fallback: at least log the alert locally
          console.error('[LOG_MONITOR] Failed to send security alert:', error)
        }
      }

      // Log to console as last resort (this should be the only console usage)
      console.error('[SECURITY_ALERT]', JSON.stringify(alertMessage))
    }
  }

  /**
   * Get security violation statistics
   */
  getSecurityStats(): {
    totalViolations: number
    violationsByType: Record<string, number>
    violationsBySeverity: Record<string, number>
    recentViolations: SecurityViolation[]
  } {
    const now = Date.now()
    const recentThreshold = 24 * 60 * 60 * 1000 // 24 hours

    const recentViolations = this.violations.filter(v =>
      now - new Date(v.logEntry.timestamp).getTime() < recentThreshold
    )

    const violationsByType: Record<string, number> = {}
    const violationsBySeverity: Record<string, number> = {}

    for (const violation of recentViolations) {
      violationsByType[violation.type] = (violationsByType[violation.type] || 0) + 1
      violationsBySeverity[violation.severity] = (violationsBySeverity[violation.severity] || 0) + 1
    }

    return {
      totalViolations: recentViolations.length,
      violationsByType,
      violationsBySeverity,
      recentViolations: recentViolations.slice(-10) // Last 10 violations
    }
  }

  /**
   * Generate security report for log monitoring
   */
  generateSecurityReport(): string {
    const stats = this.getSecurityStats()

    return `
# Log Security Monitoring Report

**Generated:** ${new Date().toISOString()}
**Environment:** ${process.env.NODE_ENV}

## Summary
- **Total Violations (24h):** ${stats.totalViolations}
- **Critical/High Risk:** ${(stats.violationsBySeverity.critical || 0) + (stats.violationsBySeverity.high || 0)}

## Violations by Type
${Object.entries(stats.violationsByType).map(([type, count]) =>
  `- **${type}:** ${count}`
).join('\n')}

## Violations by Severity
${Object.entries(stats.violationsBySeverity).map(([severity, count]) =>
  `- **${severity.toUpperCase()}:** ${count}`
).join('\n')}

## Recent Violations
${stats.recentViolations.slice(0, 5).map(v =>
  `- **${v.type}** (${v.severity}): ${v.message}`
).join('\n')}

## Recommendations
${stats.totalViolations > 0 ? `
- Review and fix logging statements that expose sensitive data
- Ensure all console.* calls are replaced with secure logger
- Check for proper data redaction in error handling
- Update ESLint rules to catch remaining violations
` : '- No security violations detected. Good job! ✅'}
`.trim()
  }
}

// Global log monitor instance
export const logMonitor = new LogMonitor({
  alertWebhookUrl: process.env.LOG_SECURITY_WEBHOOK_URL
})

/**
 * Middleware to automatically monitor all log entries
 */
export function withLogMonitoring<T extends (...args: any[]) => any>(
  loggingFunction: T
): T {
  return ((...args: any[]) => {
    const result = loggingFunction(...args)

    // If this is a structured log entry, analyze it
    if (typeof args[0] === 'object' && args[0].level && args[0].message) {
      logMonitor.analyzeLogEntry(args[0] as LogEntry)
    }

    return result
  }) as T
}

/**
 * API endpoint helper for log monitoring dashboard
 */
export function createLogMonitoringAPI() {
  return {
    async getStats() {
      return logMonitor.getSecurityStats()
    },

    async generateReport() {
      return logMonitor.generateSecurityReport()
    },

    async healthCheck() {
      const stats = logMonitor.getSecurityStats()
      const criticalIssues = (stats.violationsBySeverity.critical || 0)

      return {
        status: criticalIssues === 0 ? 'healthy' : 'warning',
        criticalViolations: criticalIssues,
        totalViolations: stats.totalViolations,
        message: criticalIssues === 0
          ? 'No critical log security violations detected'
          : `${criticalIssues} critical log security violations detected`
      }
    }
  }
}