/**
 * Secure CORS Configuration for Supabase Functions
 *
 * Provides centralized CORS configuration with exact domain matching
 * instead of wildcards for better security
 */

interface CORSConfig {
  allowedOrigins: string[]
  allowedHeaders: string[]
  allowedMethods: string[]
  maxAge?: number
  credentials?: boolean
}

interface CORSHeaders {
  'Access-Control-Allow-Origin'?: string
  'Access-Control-Allow-Headers': string
  'Access-Control-Allow-Methods': string
  'Access-Control-Max-Age'?: string
  'Access-Control-Allow-Credentials'?: string
  'Vary': string
}

export class SecureCORS {
  private config: CORSConfig

  constructor(config?: Partial<CORSConfig>) {
    // Default secure configuration
    this.config = {
      allowedOrigins: this.parseAllowedOrigins(),
      allowedHeaders: [
        'authorization',
        'x-client-info',
        'apikey',
        'content-type',
        'x-requested-with'
      ],
      allowedMethods: ['POST', 'OPTIONS'],
      maxAge: 86400, // 24 hours
      credentials: false,
      ...config
    }
  }

  /**
   * Parse allowed origins from environment variable
   */
  private parseAllowedOrigins(): string[] {
    const allowedOriginsEnv = Deno.env.get('ALLOWED_ORIGINS')

    if (!allowedOriginsEnv) {
      console.warn('⚠️  ALLOWED_ORIGINS not set, using secure defaults')
      return this.getDefaultAllowedOrigins()
    }

    // Handle wildcard case (insecure)
    if (allowedOriginsEnv.includes('*')) {
      console.error('❌ Wildcard (*) detected in ALLOWED_ORIGINS - this is insecure!')

      if (Deno.env.get('DENO_DEPLOYMENT_ID')) {
        // In production, reject wildcards
        throw new Error('Wildcard origins not allowed in production')
      } else {
        console.warn('⚠️  Allowing wildcard in development only')
        return ['*']
      }
    }

    // Parse comma-separated origins
    const origins = allowedOriginsEnv
      .split(',')
      .map(origin => origin.trim())
      .filter(origin => origin.length > 0)

    // Validate each origin
    const validOrigins = origins.filter(origin => this.validateOrigin(origin))

    if (validOrigins.length === 0) {
      console.error('❌ No valid origins found in ALLOWED_ORIGINS')
      return this.getDefaultAllowedOrigins()
    }

    console.log(`✅ CORS configured for ${validOrigins.length} origins:`, validOrigins)
    return validOrigins
  }

  /**
   * Get default allowed origins based on environment
   */
  private getDefaultAllowedOrigins(): string[] {
    // Production defaults
    if (Deno.env.get('DENO_DEPLOYMENT_ID')) {
      return [
        'https://pingbuoy.com',
        'https://www.pingbuoy.com',
        'https://app.pingbuoy.com'
      ]
    }

    // Development defaults
    return [
      'http://localhost:3000',
      'http://localhost:4000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:4000',
      'https://localhost:3000',
      'https://localhost:4000'
    ]
  }

  /**
   * Validate origin format
   */
  private validateOrigin(origin: string): boolean {
    // Allow wildcard only in development
    if (origin === '*') {
      return !Deno.env.get('DENO_DEPLOYMENT_ID')
    }

    try {
      const url = new URL(origin)

      // Must be HTTP or HTTPS
      if (!['http:', 'https:'].includes(url.protocol)) {
        console.warn(`⚠️  Invalid origin protocol: ${origin}`)
        return false
      }

      // Must have a hostname
      if (!url.hostname) {
        console.warn(`⚠️  Origin missing hostname: ${origin}`)
        return false
      }

      // Production should use HTTPS
      if (Deno.env.get('DENO_DEPLOYMENT_ID') && url.protocol === 'http:') {
        // Allow localhost in production for testing
        if (!url.hostname.includes('localhost') && !url.hostname.includes('127.0.0.1')) {
          console.warn(`⚠️  HTTP origin not allowed in production: ${origin}`)
          return false
        }
      }

      return true
    } catch (error) {
      console.warn(`⚠️  Invalid origin URL: ${origin}`, error.message)
      return false
    }
  }

  /**
   * Get CORS headers for a specific request
   */
  public getCORSHeaders(requestOrigin?: string): CORSHeaders {
    const headers: CORSHeaders = {
      'Access-Control-Allow-Headers': this.config.allowedHeaders.join(', '),
      'Access-Control-Allow-Methods': this.config.allowedMethods.join(', '),
      'Vary': 'Origin'
    }

    // Add max age for preflight requests
    if (this.config.maxAge) {
      headers['Access-Control-Max-Age'] = this.config.maxAge.toString()
    }

    // Add credentials if enabled
    if (this.config.credentials) {
      headers['Access-Control-Allow-Credentials'] = 'true'
    }

    // Determine allowed origin
    const allowedOrigin = this.getAllowedOrigin(requestOrigin)
    if (allowedOrigin) {
      headers['Access-Control-Allow-Origin'] = allowedOrigin
    }

    return headers
  }

  /**
   * Get allowed origin for a request
   */
  private getAllowedOrigin(requestOrigin?: string): string | undefined {
    // No origin header = same-origin request, allow it
    if (!requestOrigin) {
      return undefined
    }

    // Check if wildcard is allowed (development only)
    if (this.config.allowedOrigins.includes('*')) {
      return '*'
    }

    // Check exact match
    if (this.config.allowedOrigins.includes(requestOrigin)) {
      return requestOrigin
    }

    // No match found
    console.warn(`⚠️  CORS: Origin not allowed: ${requestOrigin}`)
    return undefined
  }

  /**
   * Check if request origin is allowed
   */
  public isOriginAllowed(requestOrigin?: string): boolean {
    return this.getAllowedOrigin(requestOrigin) !== undefined
  }

  /**
   * Handle preflight OPTIONS request
   */
  public handlePreflight(request: Request): Response {
    const origin = request.headers.get('Origin')
    const corsHeaders = this.getCORSHeaders(origin)

    if (!this.isOriginAllowed(origin)) {
      console.warn(`⚠️  CORS: Preflight blocked for origin: ${origin}`)
      return new Response('CORS policy violation', {
        status: 403,
        headers: {
          'Content-Type': 'text/plain'
        }
      })
    }

    return new Response(null, {
      status: 204, // No Content
      headers: corsHeaders as Record<string, string>
    })
  }

  /**
   * Wrap response with CORS headers
   */
  public wrapResponse(response: Response, requestOrigin?: string): Response {
    const corsHeaders = this.getCORSHeaders(requestOrigin)

    // Create new response with CORS headers
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        ...corsHeaders as Record<string, string>
      }
    })

    return newResponse
  }

  /**
   * Get configuration summary for logging
   */
  public getConfigSummary(): {
    allowedOrigins: string[]
    isSecure: boolean
    environment: string
    warnings: string[]
  } {
    const warnings: string[] = []

    // Check for security issues
    const hasWildcard = this.config.allowedOrigins.includes('*')
    const hasHttp = this.config.allowedOrigins.some(origin =>
      origin.startsWith('http://') &&
      !origin.includes('localhost') &&
      !origin.includes('127.0.0.1')
    )

    if (hasWildcard) {
      warnings.push('Wildcard (*) origin allowed - security risk in production')
    }

    if (hasHttp && Deno.env.get('DENO_DEPLOYMENT_ID')) {
      warnings.push('HTTP origins allowed in production - security risk')
    }

    return {
      allowedOrigins: this.config.allowedOrigins,
      isSecure: !hasWildcard && !hasHttp,
      environment: Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development',
      warnings
    }
  }
}

// Export configured instances
export const createSecureCORS = (config?: Partial<CORSConfig>) => new SecureCORS(config)

// Default instance for Supabase functions
export const defaultCORS = new SecureCORS()

// Convenience functions
export const getCORSHeaders = (requestOrigin?: string) => defaultCORS.getCORSHeaders(requestOrigin)
export const handlePreflight = (request: Request) => defaultCORS.handlePreflight(request)
export const wrapResponse = (response: Response, requestOrigin?: string) =>
  defaultCORS.wrapResponse(response, requestOrigin)
export const isOriginAllowed = (requestOrigin?: string) => defaultCORS.isOriginAllowed(requestOrigin)

/**
 * Middleware for Supabase functions
 */
export const withSecureCORS = (handler: (req: Request) => Promise<Response>) => {
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get('Origin')

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return handlePreflight(req)
    }

    // Check origin for non-preflight requests
    if (origin && !isOriginAllowed(origin)) {
      console.warn(`⚠️  CORS: Request blocked for origin: ${origin}`)
      return new Response('CORS policy violation', {
        status: 403,
        headers: {
          'Content-Type': 'text/plain',
          ...getCORSHeaders()
        }
      })
    }

    try {
      // Process the request
      const response = await handler(req)

      // Wrap response with CORS headers
      return wrapResponse(response, origin)

    } catch (error) {
      console.error('Function error:', error)

      const errorResponse = new Response(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      return wrapResponse(errorResponse, origin)
    }
  }
}