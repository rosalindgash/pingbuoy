/**
 * Secure service authentication using JWT claims instead of service_role
 * This replaces the overpowered service_role key with scoped JWT tokens
 */

import { createClient } from '@supabase/supabase-js'
import { SignJWT, jwtVerify } from 'jose'

// Declare Deno global for Edge Functions
declare global {
  var Deno: {
    env: {
      get(key: string): string | undefined
    }
  } | undefined
}

// Service types with specific permissions
export type ServiceType =
  | 'uptime_monitor'
  | 'dead_link_scanner'
  | 'email_sender'
  | 'notification_system'
  | 'analytics_collector'
  | 'maintenance_worker'

// Service permissions mapping
const SERVICE_PERMISSIONS = {
  uptime_monitor: {
    tables: ['uptime_logs', 'sites', 'alerts'],
    operations: ['SELECT', 'INSERT', 'UPDATE'],
    scope: 'monitoring'
  },
  dead_link_scanner: {
    tables: ['dead_links', 'scans', 'sites'],
    operations: ['SELECT', 'INSERT', 'UPDATE'],
    scope: 'scanning'
  },
  email_sender: {
    tables: ['email_logs', 'notification_history'],
    operations: ['INSERT', 'SELECT'],
    scope: 'communication'
  },
  notification_system: {
    tables: ['notification_settings', 'notification_history', 'sites', 'users'],
    operations: ['SELECT', 'INSERT'],
    scope: 'notifications'
  },
  analytics_collector: {
    tables: ['uptime_logs', 'sites', 'users'],
    operations: ['SELECT'],
    scope: 'analytics'
  },
  maintenance_worker: {
    tables: ['email_logs', 'notification_history', 'uptime_logs', 'dead_links'],
    operations: ['DELETE', 'SELECT'],
    scope: 'maintenance'
  }
} as const

interface ServiceJWTPayload {
  iss: 'pingbuoy-service'
  sub: string // service identifier
  service_type: ServiceType
  permissions: typeof SERVICE_PERMISSIONS[ServiceType]
  iat: number
  exp: number
  scope: string
  [key: string]: any
}

class ServiceAuthenticator {
  private secret: Uint8Array
  private supabaseUrl: string
  private supabaseAnonKey: string

  constructor() {
    const secretKey = process.env.NEXT_PUBLIC_SERVICE_JWT_SECRET
    if (!secretKey) {
      throw new Error('NEXT_PUBLIC_SERVICE_JWT_SECRET environment variable is required')
    }

    this.secret = new TextEncoder().encode(secretKey)
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    this.supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  }

  /**
   * Generate a scoped JWT token for a specific service
   */
  async generateServiceToken(
    serviceType: ServiceType,
    expirationMinutes: number = 60,
    serviceId?: string
  ): Promise<string> {
    const permissions = SERVICE_PERMISSIONS[serviceType]
    const now = Math.floor(Date.now() / 1000)

    const payload: ServiceJWTPayload = {
      iss: 'pingbuoy-service',
      sub: serviceId || `${serviceType}-${now}`,
      service_type: serviceType,
      permissions,
      iat: now,
      exp: now + (expirationMinutes * 60),
      scope: permissions.scope
    }

    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${expirationMinutes}m`)
      .sign(this.secret)

    return token
  }

  /**
   * Verify and decode a service JWT token
   */
  async verifyServiceToken(token: string): Promise<ServiceJWTPayload> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        issuer: 'pingbuoy-service'
      })

      return payload as ServiceJWTPayload
    } catch (error) {
      throw new Error(`Invalid service token: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Create a Supabase client with service JWT authentication
   */
  async createServiceClient(serviceType: ServiceType, serviceId?: string) {
    const token = await this.generateServiceToken(serviceType, 60, serviceId)

    return createClient(this.supabaseUrl, this.supabaseAnonKey, {
      global: {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Service-Type': serviceType,
          'X-Service-Auth': 'jwt'
        }
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  }

  /**
   * Middleware for API routes to validate service authentication
   */
  async validateServiceRequest(
    request: Request,
    requiredServiceType: ServiceType
  ): Promise<{ valid: boolean; payload?: ServiceJWTPayload; error?: string }> {
    try {
      const authHeader = request.headers.get('Authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return { valid: false, error: 'Missing or invalid authorization header' }
      }

      const token = authHeader.slice(7)
      const payload = await this.verifyServiceToken(token)

      // Verify service type matches
      if (payload.service_type !== requiredServiceType) {
        return {
          valid: false,
          error: `Invalid service type. Expected ${requiredServiceType}, got ${payload.service_type}`
        }
      }

      return { valid: true, payload }
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Check if a service has permission for a specific operation
   */
  hasPermission(
    payload: ServiceJWTPayload,
    table: string,
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
  ): boolean {
    const permissions = payload.permissions
    return (permissions.tables as readonly string[]).includes(table) &&
           (permissions.operations as readonly string[]).includes(operation)
  }
}

// Export singleton instance
export const serviceAuth = new ServiceAuthenticator()

// Helper function for API routes
export async function withServiceAuth<T>(
  request: Request,
  serviceType: ServiceType,
  handler: (payload: ServiceJWTPayload) => Promise<T>
): Promise<Response> {
  const validation = await serviceAuth.validateServiceRequest(request, serviceType)

  if (!validation.valid) {
    return Response.json(
      { error: 'Unauthorized', details: validation.error },
      { status: 401 }
    )
  }

  try {
    const result = await handler(validation.payload!)
    return Response.json(result)
  } catch (error) {
    console.error('Service handler error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper for Edge Functions (Deno)
export function createDenoServiceAuth() {
  return {
    async generateServiceToken(
      serviceType: ServiceType,
      expirationMinutes: number = 60
    ): Promise<string> {
      if (typeof Deno === 'undefined') {
        throw new Error('This function is only available in Deno environments')
      }
      const secretKey = Deno.env.get('SERVICE_JWT_SECRET')
      if (!secretKey) {
        throw new Error('SERVICE_JWT_SECRET environment variable is required')
      }

      const secret = new TextEncoder().encode(secretKey)
      const permissions = SERVICE_PERMISSIONS[serviceType]
      const now = Math.floor(Date.now() / 1000)

      const payload = {
        iss: 'pingbuoy-service',
        sub: `${serviceType}-${now}`,
        service_type: serviceType,
        permissions,
        iat: now,
        exp: now + (expirationMinutes * 60),
        scope: permissions.scope
      }

      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${expirationMinutes}m`)
        .sign(secret)

      return token
    }
  }
}

export type { ServiceJWTPayload }