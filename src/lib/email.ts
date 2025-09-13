import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // Use TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
})

interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export function getUptimeAlertTemplate(siteName: string, siteUrl: string, statusCode?: number): EmailTemplate {
  const subject = `🚨 Website Down: ${siteName}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Website Down Alert</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 Website Down Alert</h1>
        </div>
        <div class="content">
          <h2>Your website "${siteName}" is currently down</h2>
          <p><strong>URL:</strong> ${siteUrl}</p>
          ${statusCode ? `<p><strong>Status Code:</strong> ${statusCode}</p>` : ''}
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          
          <p>We detected that your website is not responding correctly. Please check your website and server status.</p>
          
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">
            View Dashboard
          </a>
          
          <h3>What to do next:</h3>
          <ul>
            <li>Check your hosting provider's status page</li>
            <li>Verify your server is running</li>
            <li>Check your DNS settings</li>
            <li>Contact your hosting provider if needed</li>
          </ul>
        </div>
        <div class="footer">
          <p>This alert was sent by PingBuoy - Website Monitoring</p>
          <p>If you no longer wish to receive these alerts, you can disable them in your dashboard.</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  const text = `
Website Down Alert

Your website "${siteName}" is currently down.

URL: ${siteUrl}
${statusCode ? `Status Code: ${statusCode}` : ''}
Time: ${new Date().toLocaleString()}

We detected that your website is not responding correctly. Please check your website and server status.

View Dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard

What to do next:
- Check your hosting provider's status page
- Verify your server is running
- Check your DNS settings
- Contact your hosting provider if needed

This alert was sent by PingBuoy - Website Monitoring
  `.trim()
  
  return { subject, html, text }
}

export function getUptimeRecoveredTemplate(siteName: string, siteUrl: string, downtime: string): EmailTemplate {
  const subject = `✅ Website Recovered: ${siteName}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Website Recovered</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Website Recovered</h1>
        </div>
        <div class="content">
          <h2>Your website "${siteName}" is back online!</h2>
          <p><strong>URL:</strong> ${siteUrl}</p>
          <p><strong>Downtime:</strong> ${downtime}</p>
          <p><strong>Recovered at:</strong> ${new Date().toLocaleString()}</p>
          
          <p>Great news! Your website is responding normally again. We'll continue monitoring it 24/7.</p>
          
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">
            View Dashboard
          </a>
        </div>
        <div class="footer">
          <p>This notification was sent by PingBuoy - Website Monitoring</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  const text = `
Website Recovered

Your website "${siteName}" is back online!

URL: ${siteUrl}
Downtime: ${downtime}
Recovered at: ${new Date().toLocaleString()}

Great news! Your website is responding normally again. We'll continue monitoring it 24/7.

View Dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard

This notification was sent by PingBuoy - Website Monitoring
  `.trim()
  
  return { subject, html, text }
}

export function getDeadLinksSummaryTemplate(siteName: string, siteUrl: string, brokenLinks: number, totalLinks: number): EmailTemplate {
  const subject = `🔗 Dead Link Report: ${siteName} - ${brokenLinks} issues found`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dead Link Report</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .stats { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔗 Dead Link Report</h1>
        </div>
        <div class="content">
          <h2>Dead link scan completed for "${siteName}"</h2>
          <p><strong>Website:</strong> ${siteUrl}</p>
          <p><strong>Scan completed:</strong> ${new Date().toLocaleString()}</p>
          
          <div class="stats">
            <h3>Scan Results:</h3>
            <p><strong>Total Links Scanned:</strong> ${totalLinks}</p>
            <p><strong>Broken Links Found:</strong> ${brokenLinks}</p>
            <p><strong>Success Rate:</strong> ${Math.round(((totalLinks - brokenLinks) / totalLinks) * 100)}%</p>
          </div>
          
          ${brokenLinks > 0 ? 
            `<p>We found ${brokenLinks} broken links on your website. These should be fixed to maintain a good user experience and SEO performance.</p>` :
            `<p>Excellent! No broken links were found on your website. Your site's link integrity is perfect!</p>`
          }
          
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/dead-links" class="button">
            View Detailed Report
          </a>
          
          ${brokenLinks > 0 ? `
            <h3>Next Steps:</h3>
            <ul>
              <li>Review the broken links in your dashboard</li>
              <li>Fix or remove broken links</li>
              <li>Update any outdated external references</li>
              <li>Mark links as fixed once resolved</li>
            </ul>
          ` : ''}
        </div>
        <div class="footer">
          <p>This report was sent by PingBuoy - Website Monitoring</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  const text = `
Dead Link Report

Dead link scan completed for "${siteName}"

Website: ${siteUrl}
Scan completed: ${new Date().toLocaleString()}

Scan Results:
- Total Links Scanned: ${totalLinks}
- Broken Links Found: ${brokenLinks}
- Success Rate: ${Math.round(((totalLinks - brokenLinks) / totalLinks) * 100)}%

${brokenLinks > 0 ? 
  `We found ${brokenLinks} broken links on your website. These should be fixed to maintain a good user experience and SEO performance.` :
  `Excellent! No broken links were found on your website. Your site's link integrity is perfect!`
}

View Detailed Report: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/dead-links

${brokenLinks > 0 ? `
Next Steps:
- Review the broken links in your dashboard
- Fix or remove broken links  
- Update any outdated external references
- Mark links as fixed once resolved
` : ''}

This report was sent by PingBuoy - Website Monitoring
  `.trim()
  
  return { subject, html, text }
}

export async function sendEmail(to: string, template: EmailTemplate) {
  try {
    const info = await transporter.sendMail({
      from: `"PingBuoy" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    })

    console.log('Email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function sendUptimeAlert(userEmail: string, siteName: string, siteUrl: string, statusCode?: number) {
  const template = getUptimeAlertTemplate(siteName, siteUrl, statusCode)
  return await sendEmail(userEmail, template)
}

export async function sendUptimeRecoveredNotification(userEmail: string, siteName: string, siteUrl: string, downtime: string) {
  const template = getUptimeRecoveredTemplate(siteName, siteUrl, downtime)
  return await sendEmail(userEmail, template)
}

export async function sendDeadLinksSummary(userEmail: string, siteName: string, siteUrl: string, brokenLinks: number, totalLinks: number) {
  const template = getDeadLinksSummaryTemplate(siteName, siteUrl, brokenLinks, totalLinks)
  return await sendEmail(userEmail, template)
}