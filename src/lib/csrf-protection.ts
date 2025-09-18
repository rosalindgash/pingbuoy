/**
 * CSRF Protection via Origin/Referer validation
 *
 * Validates that state-changing requests originate from trusted sources
 * to prevent Cross-Site Request Forgery (CSRF) attacks.
 */

export interface CSRFValidationResult {
  isValid: boolean
  reason?: string
  origin?: string
  referer?: string
}

export interface CSRFConfig {
  allowedOrigins: string[]
  requireHTTPS: boolean
  allowLocalhost: boolean
  strictMode: boolean
}

export class CSRFProtection {
  private config: CSRFConfig

  constructor(config?: Partial<CSRFConfig>) {
    this.config = {
      allowedOrigins: this.getDefaultAllowedOrigins(),
      requireHTTPS: process.env.NODE_ENV === 'production',
      allowLocalhost: process.env.NODE_ENV === 'development',
      strictMode: process.env.NODE_ENV === 'production',
      ...config
    }
  }

  /**
   * Get default allowed origins based on environment
   */
  private getDefaultAllowedOrigins(): string[] {
    const envOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || []

    if (envOrigins.length > 0) {
      return envOrigins
    }

    // Fallback defaults
    if (process.env.NODE_ENV === 'production') {
      return [
        'https://pingbuoy.com',
        'https://www.pingbuoy.com',
        'https://app.pingbuoy.com'
      ]
    } else {
      return [
        'http://localhost:3000',
        'http://localhost:4000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:4000',
        'https://localhost:3000',
        'https://localhost:4000'
      ]
    }
  }

  /**
   * Validate Origin and Referer headers for CSRF protection
   */
  public validateRequest(request: Request): CSRFValidationResult {
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')
    const userAgent = request.headers.get('user-agent')

    // Check for missing headers (suspicious for browser requests)
    if (!origin && !referer) {
      return {
        isValid: false,
        reason: 'Missing both Origin and Referer headers',
        origin: origin || undefined,
        referer: referer || undefined
      }
    }

    // Primary validation: Origin header
    if (origin) {
      const originValidation = this.validateOrigin(origin)
      if (!originValidation.isValid) {
        return {
          isValid: false,
          reason: `Origin validation failed: ${originValidation.reason}`,
          origin,
          referer: referer || undefined
        }
      }
    }

    // Secondary validation: Referer header (if Origin missing or in strict mode)
    if (!origin || this.config.strictMode) {
      if (!referer) {
        return {
          isValid: false,
          reason: this.config.strictMode ? 'Strict mode: Referer header required' : 'Origin missing, Referer required',
          origin: origin || undefined,
          referer: undefined
        }
      }

      const refererValidation = this.validateReferer(referer)
      if (!refererValidation.isValid) {
        return {
          isValid: false,
          reason: `Referer validation failed: ${refererValidation.reason}`,
          origin: origin || undefined,
          referer
        }
      }
    }

    // Additional validation for suspicious patterns
    if (this.isSuspiciousRequest(origin, referer, userAgent)) {
      return {
        isValid: false,
        reason: 'Request matches suspicious patterns',
        origin: origin || undefined,
        referer: referer || undefined
      }
    }

    return {
      isValid: true,
      origin: origin || undefined,
      referer: referer || undefined
    }
  }

  /**
   * Validate Origin header
   */
  private validateOrigin(origin: string): { isValid: boolean; reason?: string } {
    try {
      const originUrl = new URL(origin)

      // Protocol validation
      if (this.config.requireHTTPS && originUrl.protocol !== 'https:') {
        if (!this.config.allowLocalhost || !this.isLocalhost(originUrl.hostname)) {
          return { isValid: false, reason: 'HTTPS required' }
        }
      }

      // Check against allowed origins
      if (this.config.allowedOrigins.includes('*')) {
        return { isValid: true }
      }

      // Exact match check
      if (this.config.allowedOrigins.includes(origin)) {
        return { isValid: true }
      }

      // Localhost check for development
      if (this.config.allowLocalhost && this.isLocalhost(originUrl.hostname)) {
        return { isValid: true }
      }

      return { isValid: false, reason: 'Origin not in allowlist' }

    } catch (error) {
      return { isValid: false, reason: 'Invalid Origin URL format' }
    }
  }

  /**
   * Validate Referer header
   */
  private validateReferer(referer: string): { isValid: boolean; reason?: string } {
    try {
      const refererUrl = new URL(referer)
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`

      // Use same validation as Origin
      return this.validateOrigin(refererOrigin)

    } catch (error) {
      return { isValid: false, reason: 'Invalid Referer URL format' }
    }
  }

  /**
   * Check if hostname is localhost/loopback
   */
  private isLocalhost(hostname: string): boolean {
    return [
      'localhost',
      '127.0.0.1',
      '::1',
      '0.0.0.0'
    ].includes(hostname.toLowerCase())
  }

  /**
   * Detect suspicious request patterns
   */
  private isSuspiciousRequest(origin?: string | null, referer?: string | null, userAgent?: string | null): boolean {
    // Check for common CSRF attack patterns
    const suspiciousPatterns = [
      // Missing user agent (automated requests)
      () => !userAgent || userAgent.length < 10,

      // Mismatched Origin/Referer domains
      () => {
        if (!origin || !referer) return false
        try {
          const originHost = new URL(origin).host
          const refererHost = new URL(referer).host
          return originHost !== refererHost
        } catch {
          return true // Invalid URLs are suspicious
        }
      },

      // Known bot/scanner user agents
      () => {
        if (!userAgent) return false
        const botPatterns = [
          /curl/i,
          /wget/i,
          /python/i,
          /postman/i,
          /insomnia/i,
          /bot/i,
          /crawler/i,
          /scanner/i
        ]
        return botPatterns.some(pattern => pattern.test(userAgent))
      },

      // Suspicious referer patterns
      () => {
        if (!referer) return false
        return /^https?:\/\/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/.test(referer) // IP addresses
      }
    ]

    return suspiciousPatterns.some(check => check())
  }

  /**
   * Get allowed origins for debugging/logging
   */
  public getAllowedOrigins(): string[] {
    return [...this.config.allowedOrigins]
  }

  /**
   * Check if request method requires CSRF protection
   */
  public static requiresCSRFProtection(method: string): boolean {
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())
  }
}

// Default instance for the application
export const csrfProtection = new CSRFProtection()

/**
 * Middleware function for protecting API routes
 */
export function withCSRFProtection<T extends unknown[]>(
  handler: (request: Request, ...args: T) => Promise<Response>
) {
  return async (request: Request, ...args: T): Promise<Response> => {
    // Skip CSRF protection for safe methods
    if (!CSRFProtection.requiresCSRFProtection(request.method)) {
      return handler(request, ...args)
    }

    // Skip CSRF protection for webhooks (they have their own validation)
    const url = new URL(request.url)
    if (url.pathname.includes('/webhooks/')) {
      return handler(request, ...args)
    }

    // Validate request
    const validation = csrfProtection.validateRequest(request)

    if (!validation.isValid) {
      console.warn('CSRF protection blocked request', {
        method: request.method,
        url: url.pathname,
        reason: validation.reason,
        origin: validation.origin,
        referer: validation.referer,
        userAgent: request.headers.get('user-agent')?.substring(0, 100)
      })

      return new Response(
        JSON.stringify({
          error: 'Request blocked by security policy',
          code: 'CSRF_PROTECTION'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Request is valid, proceed
    return handler(request, ...args)
  }
}

/**
 * Utility for manual validation in route handlers
 */
export function validateCSRF(request: Request): CSRFValidationResult {
  if (!CSRFProtection.requiresCSRFProtection(request.method)) {
    return { isValid: true }
  }

  return csrfProtection.validateRequest(request)
}

/**
 * Configuration helper for testing/development
 */
export function createCSRFProtection(config: Partial<CSRFConfig>): CSRFProtection {
  return new CSRFProtection(config)
}