import { NextRequest, NextResponse } from 'next/server'
import { contactSchema, validateAndSanitize } from '@/lib/validation'
import nodemailer from 'nodemailer'
import {
  checkIPLimit,
  getClientIP,
  createRateLimitResponse,
  getRateLimitHeaders,
  RATE_LIMIT_CONFIGS
} from '@/lib/redis-rate-limit'
import { validateCSRF } from '@/lib/csrf-protection'
import { randomBytes } from 'crypto'
import { notifyContactFormSubmission } from '@/lib/slack-notifications'

export async function POST(request: NextRequest) {
  const requestId = randomBytes(8).toString('hex')

  // CSRF Protection: Validate Origin/Referer for contact form submission
  const csrfValidation = validateCSRF(request)
  if (!csrfValidation.isValid) {
    console.warn(`[${requestId}] CSRF protection blocked contact form submission`, {
      reason: csrfValidation.reason,
      origin: csrfValidation.origin,
      referer: csrfValidation.referer
    })
    return NextResponse.json(
      { error: 'Request blocked by security policy' },
      { status: 403 }
    )
  }

  try {
    const ip = getClientIP(request)

    // Check rate limits first (IP-based for contact form)
    const rateLimitResult = await checkIPLimit(
      ip,
      RATE_LIMIT_CONFIGS.contact.ip,
      'contact'
    )

    if (!rateLimitResult.success) {
      return createRateLimitResponse(
        rateLimitResult,
        'Too many contact form submissions. Please try again later.'
      )
    }

    const rawData = await request.json()
    // Note: Avoiding logging form data to protect user privacy

    // Validate and sanitize input
    let validatedData
    try {
      validatedData = validateAndSanitize(contactSchema, rawData)
    } catch (validationError: unknown) {
      const errorMessage = validationError instanceof Error ? validationError.message : 'Invalid form data'
      console.error(`[${requestId}] Contact form validation failed:`, errorMessage)
      // Note: Not logging raw data to protect user privacy
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }
    
    const { name, email, subject, message } = validatedData
    const plan = rawData.plan ? String(rawData.plan) : 'Not specified'

    // Create email content (IP removed for privacy)
    const emailContent = `
New contact form submission from PingBuoy website:

Name: ${name}
Email: ${email}
Current Plan: ${plan}
Subject: ${subject}

Message:
${message}

---
Submitted at: ${new Date().toISOString()}
`

    const htmlContent = `
<h2>New contact form submission from PingBuoy website</h2>
<p><strong>Name:</strong> ${name}</p>
<p><strong>Email:</strong> ${email}</p>
<p><strong>Current Plan:</strong> ${plan}</p>
<p><strong>Subject:</strong> ${subject}</p>
<h3>Message:</h3>
<p>${message.replace(/\n/g, '<br>')}</p>
<hr>
<p><small>Submitted at: ${new Date().toISOString()}</small></p>
`

    // Send email using nodemailer
    try {
      // Create transporter
      const transporter = nodemailer.createTransport({ 
		host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },          
		...(process.env.NODE_ENV === "production" ? {} : { tls: { rejectUnauthorized: false } })
	})
      
      const info = await transporter.sendMail({
        from: `"PingBuoy Contact Form" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: process.env.CONTACT_EMAIL || 'support@pingbuoy.com',
        replyTo: email,
        subject: `Contact Form: ${subject}`,
        text: emailContent,
        html: htmlContent,
      })

      console.log(`[${requestId}] Contact form email sent successfully:`, info.messageId)

      // Send Slack notification
      await notifyContactFormSubmission({
        name,
        email,
        subject,
        message,
        plan
      })

      return NextResponse.json({ success: true }, {
        headers: getRateLimitHeaders(rateLimitResult)
      })

    } catch (emailError: unknown) {
      console.error(`[${requestId}] Error sending contact form email:`, emailError)
      console.error(`[${requestId}] SMTP Config:`, {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE,
        user: process.env.SMTP_USER ? 'Set' : 'Not set',
        pass: process.env.SMTP_PASS ? 'Set' : 'Not set'
      })
      return NextResponse.json(
        { error: 'Failed to send email. Please check server logs.' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error(`[${requestId}] Error processing contact form:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}