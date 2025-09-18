import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { withSecureCORS } from '../_shared/cors-config.ts'
import { createLogger, ErrorCodes } from '../_shared/logger.ts'
import { withMonitoringAuth } from '../_shared/service-auth.ts'

interface EmailRequest {
  to: string
  from: string
  subject: string
  html: string
  text: string
  headers?: Record<string, string>
}

interface EmailResponse {
  success: boolean
  messageId?: string
  error?: string
}

// Email validation function
function isValidEmail(email: string): boolean {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
  return emailRegex.test(email) && email.length <= 254
}

// Sanitize email content
function sanitizeEmailContent(content: string): string {
  // Remove potentially dangerous content
  return content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
}

// Rate limiting check
async function checkRateLimit(supabase: any, email: string, logger: any): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  try {
    // Check hourly limit (max 10 emails per hour per recipient)
    const { data: hourlyData, error: hourlyError } = await supabase
      .from('email_logs')
      .select('id')
      .eq('recipient_email', email)
      .eq('success', true)
      .gte('sent_at', oneHourAgo)
      .limit(11)

    if (hourlyError) {
      logger.error('Rate limit check failed', {
        limitType: 'hourly',
        errorCode: ErrorCodes.DB_QUERY_ERROR,
        error: hourlyError.code || 'UNKNOWN'
      })
      return false
    }

    if (hourlyData && hourlyData.length >= 10) {
      logger.rateLimitHit(email, 'hourly', hourlyData.length, 10)
      return false
    }

    // Check daily limit (max 50 emails per day per recipient)
    const { data: dailyData, error: dailyError } = await supabase
      .from('email_logs')
      .select('id')
      .eq('recipient_email', email)
      .eq('success', true)
      .gte('sent_at', oneDayAgo)
      .limit(51)

    if (dailyError) {
      logger.error('Rate limit check failed', {
        limitType: 'daily',
        errorCode: ErrorCodes.DB_QUERY_ERROR,
        error: dailyError.code || 'UNKNOWN'
      })
      return false
    }

    if (dailyData && dailyData.length >= 50) {
      logger.rateLimitHit(email, 'daily', dailyData.length, 50)
      return false
    }

    return true
  } catch (error) {
    logger.error('Rate limit check error', {
      errorCode: ErrorCodes.DB_CONNECTION_ERROR
    })
    return false
  }
}

// Log email activity
async function logEmailActivity(
  supabase: any,
  email: string,
  templateName: string,
  success: boolean,
  logger: any,
  error?: string
): Promise<void> {
  try {
    await supabase.from('email_logs').insert({
      recipient_email: email,
      template_name: templateName,
      sent_at: new Date().toISOString(),
      success,
      error_message: error || null,
      ip_address: '0.0.0.0', // Edge function IP
      user_agent: 'Supabase Edge Function'
    })
    logger.dbOperation('INSERT', 'email_logs', true, 1)
  } catch (logError) {
    logger.error('Failed to log email activity', {
      errorCode: ErrorCodes.DB_QUERY_ERROR,
      error: logError.code || 'UNKNOWN'
    })
  }
}

// Mock email sender (replace with actual email service like SendGrid, AWS SES, etc.)
async function sendEmailViaProvider(emailData: EmailRequest): Promise<EmailResponse> {
  try {
    // In production, integrate with your email service provider
    // Example integrations:
    
    // SendGrid
    // const sgMail = require('@sendgrid/mail')
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    // const response = await sgMail.send(emailData)
    
    // AWS SES
    // const ses = new AWS.SES({ region: 'us-east-1' })
    // const response = await ses.sendEmail(emailData).promise()
    
    // For now, simulate successful sending
    // Note: No PII logged - only template information
    
    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

serve(withSecureCORS(async (req) => {
  const logger = createLogger('send-email')
  const startTime = Date.now()

  logger.requestStart(req.method)

  // Only allow POST requests
  if (req.method !== 'POST') {
    logger.error('Invalid request method', {
      method: req.method,
      errorCode: ErrorCodes.INVALID_REQUEST
    })
    logger.requestEnd(405, Date.now() - startTime)
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Parse request body
    const emailRequest: EmailRequest = await req.json()

    // Validate required fields
    if (!emailRequest.to || !emailRequest.subject || (!emailRequest.html && !emailRequest.text)) {
      logger.error('Missing required email fields', {
        errorCode: ErrorCodes.MISSING_PARAMS,
        hasTo: !!emailRequest.to,
        hasSubject: !!emailRequest.subject,
        hasContent: !!(emailRequest.html || emailRequest.text)
      })
      logger.requestEnd(400, Date.now() - startTime)
      return new Response(
        JSON.stringify({ error: 'Missing required email fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate email addresses
    if (!isValidEmail(emailRequest.to)) {
      logger.error('Invalid recipient email format', {
        errorCode: ErrorCodes.INVALID_EMAIL
      })
      logger.requestEnd(400, Date.now() - startTime)
      return new Response(
        JSON.stringify({ error: 'Invalid recipient email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (emailRequest.from && !isValidEmail(emailRequest.from)) {
      logger.error('Invalid sender email format', {
        errorCode: ErrorCodes.INVALID_EMAIL
      })
      logger.requestEnd(400, Date.now() - startTime)
      return new Response(
        JSON.stringify({ error: 'Invalid sender email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const results = await withMonitoringAuth('email_sender', async (supabase) => {
      // Check rate limits
      const canSend = await checkRateLimit(supabase, emailRequest.to, logger)
      if (!canSend) {
        await logEmailActivity(supabase, emailRequest.to, 'rate-limited', false, logger, 'Rate limit exceeded')
        throw new Error('Rate limit exceeded')
      }
      // Sanitize email content
      const sanitizedEmail: EmailRequest = {
        ...emailRequest,
        to: emailRequest.to.toLowerCase().trim(),
        from: emailRequest.from || 'noreply@pingbuoy.com',
        subject: emailRequest.subject.substring(0, 200), // Limit subject length
        html: emailRequest.html ? sanitizeEmailContent(emailRequest.html) : '',
        text: emailRequest.text ? sanitizeEmailContent(emailRequest.text) : '',
        headers: {
          ...emailRequest.headers,
          'X-Sender': 'PingBuoy',
          'X-Priority': '3',
          'X-Mailer': 'PingBuoy Email Service v1.0'
        }
      }
      // Send email via provider
      const result = await sendEmailViaProvider(sanitizedEmail)

      // Log activity
      await logEmailActivity(
        supabase,
        sanitizedEmail.to,
        'api-request',
        result.success,
        logger,
        result.error
      )

      logger.emailResult('api-request', result.success, result.success ? undefined : ErrorCodes.EMAIL_SEND_FAILED)

      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error
      }
    })
    // Return result
    if (results.success) {
      logger.requestEnd(200, Date.now() - startTime)
      return new Response(
        JSON.stringify({
          success: true,
          messageId: results.messageId
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    } else {
      logger.requestEnd(500, Date.now() - startTime)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email delivery failed'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
  } catch (error) {
    logger.error('Email function error', {
      errorCode: ErrorCodes.EXTERNAL_SERVICE_ERROR,
      duration: Date.now() - startTime
    })

    // Handle specific error cases
    if (error.message === 'Rate limit exceeded') {
      logger.requestEnd(429, Date.now() - startTime)
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }

    logger.requestEnd(500, Date.now() - startTime)
    return new Response(
      JSON.stringify({
        error: 'Internal server error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}))