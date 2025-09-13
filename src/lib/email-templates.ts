import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

// Initialize DOMPurify for server-side sanitization
const window = new JSDOM('').window
const purify = DOMPurify(window as any)

export interface EmailTemplateData {
  [key: string]: string | number | boolean | Date
}

export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

// Security-focused email template class
export class SecureEmailTemplateEngine {
  private static instance: SecureEmailTemplateEngine
  private templates: Map<string, EmailTemplate> = new Map()

  private constructor() {
    this.loadTemplates()
  }

  public static getInstance(): SecureEmailTemplateEngine {
    if (!SecureEmailTemplateEngine.instance) {
      SecureEmailTemplateEngine.instance = new SecureEmailTemplateEngine()
    }
    return SecureEmailTemplateEngine.instance
  }

  private sanitizeInput(input: string): string {
    // Sanitize HTML content to prevent XSS
    return purify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'target'],
      ALLOW_DATA_ATTR: false
    })
  }

  private escapeText(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  private validateTemplateData(data: EmailTemplateData): EmailTemplateData {
    const validated: EmailTemplateData = {}
    
    for (const [key, value] of Object.entries(data)) {
      // Validate key name (alphanumeric + underscore only)
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        throw new Error(`Invalid template variable name: ${key}`)
      }

      // Sanitize value based on type
      if (typeof value === 'string') {
        validated[key] = this.sanitizeInput(value)
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        validated[key] = value
      } else if (value instanceof Date) {
        validated[key] = value.toISOString()
      } else {
        throw new Error(`Unsupported data type for key: ${key}`)
      }
    }

    return validated
  }

  private replaceVariables(template: string, data: EmailTemplateData): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (key in data) {
        const value = data[key]
        if (typeof value === 'string') {
          return this.escapeText(value)
        }
        return String(value)
      }
      // Return empty string for missing variables (fail-safe)
      return ''
    })
  }

  public render(templateName: string, data: EmailTemplateData = {}): EmailTemplate {
    const template = this.templates.get(templateName)
    if (!template) {
      throw new Error(`Template not found: ${templateName}`)
    }

    try {
      // Validate and sanitize input data
      const validatedData = this.validateTemplateData(data)

      // Replace variables in both HTML and text versions
      const renderedHtml = this.replaceVariables(template.html, validatedData)
      const renderedText = this.replaceVariables(template.text, validatedData)
      const renderedSubject = this.replaceVariables(template.subject, validatedData)

      return {
        subject: renderedSubject,
        html: renderedHtml,
        text: renderedText
      }
    } catch (error) {
      console.error('Email template rendering error:', error)
      throw new Error(`Failed to render email template: ${templateName}`)
    }
  }

  private loadTemplates(): void {
    // Welcome Email Template
    this.templates.set('welcome', {
      subject: 'Welcome to PingBuoy - Your Website Monitoring Starts Now!',
      html: this.getWelcomeHtmlTemplate(),
      text: this.getWelcomeTextTemplate()
    })

    // Uptime Alert Template
    this.templates.set('uptime-alert', {
      subject: '🚨 {{website_name}} is DOWN - PingBuoy Alert',
      html: this.getUptimeAlertHtmlTemplate(),
      text: this.getUptimeAlertTextTemplate()
    })

    // Recovery Alert Template
    this.templates.set('recovery-alert', {
      subject: '✅ {{website_name}} is BACK UP - PingBuoy Recovery',
      html: this.getRecoveryAlertHtmlTemplate(),
      text: this.getRecoveryAlertTextTemplate()
    })

    // Password Reset Template
    this.templates.set('password-reset', {
      subject: 'Reset Your PingBuoy Password',
      html: this.getPasswordResetHtmlTemplate(),
      text: this.getPasswordResetTextTemplate()
    })

    // Weekly Report Template
    this.templates.set('weekly-report', {
      subject: 'Your Weekly PingBuoy Monitoring Report',
      html: this.getWeeklyReportHtmlTemplate(),
      text: this.getWeeklyReportTextTemplate()
    })
  }

  // Base HTML template structure
  private getBaseHtmlTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PingBuoy</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: #1e3a8a; padding: 20px; text-align: center; }
        .header img { max-width: 150px; height: auto; }
        .content { padding: 30px; }
        .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
        .button { display: inline-block; padding: 12px 24px; background-color: #1e3a8a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; }
        .alert-red { background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0; }
        .alert-green { background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 16px 0; }
        .alert-blue { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://pingbuoy.com/ping-buoy-header-logo.png" alt="PingBuoy" />
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>&copy; 2025 PingBuoy. All rights reserved.</p>
            <p>
                <a href="https://pingbuoy.com/privacy" style="color: #6b7280;">Privacy Policy</a> |
                <a href="https://pingbuoy.com/unsubscribe" style="color: #6b7280;">Unsubscribe</a>
            </p>
        </div>
    </div>
</body>
</html>`
  }

  // Template implementations
  private getWelcomeHtmlTemplate(): string {
    const content = `
        <h1 style="color: #111827; margin-bottom: 20px;">Welcome to PingBuoy!</h1>
        <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Hi {{user_name}},
        </p>
        <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Thank you for joining PingBuoy! We're excited to help you monitor your websites and keep them running smoothly.
        </p>
        <div class="alert-blue">
            <h3 style="margin-top: 0; color: #1e3a8a;">Getting Started</h3>
            <p style="margin-bottom: 0;">
                Your account is ready to go. You can monitor up to <strong>{{max_websites}}</strong> websites 
                with {{monitoring_interval}}-minute checks.
            </p>
        </div>
        <h3 style="color: #111827;">Next Steps:</h3>
        <ol style="color: #374151; line-height: 1.6;">
            <li>Add your first website to start monitoring</li>
            <li>Configure alert preferences</li>
            <li>Explore our dashboard and reporting features</li>
        </ol>
        <p style="text-align: center; margin: 30px 0;">
            <a href="https://pingbuoy.com/dashboard" class="button">Start Monitoring</a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">
            Need help? Check out our <a href="https://pingbuoy.com/faq">FAQ</a> or 
            <a href="https://pingbuoy.com/contact">contact support</a>.
        </p>`
    
    return this.getBaseHtmlTemplate(content)
  }

  private getWelcomeTextTemplate(): string {
    return `Welcome to PingBuoy!

Hi {{user_name}},

Thank you for joining PingBuoy! We're excited to help you monitor your websites and keep them running smoothly.

Getting Started:
Your account is ready to go. You can monitor up to {{max_websites}} websites with {{monitoring_interval}}-minute checks.

Next Steps:
1. Add your first website to start monitoring
2. Configure alert preferences  
3. Explore our dashboard and reporting features

Start monitoring: https://pingbuoy.com/dashboard

Need help? Check out our FAQ (https://pingbuoy.com/faq) or contact support (https://pingbuoy.com/contact).

Best regards,
The PingBuoy Team

---
PingBuoy - Keep your websites afloat
Privacy Policy: https://pingbuoy.com/privacy
Unsubscribe: https://pingbuoy.com/unsubscribe`
  }

  private getUptimeAlertHtmlTemplate(): string {
    const content = `
        <div class="alert-red">
            <h1 style="color: #dc2626; margin-top: 0;">🚨 Website Down Alert</h1>
            <p style="margin-bottom: 0; font-size: 16px;">
                <strong>{{website_name}}</strong> ({{website_url}}) appears to be down.
            </p>
        </div>
        <h3 style="color: #111827;">Alert Details:</h3>
        <ul style="color: #374151; line-height: 1.6;">
            <li><strong>Website:</strong> {{website_name}} ({{website_url}})</li>
            <li><strong>Status Code:</strong> {{status_code}}</li>
            <li><strong>Error:</strong> {{error_message}}</li>
            <li><strong>Detected At:</strong> {{alert_time}}</li>
            <li><strong>Monitoring Location:</strong> {{monitor_location}}</li>
        </ul>
        <div class="alert-blue">
            <h3 style="margin-top: 0; color: #1e3a8a;">Troubleshooting Steps</h3>
            <ol style="margin-bottom: 0;">
                <li>Check if your server is running</li>
                <li>Verify DNS settings are correct</li>
                <li>Check for any recent changes or deployments</li>
                <li>Review server logs for errors</li>
            </ol>
        </div>
        <p style="text-align: center; margin: 30px 0;">
            <a href="https://pingbuoy.com/dashboard" class="button">View Dashboard</a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">
            This alert was sent because your website failed our monitoring check. 
            You'll receive a recovery notification when your site is back online.
        </p>`
    
    return this.getBaseHtmlTemplate(content)
  }

  private getUptimeAlertTextTemplate(): string {
    return `🚨 WEBSITE DOWN ALERT - PingBuoy

Website: {{website_name}} ({{website_url}}) appears to be down.

Alert Details:
- Website: {{website_name}} ({{website_url}})
- Status Code: {{status_code}}
- Error: {{error_message}}
- Detected At: {{alert_time}}
- Monitoring Location: {{monitor_location}}

Troubleshooting Steps:
1. Check if your server is running
2. Verify DNS settings are correct  
3. Check for any recent changes or deployments
4. Review server logs for errors

View Dashboard: https://pingbuoy.com/dashboard

This alert was sent because your website failed our monitoring check. You'll receive a recovery notification when your site is back online.

---
PingBuoy - Keep your websites afloat
Privacy Policy: https://pingbuoy.com/privacy
Unsubscribe: https://pingbuoy.com/unsubscribe`
  }

  private getRecoveryAlertHtmlTemplate(): string {
    const content = `
        <div class="alert-green">
            <h1 style="color: #059669; margin-top: 0;">✅ Website Recovered!</h1>
            <p style="margin-bottom: 0; font-size: 16px;">
                Great news! <strong>{{website_name}}</strong> is back online and responding normally.
            </p>
        </div>
        <h3 style="color: #111827;">Recovery Details:</h3>
        <ul style="color: #374151; line-height: 1.6;">
            <li><strong>Website:</strong> {{website_name}} ({{website_url}})</li>
            <li><strong>Status Code:</strong> {{status_code}}</li>
            <li><strong>Response Time:</strong> {{response_time}}ms</li>
            <li><strong>Recovered At:</strong> {{recovery_time}}</li>
            <li><strong>Downtime Duration:</strong> {{downtime_duration}}</li>
        </ul>
        <div class="alert-blue">
            <h3 style="margin-top: 0; color: #1e3a8a;">What's Next?</h3>
            <p style="margin-bottom: 0;">
                Your website is being monitored continuously. Consider reviewing what caused 
                the outage to prevent future incidents.
            </p>
        </div>
        <p style="text-align: center; margin: 30px 0;">
            <a href="https://pingbuoy.com/dashboard" class="button">View Incident Report</a>
        </p>`
    
    return this.getBaseHtmlTemplate(content)
  }

  private getRecoveryAlertTextTemplate(): string {
    return `✅ WEBSITE RECOVERED - PingBuoy

Great news! {{website_name}} is back online and responding normally.

Recovery Details:
- Website: {{website_name}} ({{website_url}})
- Status Code: {{status_code}}
- Response Time: {{response_time}}ms
- Recovered At: {{recovery_time}}
- Downtime Duration: {{downtime_duration}}

Your website is being monitored continuously. Consider reviewing what caused the outage to prevent future incidents.

View Incident Report: https://pingbuoy.com/dashboard

---
PingBuoy - Keep your websites afloat
Privacy Policy: https://pingbuoy.com/privacy
Unsubscribe: https://pingbuoy.com/unsubscribe`
  }

  private getPasswordResetHtmlTemplate(): string {
    const content = `
        <h1 style="color: #111827; margin-bottom: 20px;">Reset Your Password</h1>
        <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Hi {{user_name}},
        </p>
        <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            We received a request to reset your PingBuoy account password. 
            Click the button below to create a new password.
        </p>
        <div class="alert-blue">
            <p style="margin: 0; font-size: 14px;">
                <strong>Security Notice:</strong> This link will expire in 15 minutes for your security.
            </p>
        </div>
        <p style="text-align: center; margin: 30px 0;">
            <a href="{{reset_link}}" class="button">Reset Password</a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">
            If you can't click the button, copy and paste this link into your browser:<br>
            {{reset_link}}
        </p>
        <div class="alert-red" style="margin-top: 30px;">
            <p style="margin: 0; font-size: 14px;">
                <strong>Didn't request this?</strong> If you didn't request a password reset, 
                please ignore this email. Your password will remain unchanged.
            </p>
        </div>`
    
    return this.getBaseHtmlTemplate(content)
  }

  private getPasswordResetTextTemplate(): string {
    return `Reset Your PingBuoy Password

Hi {{user_name}},

We received a request to reset your PingBuoy account password. Use the link below to create a new password:

{{reset_link}}

Security Notice: This link will expire in 15 minutes for your security.

Didn't request this? If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

---
PingBuoy - Keep your websites afloat
Privacy Policy: https://pingbuoy.com/privacy`
  }

  private getWeeklyReportHtmlTemplate(): string {
    const content = `
        <h1 style="color: #111827; margin-bottom: 20px;">Your Weekly Monitoring Report</h1>
        <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Hi {{user_name}},
        </p>
        <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Here's your weekly summary for the period {{report_period}}.
        </p>
        <div class="alert-green">
            <h3 style="margin-top: 0; color: #059669;">📊 Overall Statistics</h3>
            <ul style="margin-bottom: 0;">
                <li><strong>Total Uptime:</strong> {{overall_uptime}}%</li>
                <li><strong>Websites Monitored:</strong> {{websites_count}}</li>
                <li><strong>Total Incidents:</strong> {{incidents_count}}</li>
                <li><strong>Average Response Time:</strong> {{avg_response_time}}ms</li>
            </ul>
        </div>
        <h3 style="color: #111827;">Website Performance:</h3>
        <div style="margin-bottom: 20px;">
            {{website_stats}}
        </div>
        <div class="alert-blue">
            <h3 style="margin-top: 0; color: #1e3a8a;">💡 Recommendations</h3>
            <p style="margin-bottom: 0;">
                {{recommendations}}
            </p>
        </div>
        <p style="text-align: center; margin: 30px 0;">
            <a href="https://pingbuoy.com/dashboard" class="button">View Full Report</a>
        </p>`
    
    return this.getBaseHtmlTemplate(content)
  }

  private getWeeklyReportTextTemplate(): string {
    return `Your Weekly PingBuoy Monitoring Report

Hi {{user_name}},

Here's your weekly summary for the period {{report_period}}.

📊 Overall Statistics:
- Total Uptime: {{overall_uptime}}%
- Websites Monitored: {{websites_count}}
- Total Incidents: {{incidents_count}}  
- Average Response Time: {{avg_response_time}}ms

Website Performance:
{{website_stats}}

💡 Recommendations:
{{recommendations}}

View Full Report: https://pingbuoy.com/dashboard

---
PingBuoy - Keep your websites afloat
Privacy Policy: https://pingbuoy.com/privacy
Unsubscribe: https://pingbuoy.com/unsubscribe`
  }
}

// Convenience functions
export const getEmailTemplateEngine = () => SecureEmailTemplateEngine.getInstance()

export const renderEmailTemplate = (templateName: string, data: EmailTemplateData = {}): EmailTemplate => {
  return getEmailTemplateEngine().render(templateName, data)
}