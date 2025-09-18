/**
 * Service authentication utilities for Supabase Edge Functions
 * This provides JWT-based service authentication for Deno runtime
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SignJWT } from 'https://deno.land/x/jose@v4.14.4/index.ts'

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
  sub: string
  service_type: ServiceType
  permissions: typeof SERVICE_PERMISSIONS[ServiceType]
  iat: number
  exp: number
  scope: string
}

class EdgeServiceAuth {
  private secret: Uint8Array
  private supabaseUrl: string
  private supabaseAnonKey: string

  constructor() {
    const secretKey = Deno.env.get('SERVICE_JWT_SECRET')
    if (!secretKey) {
      throw new Error('SERVICE_JWT_SECRET environment variable is required')
    }

    this.secret = new TextEncoder().encode(secretKey)
    this.supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    this.supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required')
    }
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
   * Create a Supabase client with service JWT authentication
   */
  async createServiceClient(serviceType: ServiceType, serviceId?: string): Promise<SupabaseClient> {
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
   * Send authenticated request to internal API
   */
  async callInternalAPI(
    serviceType: ServiceType,
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = await this.generateServiceToken(serviceType, 10) // Short-lived for API calls

    const headers = new Headers(options.headers)
    headers.set('Authorization', `Bearer ${token}`)
    headers.set('X-Service-Type', serviceType)
    headers.set('Content-Type', 'application/json')

    const baseUrl = Deno.env.get('API_BASE_URL') || 'http://localhost:3000'

    return fetch(`${baseUrl}${path}`, {
      ...options,
      headers
    })
  }
}

// Export singleton instance
export const edgeServiceAuth = new EdgeServiceAuth()

// Helper function for common monitoring operations
export async function withMonitoringAuth<T>(
  serviceType: ServiceType,
  operation: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  const client = await edgeServiceAuth.createServiceClient(serviceType)
  return await operation(client)
}

// Helper function for sending notifications via API
export async function sendNotificationEmail(
  type: string,
  data: Record<string, unknown>
): Promise<Response> {
  return edgeServiceAuth.callInternalAPI('email_sender', '/api/send-email', {
    method: 'POST',
    body: JSON.stringify({ type, ...data })
  })
}

export type { ServiceJWTPayload }