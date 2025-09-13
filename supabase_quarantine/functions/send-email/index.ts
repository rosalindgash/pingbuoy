import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

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
async function checkRateLimit(supabase: any, email: string): Promise<boolean> {
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
      console.error('Rate limit check error (hourly):', hourlyError)
      return false
    }
    
    if (hourlyData && hourlyData.length >= 10) {
      console.log(`Rate limit exceeded (hourly) for ${email}`)
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
      console.error('Rate limit check error (daily):', dailyError)
      return false
    }
    
    if (dailyData && dailyData.length >= 50) {
      console.log(`Rate limit exceeded (daily) for ${email}`)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Rate limit check error:', error)
    return false
  }
}

// Log email activity
async function logEmailActivity(
  supabase: any,
  email: string,
  templateName: string,
  success: boolean,
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
  } catch (logError) {
    console.error('Failed to log email activity:', logError)
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
    console.log('Email sent successfully:', {
      to: emailData.to,
      subject: emailData.subject,
      timestamp: new Date().toISOString()
    })
    
    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
  } catch (error) {
    console.error('Email sending error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Parse request body
    const emailRequest: EmailRequest = await req.json()
    
    // Validate required fields
    if (!emailRequest.to || !emailRequest.subject || (!emailRequest.html && !emailRequest.text)) {
      return new Response(
        JSON.stringify({ error: 'Missing required email fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Validate email addresses
    if (!isValidEmail(emailRequest.to)) {
      return new Response(
        JSON.stringify({ error: 'Invalid recipient email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (emailRequest.from && !isValidEmail(emailRequest.from)) {
      return new Response(
        JSON.stringify({ error: 'Invalid sender email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Check rate limits
    const canSend = await checkRateLimit(supabase, emailRequest.to)
    if (!canSend) {
      await logEmailActivity(supabase, emailRequest.to, 'rate-limited', false, 'Rate limit exceeded')
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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
      result.error
    )
    
    // Return result
    if (result.success) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          messageId: result.messageId 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
  } catch (error) {
    console.error('Email function error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})