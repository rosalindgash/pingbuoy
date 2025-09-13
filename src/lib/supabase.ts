import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          plan: 'free' | 'pro' | 'founder'
          created_at: string
          stripe_customer_id: string | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          plan?: 'free' | 'pro'
          created_at?: string
          stripe_customer_id?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          plan?: 'free' | 'pro'
          created_at?: string
          stripe_customer_id?: string | null
        }
      }
      sites: {
        Row: {
          id: string
          user_id: string
          url: string
          name: string
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
        }
        Insert: {
          id?: string
          site_id: string
          status: 'up' | 'down'
          response_time?: number | null
          status_code?: number | null
          checked_at?: string
        }
        Update: {
          id?: string
          site_id?: string
          status?: 'up' | 'down'
          response_time?: number | null
          status_code?: number | null
          checked_at?: string
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
    }
  }
}