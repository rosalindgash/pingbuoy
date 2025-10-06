import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// Only create client if we have valid environment variables
export const supabase = (() => {
  if (supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey === 'placeholder-anon-key') {
    console.warn('⚠️ Supabase environment variables not configured. Authentication features will not work.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return null as any
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
})()

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          plan: 'free' | 'pro' | 'founder'
          role: 'user' | 'support' | 'admin' | 'owner'
          created_at: string
          stripe_customer_id: string | null
          deletion_scheduled_at: string | null
          account_status: string | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          plan?: 'free' | 'pro' | 'founder'
          role?: 'user' | 'support' | 'admin' | 'owner'
          created_at?: string
          stripe_customer_id?: string | null
          deletion_scheduled_at?: string | null
          account_status?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          plan?: 'free' | 'pro' | 'founder'
          role?: 'user' | 'support' | 'admin' | 'owner'
          created_at?: string
          stripe_customer_id?: string | null
          deletion_scheduled_at?: string | null
          account_status?: string | null
        }
      }
      sites: {
        Row: {
          id: string
          user_id: string
          url: string
          name: string
          type: 'website' | 'api_endpoint'
          is_active: boolean
          created_at: string
          last_checked: string | null
          status: 'up' | 'down' | 'unknown'
        }
        Insert: {
          id?: string
          user_id: string
          url: string
          name: string
          type?: 'website' | 'api_endpoint'
          is_active?: boolean
          created_at?: string
          last_checked?: string | null
          status?: 'up' | 'down' | 'unknown'
        }
        Update: {
          id?: string
          user_id?: string
          url?: string
          name?: string
          type?: 'website' | 'api_endpoint'
          is_active?: boolean
          created_at?: string
          last_checked?: string | null
          status?: 'up' | 'down' | 'unknown'
        }
      }
      uptime_logs: {
        Row: {
          id: string
          site_id: string
          status: 'up' | 'down'
          response_time: number | null
          status_code: number | null
          checked_at: string
          page_speed_score: number | null
          load_time_ms: number | null
          ssl_expires_at: string | null
          ssl_valid: boolean | null
        }
        Insert: {
          id?: string
          site_id: string
          status: 'up' | 'down'
          response_time?: number | null
          status_code?: number | null
          checked_at?: string
          page_speed_score?: number | null
          load_time_ms?: number | null
          ssl_expires_at?: string | null
          ssl_valid?: boolean | null
        }
        Update: {
          id?: string
          site_id?: string
          status?: 'up' | 'down'
          response_time?: number | null
          status_code?: number | null
          checked_at?: string
          page_speed_score?: number | null
          load_time_ms?: number | null
          ssl_expires_at?: string | null
          ssl_valid?: boolean | null
        }
      }
      alerts: {
        Row: {
          id: string
          site_id: string
          type: 'uptime' | 'dead_links'
          message: string
          sent_at: string
          resolved: boolean
        }
        Insert: {
          id?: string
          site_id: string
          type: 'uptime' | 'dead_links'
          message: string
          sent_at?: string
          resolved?: boolean
        }
        Update: {
          id?: string
          site_id?: string
          type?: 'uptime' | 'dead_links'
          message?: string
          sent_at?: string
          resolved?: boolean
        }
      }
      dead_links: {
        Row: {
          id: string
          site_id: string
          url: string
          source_url: string
          status_code: number
          found_at: string
          fixed: boolean
        }
        Insert: {
          id?: string
          site_id: string
          url: string
          source_url: string
          status_code: number
          found_at?: string
          fixed?: boolean
        }
        Update: {
          id?: string
          site_id?: string
          url?: string
          source_url?: string
          status_code?: number
          found_at?: string
          fixed?: boolean
        }
      }
      scans: {
        Row: {
          id: string
          site_id: string
          started_at: string
          completed_at: string | null
          total_links: number
          broken_links: number
          status: 'running' | 'completed' | 'failed'
        }
        Insert: {
          id?: string
          site_id: string
          started_at?: string
          completed_at?: string | null
          total_links?: number
          broken_links?: number
          status?: 'running' | 'completed' | 'failed'
        }
        Update: {
          id?: string
          site_id?: string
          started_at?: string
          completed_at?: string | null
          total_links?: number
          broken_links?: number
          status?: 'running' | 'completed' | 'failed'
        }
      }
      notification_settings: {
        Row: {
          id: string
          user_id: string
          email_enabled: boolean
          email_downtime_alerts: boolean
          email_recovery_alerts: boolean
          email_maintenance_alerts: boolean
          email_weekly_reports: boolean
          email_monthly_reports: boolean
          sms_enabled: boolean
          sms_phone_number: string | null
          sms_phone_verified: boolean
          sms_downtime_alerts: boolean
          sms_recovery_alerts: boolean
          sms_critical_alerts_only: boolean
          webhook_enabled: boolean
          webhook_url: string | null
          webhook_secret: string | null
          webhook_downtime_alerts: boolean
          webhook_recovery_alerts: boolean
          webhook_maintenance_alerts: boolean
          slack_enabled: boolean
          slack_webhook_url: string | null
          slack_downtime_alerts: boolean
          slack_recovery_alerts: boolean
          slack_maintenance_alerts: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_enabled?: boolean
          email_downtime_alerts?: boolean
          email_recovery_alerts?: boolean
          email_maintenance_alerts?: boolean
          email_weekly_reports?: boolean
          email_monthly_reports?: boolean
          sms_enabled?: boolean
          sms_phone_number?: string | null
          sms_phone_verified?: boolean
          sms_downtime_alerts?: boolean
          sms_recovery_alerts?: boolean
          sms_critical_alerts_only?: boolean
          webhook_enabled?: boolean
          webhook_url?: string | null
          webhook_secret?: string | null
          webhook_downtime_alerts?: boolean
          webhook_recovery_alerts?: boolean
          webhook_maintenance_alerts?: boolean
          slack_enabled?: boolean
          slack_webhook_url?: string | null
          slack_downtime_alerts?: boolean
          slack_recovery_alerts?: boolean
          slack_maintenance_alerts?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_enabled?: boolean
          email_downtime_alerts?: boolean
          email_recovery_alerts?: boolean
          email_maintenance_alerts?: boolean
          email_weekly_reports?: boolean
          email_monthly_reports?: boolean
          sms_enabled?: boolean
          sms_phone_number?: string | null
          sms_phone_verified?: boolean
          sms_downtime_alerts?: boolean
          sms_recovery_alerts?: boolean
          sms_critical_alerts_only?: boolean
          webhook_enabled?: boolean
          webhook_url?: string | null
          webhook_secret?: string | null
          webhook_downtime_alerts?: boolean
          webhook_recovery_alerts?: boolean
          webhook_maintenance_alerts?: boolean
          slack_enabled?: boolean
          slack_webhook_url?: string | null
          slack_downtime_alerts?: boolean
          slack_recovery_alerts?: boolean
          slack_maintenance_alerts?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      status_incidents: {
        Row: {
          id: string
          title: string
          description: string
          status: 'investigating' | 'identified' | 'monitoring' | 'resolved'
          impact: 'none' | 'minor' | 'major' | 'critical'
          affected_services: string[]
          started_at: string
          resolved_at: string | null
          is_public: boolean
          notify_subscribers: boolean
          created_at: string
          updated_at: string
          created_by: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          status: 'investigating' | 'identified' | 'monitoring' | 'resolved'
          impact: 'none' | 'minor' | 'major' | 'critical'
          affected_services?: string[]
          started_at?: string
          resolved_at?: string | null
          is_public?: boolean
          notify_subscribers?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          status?: 'investigating' | 'identified' | 'monitoring' | 'resolved'
          impact?: 'none' | 'minor' | 'major' | 'critical'
          affected_services?: string[]
          started_at?: string
          resolved_at?: string | null
          is_public?: boolean
          notify_subscribers?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string
        }
      }
      status_incident_updates: {
        Row: {
          id: string
          incident_id: string
          status: 'investigating' | 'identified' | 'monitoring' | 'resolved'
          message: string
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          incident_id: string
          status: 'investigating' | 'identified' | 'monitoring' | 'resolved'
          message: string
          created_at?: string
          created_by?: string
        }
        Update: {
          id?: string
          incident_id?: string
          status?: 'investigating' | 'identified' | 'monitoring' | 'resolved'
          message?: string
          created_at?: string
          created_by?: string
        }
      }
    }
  }
}