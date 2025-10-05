import { z } from 'zod'

// Server-safe validation without DOMPurify/JSDOM dependencies
// For client-side usage, use DOMPurify directly in browser components

// Phone number validation regex (E.164 format)
const phoneRegex = /^\+[1-9]\d{1,14}$/

// Webhook URL validation
const webhookUrlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/

// Slack webhook validation
const slackWebhookRegex = /^https:\/\/hooks\.slack\.com\/services\/[A-Z0-9/]+$/

// Discord webhook validation
const discordWebhookRegex = /^https:\/\/discord(app)?\.com\/api\/webhooks\/[0-9]+\/[A-Za-z0-9_-]+$/

// Timezone validation (common timezones)
const validTimezones = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
  'Australia/Sydney', 'America/Toronto', 'America/Sao_Paulo', 'Asia/Mumbai'
]

// Alert frequency options
const alertFrequencyOptions = ['immediate', 'every_5min', 'every_15min', 'every_hour'] as const

// Base notification settings schema
export const notificationSettingsSchema = z.object({
  // Email preferences
  email_enabled: z.boolean(),
  email_downtime_alerts: z.boolean(),
  email_recovery_alerts: z.boolean(),
  email_maintenance_alerts: z.boolean(),
  email_weekly_reports: z.boolean(),
  email_monthly_reports: z.boolean(),
  
  // SMS preferences (Pro feature)
  sms_enabled: z.boolean(),
  sms_phone_number: z.string()
    .nullable()
    .refine((val) => val === null || phoneRegex.test(val), {
      message: 'Phone number must be in E.164 format (e.g., +1234567890)'
    }),
  sms_phone_verified: z.boolean(),
  sms_downtime_alerts: z.boolean(),
  sms_recovery_alerts: z.boolean(),
  sms_critical_alerts_only: z.boolean(),
  
  // Webhook preferences (Pro feature)
  webhook_enabled: z.boolean(),
  webhook_url: z.string()
    .nullable()
    .refine((val) => val === null || webhookUrlRegex.test(val), {
      message: 'Webhook URL must be a valid HTTP/HTTPS URL'
    }),
  webhook_secret: z.string()
    .nullable()
    .refine((val) => val === null || (val.length >= 8 && val.length <= 128), {
      message: 'Webhook secret must be between 8-128 characters'
    }),
  webhook_downtime_alerts: z.boolean(),
  webhook_recovery_alerts: z.boolean(),
  webhook_maintenance_alerts: z.boolean(),
  
  // Slack integration (Pro feature)
  slack_enabled: z.boolean(),
  slack_webhook_url: z.string()
    .nullable()
    .refine((val) => val === null || slackWebhookRegex.test(val), {
      message: 'Must be a valid Slack webhook URL'
    }),
  slack_channel: z.string()
    .nullable()
    .refine((val) => val === null || (val.startsWith('#') && val.length >= 2 && val.length <= 21), {
      message: 'Channel name must start with # and be 2-21 characters'
    }),
  slack_downtime_alerts: z.boolean(),
  slack_recovery_alerts: z.boolean(),
  slack_daily_summaries: z.boolean(),
  
  // Discord integration (Pro feature)
  discord_enabled: z.boolean(),
  discord_webhook_url: z.string()
    .nullable()
    .refine((val) => val === null || discordWebhookRegex.test(val), {
      message: 'Must be a valid Discord webhook URL'
    }),
  discord_downtime_alerts: z.boolean(),
  discord_recovery_alerts: z.boolean(),
  
  // Alert timing preferences
  alert_frequency: z.enum(alertFrequencyOptions),
  quiet_hours_enabled: z.boolean(),
  quiet_hours_start: z.string()
    .nullable()
    .refine((val) => val === null || /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val), {
      message: 'Time must be in HH:MM format'
    }),
  quiet_hours_end: z.string()
    .nullable()
    .refine((val) => val === null || /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val), {
      message: 'Time must be in HH:MM format'
    }),
  quiet_hours_timezone: z.enum(validTimezones as [string, ...string[]]),
  
  // Advanced preferences
  escalation_enabled: z.boolean(),
  escalation_delay_minutes: z.number()
    .min(5, 'Escalation delay must be at least 5 minutes')
    .max(240, 'Escalation delay cannot exceed 4 hours')
    .nullable(),
  escalation_email: z.string()
    .email('Must be a valid email address')
    .nullable(),
  escalation_sms_number: z.string()
    .nullable()
    .refine((val) => val === null || phoneRegex.test(val), {
      message: 'Phone number must be in E.164 format'
    }),
  
  // Notification filtering
  min_downtime_duration_seconds: z.number()
    .min(30, 'Minimum downtime duration must be at least 30 seconds')
    .max(1800, 'Minimum downtime duration cannot exceed 30 minutes'),
  ignore_ssl_warnings: z.boolean(),
  ignore_minor_errors: z.boolean()
}).refine(
  (data) => !data.quiet_hours_enabled || (data.quiet_hours_start !== null && data.quiet_hours_end !== null),
  {
    message: 'Quiet hours start and end times are required when quiet hours are enabled',
    path: ['quiet_hours_start']
  }
).refine(
  (data) => !data.escalation_enabled || data.escalation_delay_minutes !== null,
  {
    message: 'Escalation delay is required when escalation is enabled',
    path: ['escalation_delay_minutes']
  }
).refine(
  (data) => !data.sms_enabled || data.sms_phone_number !== null,
  {
    message: 'Phone number is required when SMS notifications are enabled',
    path: ['sms_phone_number']
  }
).refine(
  (data) => !data.webhook_enabled || data.webhook_url !== null,
  {
    message: 'Webhook URL is required when webhook notifications are enabled',
    path: ['webhook_url']
  }
).refine(
  (data) => !data.slack_enabled || data.slack_webhook_url !== null,
  {
    message: 'Slack webhook URL is required when Slack notifications are enabled',
    path: ['slack_webhook_url']
  }
).refine(
  (data) => !data.discord_enabled || data.discord_webhook_url !== null,
  {
    message: 'Discord webhook URL is required when Discord notifications are enabled',
    path: ['discord_webhook_url']
  }
)

// Partial update schema for PATCH requests
export const notificationSettingsUpdateSchema = notificationSettingsSchema.partial()

// Notification history schema
export const notificationHistorySchema = z.object({
  user_id: z.string().uuid(),
  website_id: z.string().uuid().nullable(),
  notification_type: z.enum(['email', 'sms', 'webhook', 'slack', 'discord']),
  alert_type: z.enum(['downtime', 'recovery', 'maintenance', 'report']),
  status: z.enum(['sent', 'failed', 'queued', 'delivered']),
  recipient: z.string().min(1, 'Recipient is required'),
  subject: z.string().nullable(),
  message_preview: z.string().max(500).nullable(),
  error_message: z.string().max(1000).nullable()
})

// Type definitions
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>
export type NotificationSettingsUpdate = z.infer<typeof notificationSettingsUpdateSchema>
export type NotificationHistory = z.infer<typeof notificationHistorySchema>

// Validation helper class
export class NotificationValidator {
  private static instance: NotificationValidator

  private constructor() {}

  public static getInstance(): NotificationValidator {
    if (!NotificationValidator.instance) {
      NotificationValidator.instance = new NotificationValidator()
    }
    return NotificationValidator.instance
  }

  // Simple server-side sanitization (without DOMPurify)
  private sanitizeInput(value: any): any {
    if (typeof value === 'string') {
      // Basic XSS prevention - remove script tags and normalize
      return value
        .trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
    }
    return value
  }

  // Validate notification settings
  public validateSettings(data: unknown): { 
    success: boolean
    data?: NotificationSettings
    errors?: string[]
  } {
    try {
      // Sanitize input data
      const sanitizedData = this.sanitizeObject(data)
      
      // Validate with Zod schema
      const validated = notificationSettingsSchema.parse(sanitizedData)
      
      return { success: true, data: validated }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.issues.map(err => `${err.path.join('.')}: ${err.message}`)
        return { success: false, errors }
      }
      return { success: false, errors: ['Invalid notification settings data'] }
    }
  }

  // Validate partial update
  public validateUpdate(data: unknown): {
    success: boolean
    data?: NotificationSettingsUpdate
    errors?: string[]
  } {
    try {
      const sanitizedData = this.sanitizeObject(data)
      const validated = notificationSettingsUpdateSchema.parse(sanitizedData)
      
      return { success: true, data: validated }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.issues.map(err => `${err.path.join('.')}: ${err.message}`)
        return { success: false, errors }
      }
      return { success: false, errors: ['Invalid notification settings update'] }
    }
  }

  // Validate notification history entry
  public validateHistory(data: unknown): {
    success: boolean
    data?: NotificationHistory
    errors?: string[]
  } {
    try {
      const sanitizedData = this.sanitizeObject(data)
      const validated = notificationHistorySchema.parse(sanitizedData)
      
      return { success: true, data: validated }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.issues.map(err => `${err.path.join('.')}: ${err.message}`)
        return { success: false, errors }
      }
      return { success: false, errors: ['Invalid notification history data'] }
    }
  }

  // Check if user has Pro features
  public validateProFeatures(settings: NotificationSettingsUpdate, userPlan: string): {
    success: boolean
    errors?: string[]
  } {
    if (userPlan === 'pro') {
      return { success: true }
    }

    const errors: string[] = []
    
    // Check Pro-only features
    if (settings.sms_enabled) {
      errors.push('SMS notifications require Pro plan')
    }
    
    if (settings.webhook_enabled) {
      errors.push('Webhook notifications require Pro plan')
    }
    
    if (settings.slack_enabled) {
      errors.push('Slack integration requires Pro plan')
    }
    
    if (settings.discord_enabled) {
      errors.push('Discord integration requires Pro plan')
    }
    
    if (settings.escalation_enabled) {
      errors.push('Escalation alerts require Pro plan')
    }

    if (errors.length > 0) {
      return { success: false, errors }
    }

    return { success: true }
  }

  // Sanitize object recursively
  private sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item))
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value)
      }
      return sanitized
    }
    
    return this.sanitizeInput(obj)
  }

  // Validate webhook URL accessibility
  public async validateWebhookUrl(url: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Basic URL validation
      const urlObj = new URL(url)
      
      // Check for HTTPS in production
      if (process.env.NODE_ENV === 'production' && urlObj.protocol !== 'https:') {
        return { success: false, error: 'Webhook URLs must use HTTPS in production' }
      }
      
      // Check for localhost/private IPs in production (security)
      const hostname = urlObj.hostname.toLowerCase()
      const privatePatterns = [
        /^localhost$/i,
        /^127\./,
        /^192\.168\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[01])\./,
        /^::1$/,
        /^fe80:/i
      ]
      
      if (process.env.NODE_ENV === 'production') {
        for (const pattern of privatePatterns) {
          if (pattern.test(hostname)) {
            return { success: false, error: 'Private/local URLs are not allowed in production' }
          }
        }
      }
      
      return { success: true }
    } catch (error) {
      return { success: false, error: 'Invalid webhook URL format' }
    }
  }
}

// Convenience functions
export const getNotificationValidator = () => NotificationValidator.getInstance()

export const validateNotificationSettings = (data: unknown) => {
  return getNotificationValidator().validateSettings(data)
}

export const validateNotificationUpdate = (data: unknown) => {
  return getNotificationValidator().validateUpdate(data)
}

export const validateProFeatureAccess = (settings: NotificationSettingsUpdate, userPlan: string) => {
  return getNotificationValidator().validateProFeatures(settings, userPlan)
}

// Default notification settings for new users
export const defaultNotificationSettings: NotificationSettings = {
  email_enabled: true,
  email_downtime_alerts: true,
  email_recovery_alerts: true,
  email_maintenance_alerts: false,
  email_weekly_reports: true,
  email_monthly_reports: false,
  
  sms_enabled: false,
  sms_phone_number: null,
  sms_phone_verified: false,
  sms_downtime_alerts: false,
  sms_recovery_alerts: false,
  sms_critical_alerts_only: true,
  
  webhook_enabled: false,
  webhook_url: null,
  webhook_secret: null,
  webhook_downtime_alerts: false,
  webhook_recovery_alerts: false,
  webhook_maintenance_alerts: false,
  
  slack_enabled: false,
  slack_webhook_url: null,
  slack_channel: null,
  slack_downtime_alerts: false,
  slack_recovery_alerts: false,
  slack_daily_summaries: false,
  
  discord_enabled: false,
  discord_webhook_url: null,
  discord_downtime_alerts: false,
  discord_recovery_alerts: false,
  
  alert_frequency: 'immediate',
  quiet_hours_enabled: false,
  quiet_hours_start: null,
  quiet_hours_end: null,
  quiet_hours_timezone: 'UTC',
  
  escalation_enabled: false,
  escalation_delay_minutes: null,
  escalation_email: null,
  escalation_sms_number: null,
  
  min_downtime_duration_seconds: 60,
  ignore_ssl_warnings: false,
  ignore_minor_errors: false
}