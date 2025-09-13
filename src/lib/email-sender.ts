import { createClient } from '@supabase/supabase-js'
import { renderEmailTemplate, EmailTemplateData } from './email-templates'
import { z } from 'zod'
import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

// Initialize DOMPurify for server-side use
const window = new JSDOM('').window
const purify = DOMPurify(window as any)

// Email validation schema
const emailSchema = z.object({
  to: z.string().email('Invalid email address'),
  from: z.string().email('Invalid sender email').optional(),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  html: z.string().optional(),
  text: z.string().min(1, 'Email content is required'),
  templateName: z.string().optional(),
  templateData: z.record(z.any()).optional()
})

export interface EmailRequest {
  to: string
  from?: string
  subject?: string
  html?: string
  text?: string
  templateName?: string
  templateData?: EmailTemplateData
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

// Rate limiting for email sending
class EmailRateLimiter {
  private static instance: EmailRateLimiter
  private requests: Map<string, number[]> = new Map()
  private readonly maxRequestsPerHour = 100
  private readonly maxRequestsPerDay = 500

  public static getInstance(): EmailRateLimiter {
    if (!EmailRateLimiter.instance) {
      EmailRateLimiter.instance = new EmailRateLimiter()
    }
    return EmailRateLimiter.instance
  }

  public canSendEmail(email: string): boolean {
    const now = Date.now()
    const hourAgo = now - (60 * 60 * 1000)
    const dayAgo = now - (24 * 60 * 60 * 1000)
    
    const requests = this.requests.get(email) || []
    
    // Clean old requests
    const recentRequests = requests.filter(timestamp => timestamp > dayAgo)
    this.requests.set(email, recentRequests)
    
    // Check hourly limit
    const hourlyRequests = recentRequests.filter(timestamp => timestamp > hourAgo)
    if (hourlyRequests.length >= this.maxRequestsPerHour) {
      return false
    }
    
    // Check daily limit
    if (recentRequests.length >= this.maxRequestsPerDay) {
      return false
    }
    
    // Add current request
    recentRequests.push(now)
    this.requests.set(email, recentRequests)
    
    return true
  }
}

export class SecureEmailSender {
  private static instance: SecureEmailSender
  private supabase: any
  private rateLimiter: EmailRateLimiter
  private readonly fromEmail = 'noreply@pingbuoy.com'

  private constructor() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration for email service')
    }
    
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    this.rateLimiter = EmailRateLimiter.getInstance()
  }

  public static getInstance(): SecureEmailSender {
    if (!SecureEmailSender.instance) {
      SecureEmailSender.instance = new SecureEmailSender()
    }
    return SecureEmailSender.instance
  }

  private validateAndSanitizeEmail(request: EmailRequest): EmailRequest {
    try {
      // Validate basic structure
      const validated = emailSchema.parse(request)
      
      // Sanitize HTML content if present
      if (validated.html) {
        validated.html = purify.sanitize(validated.html, {
          ALLOWED_TAGS: [
            'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li', 
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'table', 
            'tr', 'td', 'th', 'thead', 'tbody', 'img'
          ],
          ALLOWED_ATTR: [
            'href', 'target', 'style', 'class', 'src', 'alt', 'width', 'height',
            'border', 'cellpadding', 'cellspacing'
          ],
          ALLOW_DATA_ATTR: false,
          FORBID_SCRIPT: true
        })
      }
      
      // Sanitize template data if present
      if (validated.templateData) {
        const sanitizedData: EmailTemplateData = {}
        for (const [key, value] of Object.entries(validated.templateData)) {
          if (typeof value === 'string') {
            sanitizedData[key] = purify.sanitize(value, { ALLOWED_TAGS: [] })
          } else {
            sanitizedData[key] = value
          }
        }
        validated.templateData = sanitizedData
      }
      
      return validated
    } catch (error) {
      throw new Error(`Email validation failed: ${error}`)
    }
  }

  private async logEmailActivity(
    email: string, 
    templateName: string | undefined, 
    success: boolean, 
    error?: string
  ): Promise<void> {
    try {
      await this.supabase.from('email_logs').insert({
        recipient_email: email,
        template_name: templateName || 'custom',
        sent_at: new Date().toISOString(),
        success,
        error_message: error || null,
        ip_address: 'server', // Server-side sending
      })
    } catch (logError) {
      console.error('Failed to log email activity:', logError)
      // Don't throw - email sending should continue even if logging fails
    }
  }

  public async sendEmail(request: EmailRequest): Promise<EmailResult> {
    try {
      // Rate limiting check
      if (!this.rateLimiter.canSendEmail(request.to)) {
        const error = 'Rate limit exceeded for email recipient'
        await this.logEmailActivity(request.to, request.templateName, false, error)
        return { success: false, error }
      }

      // Validate and sanitize input
      const validatedRequest = this.validateAndSanitizeEmail(request)
      
      let emailContent: { subject: string; html: string; text: string }
      
      // Use template or direct content
      if (validatedRequest.templateName) {
        emailContent = renderEmailTemplate(
          validatedRequest.templateName, 
          validatedRequest.templateData || {}
        )
      } else {
        emailContent = {
          subject: validatedRequest.subject || 'PingBuoy Notification',
          html: validatedRequest.html || '',
          text: validatedRequest.text || ''
        }
      }

      // Prepare email data for Supabase Edge Function
      const emailData = {
        to: validatedRequest.to,
        from: validatedRequest.from || this.fromEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        headers: {
          'X-Sender': 'PingBuoy',
          'X-Priority': '3',
          'X-Mailer': 'PingBuoy Email Service v1.0'
        }
      }

      // Send via Supabase Edge Function (would need to be implemented)
      const { data, error } = await this.supabase.functions.invoke('send-email', {
        body: emailData
      })

      if (error) {
        await this.logEmailActivity(request.to, request.templateName, false, error.message)
        return { success: false, error: error.message }
      }

      await this.logEmailActivity(request.to, request.templateName, true)
      return { 
        success: true, 
        messageId: data?.messageId || `email-${Date.now()}` 
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await this.logEmailActivity(request.to, request.templateName, false, errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  // Convenience methods for common email types
  public async sendWelcomeEmail(
    email: string, 
    userName: string, 
    maxWebsites: number = 3,
    monitoringInterval: number = 5
  ): Promise<EmailResult> {
    return this.sendEmail({
      to: email,
      templateName: 'welcome',
      templateData: {
        user_name: userName,
        max_websites: maxWebsites,
        monitoring_interval: monitoringInterval
      }
    })
  }

  public async sendUptimeAlert(
    email: string,
    websiteName: string,
    websiteUrl: string,
    statusCode: number,
    errorMessage: string,
    monitorLocation: string = 'Global'
  ): Promise<EmailResult> {
    return this.sendEmail({
      to: email,
      templateName: 'uptime-alert',
      templateData: {
        website_name: websiteName,
        website_url: websiteUrl,
        status_code: statusCode,
        error_message: errorMessage,
        alert_time: new Date().toISOString(),
        monitor_location: monitorLocation
      }
    })
  }

  public async sendRecoveryAlert(
    email: string,
    websiteName: string,
    websiteUrl: string,
    statusCode: number,
    responseTime: number,
    downtimeDuration: string
  ): Promise<EmailResult> {
    return this.sendEmail({
      to: email,
      templateName: 'recovery-alert',
      templateData: {
        website_name: websiteName,
        website_url: websiteUrl,
        status_code: statusCode,
        response_time: responseTime,
        recovery_time: new Date().toISOString(),
        downtime_duration: downtimeDuration
      }
    })
  }

  public async sendPasswordReset(
    email: string,
    userName: string,
    resetLink: string
  ): Promise<EmailResult> {
    // Validate reset link is from our domain
    const url = new URL(resetLink)
    if (!url.hostname.includes('pingbuoy.com')) {
      return { success: false, error: 'Invalid reset link domain' }
    }

    return this.sendEmail({
      to: email,
      templateName: 'password-reset',
      templateData: {
        user_name: userName,
        reset_link: resetLink
      }
    })
  }

  public async sendWeeklyReport(
    email: string,
    userName: string,
    reportData: {
      reportPeriod: string
      overallUptime: number
      websitesCount: number
      incidentsCount: number
      avgResponseTime: number
      websiteStats: string
      recommendations: string
    }
  ): Promise<EmailResult> {
    return this.sendEmail({
      to: email,
      templateName: 'weekly-report',
      templateData: {
        user_name: userName,
        report_period: reportData.reportPeriod,
        overall_uptime: reportData.overallUptime,
        websites_count: reportData.websitesCount,
        incidents_count: reportData.incidentsCount,
        avg_response_time: reportData.avgResponseTime,
        website_stats: reportData.websiteStats,
        recommendations: reportData.recommendations
      }
    })
  }
}

// Convenience functions
export const getEmailSender = () => SecureEmailSender.getInstance()

export const sendSecureEmail = (request: EmailRequest): Promise<EmailResult> => {
  return getEmailSender().sendEmail(request)
}