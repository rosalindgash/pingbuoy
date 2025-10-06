/**
 * Secure logging utility that prevents sensitive data exposure in production
 *
 * This logger:
 * - Redacts sensitive fields from error objects
 * - Prevents stack trace exposure in production
 * - Uses structured logging for better monitoring
 * - Ensures no PII or secrets are logged
 */

interface LogContext {
  [key: string]: any
}

interface SecureLoggerConfig {
  environment: 'development' | 'production' | 'test'
  maxErrorLength: number
  sensitiveFields: string[]
}

class SecureLogger {
  private config: SecureLoggerConfig

  constructor(config?: Partial<SecureLoggerConfig>) {
    this.config = {
      environment: (process.env.NODE_ENV as any) || 'development',
      maxErrorLength: 500,
      sensitiveFields: [
        'password', 'secret', 'token', 'key', 'authorization', 'auth',
        'cookie', 'session', 'jwt', 'api_key', 'stripe_secret_key',
        'supabase_service_role_key', 'webhook_secret', 'private_key',
        'client_secret', 'refresh_token', 'access_token'
      ],
      ...config
    }
  }

  /**
   * Sanitize error object for safe logging
   */
  private sanitizeError(error: any): any {
    if (!error) return null

    // If it's a string, check for sensitive patterns
    if (typeof error === 'string') {
      return this.redactSensitiveData(error)
    }

    // Handle Error objects
    if (error instanceof Error) {
      const sanitized: any = {
        name: error.name,
        message: this.redactSensitiveData(error.message)
      }

      // Only include stack trace in development
      if (this.config.environment === 'development') {
        sanitized.stack = error.stack?.split('\n').slice(0, 10).join('\n') // Limit stack trace
      }

      // Include error code if present (for structured errors)
      if ('code' in error) {
        sanitized.code = error.code
      }

      return sanitized
    }

    // Handle plain objects
    if (typeof error === 'object') {
      return this.sanitizeObject(error)
    }

    return String(error).substring(0, this.config.maxErrorLength)
  }

  /**
   * Sanitize object by removing sensitive fields
   */
  private sanitizeObject(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj

    const sanitized: any = {}

    for (const [key, value] of Object.entries(obj)) {
      const keyLower = key.toLowerCase()

      // Skip sensitive fields
      if (this.config.sensitiveFields.some(field => keyLower.includes(field))) {
        sanitized[key] = '[REDACTED]'
        continue
      }

      // Recursively sanitize nested objects
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          sanitized[key] = value.map(item =>
            typeof item === 'object' ? this.sanitizeObject(item) : item
          )
        } else {
          sanitized[key] = this.sanitizeObject(value)
        }
      } else if (typeof value === 'string') {
        sanitized[key] = this.redactSensitiveData(value)
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  /**
   * Redact sensitive patterns from strings
   */
  private redactSensitiveData(text: string): string {
    if (typeof text !== 'string') return text

    return text
      // Redact JWT tokens
      .replace(/\b[A-Za-z0-9-_]{20,}\.[A-Za-z0-9-_]{20,}\.[A-Za-z0-9-_]{20,}\b/g, '[JWT_REDACTED]')
      // Redact API keys (common patterns)
      .replace(/\b[sS][kK]_[a-zA-Z0-9]{20,}\b/g, '[API_KEY_REDACTED]')
      .replace(/\b[a-zA-Z0-9]{32,}\b/g, '[KEY_REDACTED]')
      // Redact email addresses in error messages (keep domain for debugging)
      .replace(/\b[\w\.-]+@([\w\.-]+\.\w+)\b/g, '[EMAIL_REDACTED]@$1')
      // Redact potential passwords in URLs
      .replace(/:\/\/[^:\/\s]+:[^@\/\s]+@/g, '://[AUTH_REDACTED]@')
  }

  /**
   * Format log message with context
   */
  public formatMessage(level: string, message: string, context?: LogContext): any {
    const timestamp = new Date().toISOString()

    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message: this.redactSensitiveData(message),
      environment: this.config.environment,
    }

    if (context) {
      const sanitizedContext = this.sanitizeObject(context)
      Object.assign(logEntry, sanitizedContext)
    }

    return logEntry
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    const logEntry = this.formatMessage('info', message, context)
    console.info(JSON.stringify(logEntry))
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    const logEntry = this.formatMessage('warn', message, context)
    console.warn(JSON.stringify(logEntry))
  }

  /**
   * Log error with safe error handling
   */
  error(message: string, error?: any, context?: LogContext): void {
    const logEntry = this.formatMessage('error', message, {
      ...context,
      error: this.sanitizeError(error)
    })

    console.error(JSON.stringify(logEntry))
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (this.config.environment === 'development') {
      const logEntry = this.formatMessage('debug', message, context)
      console.debug(JSON.stringify(logEntry))
    }
  }

  /**
   * Create a scoped logger for specific components
   */
  scope(component: string): SecureLogger {
    const scopedLogger = new SecureLogger(this.config)

    // Override format method to include component
    const originalFormat = scopedLogger.formatMessage.bind(scopedLogger)
    scopedLogger.formatMessage = (level: string, message: string, context?: LogContext) => {
      return originalFormat(level, message, { ...context, component })
    }

    return scopedLogger
  }
}

// Default logger instance
export const logger = new SecureLogger()

// Enable monitoring integration in production
if (process.env.NODE_ENV === 'production') {
  // Import monitoring lazily to avoid circular dependencies
  import('./log-monitoring').then(({ logMonitor }) => {
    // Override the original formatMessage to include monitoring
    const originalFormat = logger.formatMessage.bind(logger)
    logger.formatMessage = function(level: string, message: string, context?: any) {
      const logEntry = originalFormat(level, message, context)

      // Analyze log entry for security violations
      try {
        logMonitor.analyzeLogEntry(logEntry)
      } catch (monitoringError) {
        // Don't let monitoring errors break logging
        console.error('[LOG_MONITOR] Error analyzing log entry:', monitoringError)
      }

      return logEntry
    }
  }).catch(error => {
    console.error('[LOG_MONITOR] Failed to initialize log monitoring:', error)
  })
}

// Scoped loggers for common components
export const authLogger = logger.scope('auth')
export const apiLogger = logger.scope('api')
export const dbLogger = logger.scope('database')
export const integrationLogger = logger.scope('integration')

// Export the class for custom configurations
export { SecureLogger }

/**
 * Safe error logging helper
 * Usage: logError('Operation failed', error, { userId: '123' })
 */
export function logError(message: string, error: any, context?: LogContext): void {
  logger.error(message, error, context)
}

/**
 * Safe warning logging helper
 */
export function logWarning(message: string, context?: LogContext): void {
  logger.warn(message, context)
}

/**
 * Safe info logging helper
 */
export function logInfo(message: string, context?: LogContext): void {
  logger.info(message, context)
}