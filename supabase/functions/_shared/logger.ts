/**
 * Structured Logging Utility for Supabase Functions
 *
 * Provides PII-safe, structured logging with minimal information
 * Uses IDs and result codes instead of sensitive data
 */

export interface LogContext {
  functionName?: string
  requestId?: string
  userId?: string
  siteId?: string
  scanId?: string
  alertId?: string
}

export interface LogData {
  [key: string]: string | number | boolean | null | undefined
}

export class StructuredLogger {
  private context: LogContext

  constructor(context: LogContext = {}) {
    this.context = context
  }

  private formatLog(level: string, message: string, data?: LogData): string {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      function: this.context.functionName,
      message,
      ...this.context,
      ...data
    }

    // Remove undefined values
    Object.keys(logEntry).forEach(key => {
      if (logEntry[key] === undefined) {
        delete logEntry[key]
      }
    })

    return JSON.stringify(logEntry)
  }

  info(message: string, data?: LogData) {
    console.log(this.formatLog('INFO', message, data))
  }

  warn(message: string, data?: LogData) {
    console.warn(this.formatLog('WARN', message, data))
  }

  error(message: string, data?: LogData) {
    console.error(this.formatLog('ERROR', message, data))
  }

  success(message: string, data?: LogData) {
    console.log(this.formatLog('SUCCESS', message, data))
  }

  // Specific logging methods for common use cases
  requestStart(method: string, endpoint?: string) {
    this.info('Request started', {
      method,
      endpoint: endpoint ? endpoint.replace(/\/[0-9a-f-]{36}/gi, '/:id') : undefined
    })
  }

  requestEnd(statusCode: number, duration?: number) {
    this.info('Request completed', {
      statusCode,
      durationMs: duration
    })
  }

  monitoringResult(siteId: string, status: 'up' | 'down', statusCode: number, responseTime: number) {
    this.info('Monitoring check completed', {
      siteId,
      status,
      statusCode,
      responseTimeMs: responseTime
    })
  }

  scanResult(scanId: string, totalLinks: number, brokenLinks: number, status: 'completed' | 'failed') {
    this.info('Scan completed', {
      scanId,
      totalLinks,
      brokenLinks,
      status
    })
  }

  emailResult(templateName: string, success: boolean, errorCode?: string) {
    this.info('Email sent', {
      templateName,
      success,
      errorCode
    })
  }

  alertCreated(siteId: string, alertType: string, alertId: string) {
    this.info('Alert created', {
      siteId,
      alertType,
      alertId
    })
  }

  securityEvent(eventType: string, blocked: boolean, reason?: string) {
    this.warn('Security event', {
      eventType,
      blocked,
      reason
    })
  }

  // Rate limiting logs
  rateLimitHit(identifier: string, limitType: 'hourly' | 'daily', currentCount: number, limit: number) {
    this.warn('Rate limit exceeded', {
      identifier: this.hashIdentifier(identifier),
      limitType,
      currentCount,
      limit
    })
  }

  // Hash sensitive identifiers to avoid logging PII
  private hashIdentifier(identifier: string): string {
    // Simple hash for logging - not cryptographically secure but sufficient for logs
    let hash = 0
    for (let i = 0; i < identifier.length; i++) {
      const char = identifier.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return `hash_${Math.abs(hash).toString(16)}`
  }

  // Database operation logs
  dbOperation(operation: string, table: string, success: boolean, recordCount?: number) {
    this.info('Database operation', {
      operation,
      table,
      success,
      recordCount
    })
  }

  // External API calls
  externalApiCall(service: string, endpoint: string, statusCode: number, duration?: number) {
    this.info('External API call', {
      service,
      endpoint: endpoint.replace(/\/[0-9a-f-]{36}/gi, '/:id'),
      statusCode,
      durationMs: duration
    })
  }
}

// Convenience function to create logger with function context
export function createLogger(functionName: string, additionalContext?: Omit<LogContext, 'functionName'>): StructuredLogger {
  return new StructuredLogger({
    functionName,
    ...additionalContext
  })
}

// Export default logger for backward compatibility
export const logger = new StructuredLogger()

// Common error codes for consistent logging
export const ErrorCodes = {
  // Validation errors
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_PARAMS: 'MISSING_PARAMS',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_URL: 'INVALID_URL',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // External services
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',

  // Database errors
  DB_CONNECTION_ERROR: 'DB_CONNECTION_ERROR',
  DB_QUERY_ERROR: 'DB_QUERY_ERROR',

  // Security
  SSRF_BLOCKED: 'SSRF_BLOCKED',
  CORS_VIOLATION: 'CORS_VIOLATION',
  AUTH_FAILED: 'AUTH_FAILED',

  // Business logic
  SITE_NOT_FOUND: 'SITE_NOT_FOUND',
  SCAN_FAILED: 'SCAN_FAILED',
  EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED'
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]