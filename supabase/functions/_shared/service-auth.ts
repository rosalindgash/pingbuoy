/**
 * Service authentication utilities for Supabase Edge Functions
 * Refactored to use SUPABASE_SERVICE_ROLE_KEY for simplified authentication
 * Service role bypasses RLS policies, allowing Edge Functions to perform system operations
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type ServiceType =
  | 'uptime_monitor'
  | 'dead_link_scanner'
  | 'email_sender'
  | 'notification_system'
  | 'analytics_collector'
  | 'maintenance_worker'

class EdgeServiceAuth {
  private supabaseUrl: string
  private supabaseServiceKey: string

  constructor() {
    this.supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    this.supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!this.supabaseUrl || !this.supabaseServiceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
    }
  }

  /**
   * Create a Supabase client with service role authentication
   * Service role bypasses RLS policies and has full database access
   */
  createServiceClient(serviceType?: ServiceType): SupabaseClient {
    return createClient(this.supabaseUrl, this.supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  }

  /**
   * Send authenticated request to internal API with service role token
   */
  async callInternalAPI(
    serviceType: ServiceType,
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const headers = new Headers(options.headers)
    headers.set('Authorization', `Bearer ${this.supabaseServiceKey}`)
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
  const client = edgeServiceAuth.createServiceClient(serviceType)
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