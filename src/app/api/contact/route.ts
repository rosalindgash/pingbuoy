import { NextRequest, NextResponse } from 'next/server'
import { contactSchema, validateAndSanitize } from '@/lib/validation'
const nodemailer = require('nodemailer')

export async function POST(request: NextRequest) {
  try {
    const rawData = await request.json()
    console.log('Received form data:', rawData)
    
    // Validate and sanitize input
    let validatedData
    try {
      validatedData = validateAndSanitize(contactSchema, rawData)
    } catch (validationError: any) {
      console.error('Validation error:', validationError.message)
      console.error('Raw data that failed validation:', rawData)
      return NextResponse.json(
        { error: validationError.message || 'Invalid form data' },
        { status: 400 }
      )
    }
    
    const { name, email, subject, message } = validatedData
    const plan = rawData.plan ? String(rawData.plan) : 'Not specified'

    // Create email content
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
IP Address: ${request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown'}
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
<p><small>Submitted at: ${new Date().toISOString()}<br>
IP Address: ${request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown'}</small></p>
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
        tls: {
          rejectUnauthorized: false // Allow self-signed certificates
        }
      })
      
      const info = await transporter.sendMail({
        from: `"PingBuoy Contact Form" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: process.env.CONTACT_EMAIL || 'support@pingbuoy.com',
        replyTo: email,
        subject: `Contact Form: ${subject}`,
        text: emailContent,
        html: htmlContent,
      })

      console.log('Email sent successfully:', info.messageId)
      return NextResponse.json({ success: true })

    } catch (emailError: any) {
      console.error('Error sending email:', emailError)
      console.error('SMTP Config:', {
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
    console.error('Error processing contact form:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}