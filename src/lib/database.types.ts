export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          created_at: string
          id: string
          message: string
          resolved: boolean | null
          resolved_at: string | null
          sent_at: string
          severity: string
          site_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          resolved?: boolean | null
          resolved_at?: string | null
          sent_at?: string
          severity?: string
          site_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          resolved?: boolean | null
          resolved_at?: string | null
          sent_at?: string
          severity?: string
          site_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "monitoring_dashboard"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "alerts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          resource: string | null
          user_agent: string | null
          user_email: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource?: string | null
          user_agent?: string | null
          user_email: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource?: string | null
          user_agent?: string | null
          user_email?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_monitoring_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          allowed_ips: Json | null
          created_at: string
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          last_used_ip: unknown | null
          name: string
          permissions: Json
          rate_limit_per_hour: number | null
          status: string
          total_requests: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_ips?: Json | null
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          last_used_ip?: unknown | null
          name: string
          permissions?: Json
          rate_limit_per_hour?: number | null
          status?: string
          total_requests?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_ips?: Json | null
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          last_used_ip?: unknown | null
          name?: string
          permissions?: Json
          rate_limit_per_hour?: number | null
          status?: string
          total_requests?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chart_annotations: {
        Row: {
          annotation_date: string
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          title: string
          type: string | null
        }
        Insert: {
          annotation_date: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          title: string
          type?: string | null
        }
        Update: {
          annotation_date?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chart_annotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_monitoring_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_annotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      core_web_vitals: {
        Row: {
          checked_at: string
          cls: number | null
          created_at: string
          fcp: number | null
          fid: number | null
          id: string
          lcp: number | null
          site_url: string
          ttfb: number | null
        }
        Insert: {
          checked_at?: string
          cls?: number | null
          created_at?: string
          fcp?: number | null
          fid?: number | null
          id?: string
          lcp?: number | null
          site_url: string
          ttfb?: number | null
        }
        Update: {
          checked_at?: string
          cls?: number | null
          created_at?: string
          fcp?: number | null
          fid?: number | null
          id?: string
          lcp?: number | null
          site_url?: string
          ttfb?: number | null
        }
        Relationships: []
      }
      dead_links: {
        Row: {
          created_at: string
          error_message: string | null
          fixed: boolean | null
          fixed_at: string | null
          found_at: string
          id: string
          site_id: string
          source_url: string
          status_code: number
          url: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          fixed?: boolean | null
          fixed_at?: string | null
          found_at?: string
          id?: string
          site_id: string
          source_url: string
          status_code: number
          url: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          fixed?: boolean | null
          fixed_at?: string | null
          found_at?: string
          id?: string
          site_id?: string
          source_url?: string
          status_code?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "dead_links_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "monitoring_dashboard"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "dead_links_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          ip_address: unknown | null
          recipient_email: string
          sent_at: string
          success: boolean
          template_name: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          recipient_email: string
          sent_at?: string
          success?: boolean
          template_name: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          recipient_email?: string
          sent_at?: string
          success?: boolean
          template_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      events_subscriptions: {
        Row: {
          amount_change_cents: number | null
          amount_recurring_cents: number | null
          created_at: string
          currency: string
          customer_id: string
          event_type: string
          id: string
          occurred_at_utc: string
          plan_id: string | null
          processed: boolean | null
          raw_json: Json
          stripe_event_id: string
          subscription_id: string
        }
        Insert: {
          amount_change_cents?: number | null
          amount_recurring_cents?: number | null
          created_at?: string
          currency?: string
          customer_id: string
          event_type: string
          id?: string
          occurred_at_utc: string
          plan_id?: string | null
          processed?: boolean | null
          raw_json: Json
          stripe_event_id: string
          subscription_id: string
        }
        Update: {
          amount_change_cents?: number | null
          amount_recurring_cents?: number | null
          created_at?: string
          currency?: string
          customer_id?: string
          event_type?: string
          id?: string
          occurred_at_utc?: string
          plan_id?: string | null
          processed?: boolean | null
          raw_json?: Json
          stripe_event_id?: string
          subscription_id?: string
        }
        Relationships: []
      }
      facts_daily: {
        Row: {
          active_subscribers: number | null
          arpu_cents: number | null
          arpu_plan_founder_cents: number | null
          arpu_plan_free_cents: number | null
          arpu_plan_pro_cents: number | null
          arr_cents: number | null
          backfilled: boolean | null
          churned_customers: number | null
          churned_mrr_cents: number | null
          contraction_mrr_cents: number | null
          created_at: string
          data_quality_check_passed: boolean | null
          day: string
          expansion_mrr_cents: number | null
          failed_payments: number | null
          id: string
          last_computed_at: string | null
          mrr_cents_normalized: number | null
          mrr_plan_founder_cents: number | null
          mrr_plan_free_cents: number | null
          mrr_plan_pro_cents: number | null
          new_customers: number | null
          new_mrr_cents: number | null
          past_due_subscribers: number | null
          reactivation_mrr_cents: number | null
          recovered_payments: number | null
          refunded_mrr_cents: number | null
          subs_plan_founder: number | null
          subs_plan_free: number | null
          subs_plan_pro: number | null
          trial_active: number | null
          trial_conversions: number | null
          trial_starts: number | null
          updated_at: string
        }
        Insert: {
          active_subscribers?: number | null
          arpu_cents?: number | null
          arpu_plan_founder_cents?: number | null
          arpu_plan_free_cents?: number | null
          arpu_plan_pro_cents?: number | null
          arr_cents?: number | null
          backfilled?: boolean | null
          churned_customers?: number | null
          churned_mrr_cents?: number | null
          contraction_mrr_cents?: number | null
          created_at?: string
          data_quality_check_passed?: boolean | null
          day: string
          expansion_mrr_cents?: number | null
          failed_payments?: number | null
          id?: string
          last_computed_at?: string | null
          mrr_cents_normalized?: number | null
          mrr_plan_founder_cents?: number | null
          mrr_plan_free_cents?: number | null
          mrr_plan_pro_cents?: number | null
          new_customers?: number | null
          new_mrr_cents?: number | null
          past_due_subscribers?: number | null
          reactivation_mrr_cents?: number | null
          recovered_payments?: number | null
          refunded_mrr_cents?: number | null
          subs_plan_founder?: number | null
          subs_plan_free?: number | null
          subs_plan_pro?: number | null
          trial_active?: number | null
          trial_conversions?: number | null
          trial_starts?: number | null
          updated_at?: string
        }
        Update: {
          active_subscribers?: number | null
          arpu_cents?: number | null
          arpu_plan_founder_cents?: number | null
          arpu_plan_free_cents?: number | null
          arpu_plan_pro_cents?: number | null
          arr_cents?: number | null
          backfilled?: boolean | null
          churned_customers?: number | null
          churned_mrr_cents?: number | null
          contraction_mrr_cents?: number | null
          created_at?: string
          data_quality_check_passed?: boolean | null
          day?: string
          expansion_mrr_cents?: number | null
          failed_payments?: number | null
          id?: string
          last_computed_at?: string | null
          mrr_cents_normalized?: number | null
          mrr_plan_founder_cents?: number | null
          mrr_plan_free_cents?: number | null
          mrr_plan_pro_cents?: number | null
          new_customers?: number | null
          new_mrr_cents?: number | null
          past_due_subscribers?: number | null
          reactivation_mrr_cents?: number | null
          recovered_payments?: number | null
          refunded_mrr_cents?: number | null
          subs_plan_founder?: number | null
          subs_plan_free?: number | null
          subs_plan_pro?: number | null
          trial_active?: number | null
          trial_conversions?: number | null
          trial_starts?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      integration_logs: {
        Row: {
          alert_type: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          event_type: string
          id: string
          integration_id: string
          processed_at: string | null
          request_data: Json | null
          response_data: Json | null
          response_status: number | null
          response_time_ms: number | null
          status: string
          user_id: string
          website_id: string | null
        }
        Insert: {
          alert_type?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          integration_id: string
          processed_at?: string | null
          request_data?: Json | null
          response_data?: Json | null
          response_status?: number | null
          response_time_ms?: number | null
          status: string
          user_id: string
          website_id?: string | null
        }
        Update: {
          alert_type?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          integration_id?: string
          processed_at?: string | null
          request_data?: Json | null
          response_data?: Json | null
          response_status?: number | null
          response_time_ms?: number | null
          status?: string
          user_id?: string
          website_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          auth_credentials: Json | null
          auth_type: string | null
          config_data: Json
          created_at: string
          discord_channel_id: string | null
          discord_channel_name: string | null
          discord_guild_id: string | null
          discord_guild_name: string | null
          discord_webhook_url: string | null
          enabled_events: Json | null
          event_filters: Json | null
          failed_notifications_count: number | null
          id: string
          integration_type: string
          last_notification_at: string | null
          last_test_at: string | null
          last_test_error: string | null
          last_test_status: string | null
          name: string
          rate_limit_per_hour: number | null
          retry_attempts: number | null
          retry_delay_seconds: number | null
          slack_access_token: string | null
          slack_channel_id: string | null
          slack_channel_name: string | null
          slack_team_id: string | null
          slack_team_name: string | null
          slack_webhook_url: string | null
          status: string
          total_notifications_sent: number | null
          updated_at: string
          user_id: string
          webhook_headers: Json | null
          webhook_method: string | null
          webhook_secret: string | null
          webhook_timeout_seconds: number | null
          webhook_url: string | null
        }
        Insert: {
          auth_credentials?: Json | null
          auth_type?: string | null
          config_data?: Json
          created_at?: string
          discord_channel_id?: string | null
          discord_channel_name?: string | null
          discord_guild_id?: string | null
          discord_guild_name?: string | null
          discord_webhook_url?: string | null
          enabled_events?: Json | null
          event_filters?: Json | null
          failed_notifications_count?: number | null
          id?: string
          integration_type: string
          last_notification_at?: string | null
          last_test_at?: string | null
          last_test_error?: string | null
          last_test_status?: string | null
          name: string
          rate_limit_per_hour?: number | null
          retry_attempts?: number | null
          retry_delay_seconds?: number | null
          slack_access_token?: string | null
          slack_channel_id?: string | null
          slack_channel_name?: string | null
          slack_team_id?: string | null
          slack_team_name?: string | null
          slack_webhook_url?: string | null
          status?: string
          total_notifications_sent?: number | null
          updated_at?: string
          user_id: string
          webhook_headers?: Json | null
          webhook_method?: string | null
          webhook_secret?: string | null
          webhook_timeout_seconds?: number | null
          webhook_url?: string | null
        }
        Update: {
          auth_credentials?: Json | null
          auth_type?: string | null
          config_data?: Json
          created_at?: string
          discord_channel_id?: string | null
          discord_channel_name?: string | null
          discord_guild_id?: string | null
          discord_guild_name?: string | null
          discord_webhook_url?: string | null
          enabled_events?: Json | null
          event_filters?: Json | null
          failed_notifications_count?: number | null
          id?: string
          integration_type?: string
          last_notification_at?: string | null
          last_test_at?: string | null
          last_test_error?: string | null
          last_test_status?: string | null
          name?: string
          rate_limit_per_hour?: number | null
          retry_attempts?: number | null
          retry_delay_seconds?: number | null
          slack_access_token?: string | null
          slack_channel_id?: string | null
          slack_channel_name?: string | null
          slack_team_id?: string | null
          slack_team_name?: string | null
          slack_webhook_url?: string | null
          status?: string
          total_notifications_sent?: number | null
          updated_at?: string
          user_id?: string
          webhook_headers?: Json | null
          webhook_method?: string | null
          webhook_secret?: string | null
          webhook_timeout_seconds?: number | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      notification_history: {
        Row: {
          alert_type: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          message_preview: string | null
          notification_type: string
          recipient: string
          sent_at: string
          status: string
          subject: string | null
          user_id: string
          website_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_preview?: string | null
          notification_type: string
          recipient: string
          sent_at?: string
          status: string
          subject?: string | null
          user_id: string
          website_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_preview?: string | null
          notification_type?: string
          recipient?: string
          sent_at?: string
          status?: string
          subject?: string | null
          user_id?: string
          website_id?: string | null
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          alert_frequency: string
          created_at: string
          discord_downtime_alerts: boolean
          discord_enabled: boolean
          discord_recovery_alerts: boolean
          discord_webhook_url: string | null
          email_downtime_alerts: boolean
          email_enabled: boolean
          email_maintenance_alerts: boolean
          email_monthly_reports: boolean
          email_recovery_alerts: boolean
          email_weekly_reports: boolean
          escalation_delay_minutes: number | null
          escalation_email: string | null
          escalation_enabled: boolean
          escalation_sms_number: string | null
          id: string
          ignore_minor_errors: boolean
          ignore_ssl_warnings: boolean
          min_downtime_duration_seconds: number | null
          quiet_hours_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          quiet_hours_timezone: string | null
          slack_channel: string | null
          slack_daily_summaries: boolean
          slack_downtime_alerts: boolean
          slack_enabled: boolean
          slack_recovery_alerts: boolean
          slack_webhook_url: string | null
          sms_critical_alerts_only: boolean
          sms_downtime_alerts: boolean
          sms_enabled: boolean
          sms_phone_number: string | null
          sms_phone_verified: boolean
          sms_recovery_alerts: boolean
          updated_at: string
          user_id: string
          webhook_downtime_alerts: boolean
          webhook_enabled: boolean
          webhook_maintenance_alerts: boolean
          webhook_recovery_alerts: boolean
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          alert_frequency?: string
          created_at?: string
          discord_downtime_alerts?: boolean
          discord_enabled?: boolean
          discord_recovery_alerts?: boolean
          discord_webhook_url?: string | null
          email_downtime_alerts?: boolean
          email_enabled?: boolean
          email_maintenance_alerts?: boolean
          email_monthly_reports?: boolean
          email_recovery_alerts?: boolean
          email_weekly_reports?: boolean
          escalation_delay_minutes?: number | null
          escalation_email?: string | null
          escalation_enabled?: boolean
          escalation_sms_number?: string | null
          id?: string
          ignore_minor_errors?: boolean
          ignore_ssl_warnings?: boolean
          min_downtime_duration_seconds?: number | null
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          quiet_hours_timezone?: string | null
          slack_channel?: string | null
          slack_daily_summaries?: boolean
          slack_downtime_alerts?: boolean
          slack_enabled?: boolean
          slack_recovery_alerts?: boolean
          slack_webhook_url?: string | null
          sms_critical_alerts_only?: boolean
          sms_downtime_alerts?: boolean
          sms_enabled?: boolean
          sms_phone_number?: string | null
          sms_phone_verified?: boolean
          sms_recovery_alerts?: boolean
          updated_at?: string
          user_id: string
          webhook_downtime_alerts?: boolean
          webhook_enabled?: boolean
          webhook_maintenance_alerts?: boolean
          webhook_recovery_alerts?: boolean
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          alert_frequency?: string
          created_at?: string
          discord_downtime_alerts?: boolean
          discord_enabled?: boolean
          discord_recovery_alerts?: boolean
          discord_webhook_url?: string | null
          email_downtime_alerts?: boolean
          email_enabled?: boolean
          email_maintenance_alerts?: boolean
          email_monthly_reports?: boolean
          email_recovery_alerts?: boolean
          email_weekly_reports?: boolean
          escalation_delay_minutes?: number | null
          escalation_email?: string | null
          escalation_enabled?: boolean
          escalation_sms_number?: string | null
          id?: string
          ignore_minor_errors?: boolean
          ignore_ssl_warnings?: boolean
          min_downtime_duration_seconds?: number | null
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          quiet_hours_timezone?: string | null
          slack_channel?: string | null
          slack_daily_summaries?: boolean
          slack_downtime_alerts?: boolean
          slack_enabled?: boolean
          slack_recovery_alerts?: boolean
          slack_webhook_url?: string | null
          sms_critical_alerts_only?: boolean
          sms_downtime_alerts?: boolean
          sms_enabled?: boolean
          sms_phone_number?: string | null
          sms_phone_verified?: boolean
          sms_recovery_alerts?: boolean
          updated_at?: string
          user_id?: string
          webhook_downtime_alerts?: boolean
          webhook_enabled?: boolean
          webhook_maintenance_alerts?: boolean
          webhook_recovery_alerts?: boolean
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      page_speed_logs: {
        Row: {
          checked_at: string | null
          created_at: string | null
          first_byte_time: number
          id: string
          load_time: number
          page_size: number
          site_id: string
          status_code: number
        }
        Insert: {
          checked_at?: string | null
          created_at?: string | null
          first_byte_time: number
          id?: string
          load_time: number
          page_size: number
          site_id: string
          status_code: number
        }
        Update: {
          checked_at?: string | null
          created_at?: string | null
          first_byte_time?: number
          id?: string
          load_time?: number
          page_size?: number
          site_id?: string
          status_code?: number
        }
        Relationships: [
          {
            foreignKeyName: "page_speed_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "monitoring_dashboard"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "page_speed_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      scans: {
        Row: {
          broken_links: number | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          scan_type: string
          site_id: string
          started_at: string
          status: string | null
          total_links: number | null
        }
        Insert: {
          broken_links?: number | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          scan_type?: string
          site_id: string
          started_at?: string
          status?: string | null
          total_links?: number | null
        }
        Update: {
          broken_links?: number | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          scan_type?: string
          site_id?: string
          started_at?: string
          status?: string | null
          total_links?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scans_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "monitoring_dashboard"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "scans_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      service_audit_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          operation: string
          record_id: string | null
          service_id: string
          service_type: string
          success: boolean
          table_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          operation: string
          record_id?: string | null
          service_id: string
          service_type: string
          success?: boolean
          table_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          operation?: string
          record_id?: string | null
          service_id?: string
          service_type?: string
          success?: boolean
          table_name?: string
        }
        Relationships: []
      }
      sites: {
        Row: {
          active: boolean | null
          created_at: string
          id: string
          is_active: boolean | null
          last_checked: string | null
          logo_url: string | null
          name: string
          public_status: boolean
          show_on_status_page: boolean | null
          ssl_last_checked: string | null
          ssl_status: boolean | null
          status: string | null
          type: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_checked?: string | null
          logo_url?: string | null
          name: string
          public_status?: boolean
          show_on_status_page?: boolean | null
          ssl_last_checked?: string | null
          ssl_status?: boolean | null
          status?: string | null
          type?: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_checked?: string | null
          logo_url?: string | null
          name?: string
          public_status?: boolean
          show_on_status_page?: boolean | null
          ssl_last_checked?: string | null
          ssl_status?: boolean | null
          status?: string | null
          type?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_monitoring_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      status_checks: {
        Row: {
          check_location: string | null
          checked_at: string
          error_message: string | null
          id: string
          response_time_ms: number | null
          service_id: string
          status: string
          status_code: number | null
        }
        Insert: {
          check_location?: string | null
          checked_at?: string
          error_message?: string | null
          id?: string
          response_time_ms?: number | null
          service_id: string
          status: string
          status_code?: number | null
        }
        Update: {
          check_location?: string | null
          checked_at?: string
          error_message?: string | null
          id?: string
          response_time_ms?: number | null
          service_id?: string
          status?: string
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "status_checks_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "status_services"
            referencedColumns: ["id"]
          },
        ]
      }
      status_incident_updates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          incident_id: string
          message: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          incident_id: string
          message: string
          status: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          incident_id?: string
          message?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_incident_updates_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "status_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      status_incidents: {
        Row: {
          affected_services: string[] | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          impact: string
          is_public: boolean | null
          notify_subscribers: boolean | null
          resolved_at: string | null
          started_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          affected_services?: string[] | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          impact: string
          is_public?: boolean | null
          notify_subscribers?: boolean | null
          resolved_at?: string | null
          started_at?: string
          status: string
          title: string
          updated_at?: string
        }
        Update: {
          affected_services?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          impact?: string
          is_public?: boolean | null
          notify_subscribers?: boolean | null
          resolved_at?: string | null
          started_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      status_maintenance: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          affected_services: string[] | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          is_public: boolean | null
          maintenance_type: string
          notify_subscribers: boolean | null
          scheduled_end: string
          scheduled_start: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          affected_services?: string[] | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          is_public?: boolean | null
          maintenance_type: string
          notify_subscribers?: boolean | null
          scheduled_end: string
          scheduled_start: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          affected_services?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_public?: boolean | null
          maintenance_type?: string
          notify_subscribers?: boolean | null
          scheduled_end?: string
          scheduled_start?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      status_services: {
        Row: {
          check_interval_minutes: number | null
          check_method: string | null
          check_url: string | null
          created_at: string
          current_status: string
          description: string | null
          display_order: number | null
          expected_status_codes: number[] | null
          id: string
          is_active: boolean | null
          is_visible: boolean | null
          last_checked_at: string | null
          last_incident_at: string | null
          name: string
          service_type: string
          timeout_seconds: number | null
          updated_at: string
        }
        Insert: {
          check_interval_minutes?: number | null
          check_method?: string | null
          check_url?: string | null
          created_at?: string
          current_status?: string
          description?: string | null
          display_order?: number | null
          expected_status_codes?: number[] | null
          id?: string
          is_active?: boolean | null
          is_visible?: boolean | null
          last_checked_at?: string | null
          last_incident_at?: string | null
          name: string
          service_type: string
          timeout_seconds?: number | null
          updated_at?: string
        }
        Update: {
          check_interval_minutes?: number | null
          check_method?: string | null
          check_url?: string | null
          created_at?: string
          current_status?: string
          description?: string | null
          display_order?: number | null
          expected_status_codes?: number[] | null
          id?: string
          is_active?: boolean | null
          is_visible?: boolean | null
          last_checked_at?: string | null
          last_incident_at?: string | null
          name?: string
          service_type?: string
          timeout_seconds?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      status_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          incident_notifications: boolean | null
          is_active: boolean | null
          is_verified: boolean | null
          maintenance_notifications: boolean | null
          subscribed_services: string[] | null
          unsubscribe_token: string
          updated_at: string
          verification_sent_at: string | null
          verification_token: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          incident_notifications?: boolean | null
          is_active?: boolean | null
          is_verified?: boolean | null
          maintenance_notifications?: boolean | null
          subscribed_services?: string[] | null
          unsubscribe_token?: string
          updated_at?: string
          verification_sent_at?: string | null
          verification_token?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          incident_notifications?: boolean | null
          is_active?: boolean | null
          is_verified?: boolean | null
          maintenance_notifications?: boolean | null
          subscribed_services?: string[] | null
          unsubscribe_token?: string
          updated_at?: string
          verification_sent_at?: string | null
          verification_token?: string | null
        }
        Relationships: []
      }
      uptime_logs: {
        Row: {
          checked_at: string
          created_at: string
          error_message: string | null
          id: string
          load_time_ms: number | null
          page_speed_score: number | null
          response_time: number | null
          site_id: string
          ssl_checked_at: string | null
          ssl_expires_at: string | null
          ssl_valid: boolean | null
          status: string
          status_code: number | null
        }
        Insert: {
          checked_at?: string
          created_at?: string
          error_message?: string | null
          id?: string
          load_time_ms?: number | null
          page_speed_score?: number | null
          response_time?: number | null
          site_id: string
          ssl_checked_at?: string | null
          ssl_expires_at?: string | null
          ssl_valid?: boolean | null
          status: string
          status_code?: number | null
        }
        Update: {
          checked_at?: string
          created_at?: string
          error_message?: string | null
          id?: string
          load_time_ms?: number | null
          page_speed_score?: number | null
          response_time?: number | null
          site_id?: string
          ssl_checked_at?: string | null
          ssl_expires_at?: string | null
          ssl_valid?: boolean | null
          status?: string
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "uptime_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "monitoring_dashboard"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "uptime_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      user_performance_logs: {
        Row: {
          city: string | null
          cls: number | null
          connection_type: string | null
          country_code: string | null
          created_at: string
          device_type: string | null
          dom_content_loaded: number | null
          fcp: number | null
          fid: number | null
          id: string
          lcp: number | null
          load_event: number | null
          navigation_type: string | null
          page_url: string
          received_at: string
          recorded_at: string
          referrer_url: string | null
          region: string | null
          screen_resolution: string | null
          site_id: string
          ttfb: number | null
          user_agent: string | null
        }
        Insert: {
          city?: string | null
          cls?: number | null
          connection_type?: string | null
          country_code?: string | null
          created_at?: string
          device_type?: string | null
          dom_content_loaded?: number | null
          fcp?: number | null
          fid?: number | null
          id?: string
          lcp?: number | null
          load_event?: number | null
          navigation_type?: string | null
          page_url: string
          received_at?: string
          recorded_at: string
          referrer_url?: string | null
          region?: string | null
          screen_resolution?: string | null
          site_id: string
          ttfb?: number | null
          user_agent?: string | null
        }
        Update: {
          city?: string | null
          cls?: number | null
          connection_type?: string | null
          country_code?: string | null
          created_at?: string
          device_type?: string | null
          dom_content_loaded?: number | null
          fcp?: number | null
          fid?: number | null
          id?: string
          lcp?: number | null
          load_event?: number | null
          navigation_type?: string | null
          page_url?: string
          received_at?: string
          recorded_at?: string
          referrer_url?: string | null
          region?: string | null
          screen_resolution?: string | null
          site_id?: string
          ttfb?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_performance_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "monitoring_dashboard"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "user_performance_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          notification_preferences: Json | null
          plan: string
          role: string
          status_page_enabled: boolean | null
          status_page_slug: string | null
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          notification_preferences?: Json | null
          plan?: string
          role?: string
          status_page_enabled?: boolean | null
          status_page_slug?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          notification_preferences?: Json | null
          plan?: string
          role?: string
          status_page_enabled?: boolean | null
          status_page_slug?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed: boolean | null
          processed_at: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      monitoring_dashboard: {
        Row: {
          broken_links_count: number | null
          current_status: string | null
          last_checked: string | null
          last_scan_date: string | null
          last_speed_test: string | null
          latest_load_time: number | null
          latest_performance_score: number | null
          latest_response_time: number | null
          site_id: string | null
          site_name: string | null
          site_url: string | null
          total_links_count: number | null
          user_email: string | null
          user_id: string | null
          user_plan: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_monitoring_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_monitoring_info: {
        Row: {
          email: string | null
          frequency_display: string | null
          id: string | null
          monitoring_frequency: unknown | null
          plan: string | null
        }
        Insert: {
          email?: string | null
          frequency_display?: never
          id?: string | null
          monitoring_frequency?: never
          plan?: string | null
        }
        Update: {
          email?: string | null
          frequency_display?: never
          id?: string | null
          monitoring_frequency?: never
          plan?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      bytea_to_text: {
        Args: { data: string }
        Returns: string
      }
      calculate_uptime_percentage: {
        Args: { service_uuid: string; time_period?: unknown }
        Returns: number
      }
      call_edge_function: {
        Args: { function_name: string; payload?: Json }
        Returns: Json
      }
      check_daily_metrics_quality: {
        Args: { check_date: string }
        Returns: boolean
      }
      cleanup_old_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_email_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_integration_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_notification_history: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_performance_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_status_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_uptime_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      debug_http_response: {
        Args: { test_url: string }
        Returns: {
          column_name: string
          column_value: string
        }[]
      }
      decrypt_integration_secrets: {
        Args: { data: Json }
        Returns: Json
      }
      encrypt_integration_secrets: {
        Args: { data: Json }
        Returns: Json
      }
      generate_status_page_slug: {
        Args: { user_email: string }
        Returns: string
      }
      get_api_endpoint_limit: {
        Args: { user_plan: string }
        Returns: number
      }
      get_current_user_monitoring_info: {
        Args: Record<PropertyKey, never>
        Returns: {
          frequency_display: string
          monitoring_frequency: unknown
          plan: string
        }[]
      }
      get_edge_function_url: {
        Args: { function_name: string }
        Returns: string
      }
      get_next_check_time: {
        Args: { site_uuid: string }
        Returns: string
      }
      get_overall_status: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_performance_summary: {
        Args: { hours_back?: number; target_site_id: string }
        Returns: {
          avg_cls: number
          avg_fcp: number
          avg_fid: number
          avg_lcp: number
          avg_ttfb: number
          device_breakdown: Json
          top_countries: Json
          total_pageviews: number
          unique_visitors: number
        }[]
      }
      get_site_monitoring_summary: {
        Args: { days_back?: number; target_site_id: string }
        Returns: Json
      }
      get_uptime_percentage: {
        Args: { days?: number; site_uuid: string }
        Returns: number
      }
      get_user_monitoring_frequency: {
        Args: { user_plan: string }
        Returns: unknown
      }
      get_user_status_page_data: {
        Args: { slug: string }
        Returns: Json
      }
      get_website_limit: {
        Args: { user_plan: string }
        Returns: number
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_delete: {
        Args:
          | { content: string; content_type: string; uri: string }
          | { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_get: {
        Args: { data: Json; uri: string } | { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
      }
      http_list_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_post: {
        Args:
          | { content: string; content_type: string; uri: string }
          | { data: Json; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_reset_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      incident_is_public: {
        Args: { incident_id: string }
        Returns: boolean
      }
      is_service: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_service_or_owner: {
        Args: { site_id: string }
        Returns: boolean
      }
      normalize_to_monthly_cents: {
        Args: { amount_cents: number; billing_interval: string }
        Returns: number
      }
      real_tiered_uptime_monitoring: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      real_tiered_uptime_monitoring_with_ssl: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      real_uptime_monitoring: {
        Args: Record<PropertyKey, never>
        Returns: {
          checked_count: number
          results: Json
        }[]
      }
      recompute_daily_facts: {
        Args: { target_date: string }
        Returns: undefined
      }
      run_analytics_backfill: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      run_analytics_quality_check: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      service_is_visible: {
        Args: { service_id: string }
        Returns: boolean
      }
      service_type: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      text_to_bytea: {
        Args: { data: string }
        Returns: string
      }
      update_user_last_sign_in: {
        Args: { user_id: string }
        Returns: undefined
      }
      urlencode: {
        Args: { data: Json } | { string: string } | { string: string }
        Returns: string
      }
      user_owns_integration: {
        Args: { integration_id: string }
        Returns: boolean
      }
      user_owns_site: {
        Args: { site_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown | null
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
