/**
 * Slack Notification System
 *
 * Centralized Slack webhook integration for real-time alerts across:
 * - Security violations
 * - Payment events
 * - User subscriptions
 * - Customer feedback
 * - Site monitoring
 */

export type SlackChannel =
  | 'security'    // #alerts-security
  | 'monitoring'  // #alerts-monitoring
  | 'payments'    // #alerts-payments
  | 'users'       // #alerts-users
  | 'feedback'    // #customer-feedback

interface SlackMessage {
  text: string
  blocks?: Array<{
    type: string
    text?: {
      type: string
      text: string
    }
    fields?: Array<{
      type: string
      text: string
    }>
    elements?: Array<{
      type: string
      text?: string
      url?: string
    }>
  }>
}

interface SlackNotificationOptions {
  channel: SlackChannel
  title: string
  message: string
  color?: 'good' | 'warning' | 'danger' | string
  fields?: Array<{ title: string; value: string; short?: boolean }>
  footer?: string
}

class SlackNotifier {
  private webhooks: Record<SlackChannel, string | undefined> = {
    security: process.env.SLACK_WEBHOOK_SECURITY,
    monitoring: process.env.SLACK_WEBHOOK_MONITORING,
    payments: process.env.SLACK_WEBHOOK_PAYMENTS,
    users: process.env.SLACK_WEBHOOK_USERS,
    feedback: process.env.SLACK_WEBHOOK_FEEDBACK
  }

  /**
   * Send notification to specific Slack channel
   */
  async notify(options: SlackNotificationOptions): Promise<boolean> {
    const webhookUrl = this.webhooks[options.channel]

    if (!webhookUrl) {
      console.warn(`[SLACK] Webhook not configured for channel: ${options.channel}`)
      return false
    }

    const color = this.getColorCode(options.color || 'good')

    const message: SlackMessage = {
      text: options.title,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: options.title
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: options.message
          }
        }
      ]
    }

    // Add fields if provided
    if (options.fields && options.fields.length > 0) {
      message.blocks!.push({
        type: 'section',
        fields: options.fields.map(field => ({
          type: 'mrkdwn',
          text: `*${field.title}*\n${field.value}`
        }))
      })
    }

    // Add footer if provided
    if (options.footer) {
      message.blocks!.push({
        type: 'context',
        elements: [{
          type: 'mrkdwn',
          text: options.footer
        }]
      })
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      })

      if (!response.ok) {
        console.error(`[SLACK] Failed to send notification to ${options.channel}:`, response.statusText)
        return false
      }

      return true
    } catch (error) {
      console.error(`[SLACK] Error sending notification to ${options.channel}:`, error)
      return false
    }
  }

  private getColorCode(color: string): string {
    const colorMap: Record<string, string> = {
      good: '#36a64f',
      warning: '#ff9900',
      danger: '#ff0000'
    }
    return colorMap[color] || color
  }

  // ============================================================================
  // SECURITY ALERTS
  // ============================================================================

  async notifySecurityViolation(details: {
    severity: 'critical' | 'high' | 'medium' | 'low'
    type: string
    message: string
    component?: string
  }): Promise<boolean> {
    const emoji = details.severity === 'critical' ? '🚨' : details.severity === 'high' ? '⚠️' : '⚡'

    return this.notify({
      channel: 'security',
      title: `${emoji} Security Violation Detected`,
      message: details.message,
      color: details.severity === 'critical' || details.severity === 'high' ? 'danger' : 'warning',
      fields: [
        { title: 'Severity', value: details.severity.toUpperCase(), short: true },
        { title: 'Type', value: details.type, short: true },
        ...(details.component ? [{ title: 'Component', value: details.component, short: true }] : [])
      ],
      footer: `Environment: ${process.env.NODE_ENV || 'unknown'} • ${new Date().toLocaleString()}`
    })
  }

  // ============================================================================
  // PAYMENT ALERTS
  // ============================================================================

  async notifyPaymentSuccess(details: {
    customerEmail?: string
    plan: string
    amount?: number
  }): Promise<boolean> {
    return this.notify({
      channel: 'payments',
      title: '💰 Payment Successful',
      message: 'A customer has successfully completed payment',
      color: 'good',
      fields: [
        { title: 'Plan', value: details.plan, short: true },
        ...(details.amount ? [{ title: 'Amount', value: `$${(details.amount / 100).toFixed(2)}`, short: true }] : []),
        ...(details.customerEmail ? [{ title: 'Customer', value: details.customerEmail, short: false }] : [])
      ],
      footer: new Date().toLocaleString()
    })
  }

  async notifyPaymentFailed(details: {
    customerEmail?: string
    reason?: string
  }): Promise<boolean> {
    return this.notify({
      channel: 'payments',
      title: '❌ Payment Failed',
      message: 'A customer payment has failed',
      color: 'danger',
      fields: [
        ...(details.customerEmail ? [{ title: 'Customer', value: details.customerEmail, short: false }] : []),
        ...(details.reason ? [{ title: 'Reason', value: details.reason, short: false }] : [])
      ],
      footer: new Date().toLocaleString()
    })
  }

  async notifyRefund(details: {
    customerEmail?: string
    plan: string
    amount?: number
    reason?: string
  }): Promise<boolean> {
    return this.notify({
      channel: 'payments',
      title: '🔄 Refund Processed',
      message: 'A refund has been issued',
      color: 'warning',
      fields: [
        { title: 'Plan', value: details.plan, short: true },
        ...(details.amount ? [{ title: 'Amount', value: `$${(details.amount / 100).toFixed(2)}`, short: true }] : []),
        ...(details.customerEmail ? [{ title: 'Customer', value: details.customerEmail, short: false }] : []),
        ...(details.reason ? [{ title: 'Reason', value: details.reason, short: false }] : [])
      ],
      footer: new Date().toLocaleString()
    })
  }

  // ============================================================================
  // USER ALERTS
  // ============================================================================

  async notifyNewSubscription(details: {
    email: string
    plan: string
    source?: string
  }): Promise<boolean> {
    return this.notify({
      channel: 'users',
      title: '🎉 New Subscription',
      message: 'A new user has subscribed!',
      color: 'good',
      fields: [
        { title: 'Email', value: details.email, short: false },
        { title: 'Plan', value: details.plan, short: true },
        ...(details.source ? [{ title: 'Source', value: details.source, short: true }] : [])
      ],
      footer: new Date().toLocaleString()
    })
  }

  async notifySubscriptionUpgrade(details: {
    email: string
    oldPlan: string
    newPlan: string
  }): Promise<boolean> {
    return this.notify({
      channel: 'users',
      title: '⬆️ Subscription Upgrade',
      message: 'A user has upgraded their subscription',
      color: 'good',
      fields: [
        { title: 'Email', value: details.email, short: false },
        { title: 'From', value: details.oldPlan, short: true },
        { title: 'To', value: details.newPlan, short: true }
      ],
      footer: new Date().toLocaleString()
    })
  }

  async notifySubscriptionCancellation(details: {
    email: string
    plan: string
    reason?: string
  }): Promise<boolean> {
    return this.notify({
      channel: 'users',
      title: '😔 Subscription Cancelled',
      message: 'A user has cancelled their subscription',
      color: 'warning',
      fields: [
        { title: 'Email', value: details.email, short: false },
        { title: 'Plan', value: details.plan, short: true },
        ...(details.reason ? [{ title: 'Reason', value: details.reason, short: false }] : [])
      ],
      footer: new Date().toLocaleString()
    })
  }

  // ============================================================================
  // CUSTOMER FEEDBACK
  // ============================================================================

  async notifyContactFormSubmission(details: {
    name: string
    email: string
    subject: string
    message: string
    plan?: string
  }): Promise<boolean> {
    return this.notify({
      channel: 'feedback',
      title: '📧 New Contact Form Submission',
      message: `*Subject:* ${details.subject}\n\n${details.message.substring(0, 500)}${details.message.length > 500 ? '...' : ''}`,
      color: 'good',
      fields: [
        { title: 'Name', value: details.name, short: true },
        { title: 'Email', value: details.email, short: true },
        ...(details.plan ? [{ title: 'Plan', value: details.plan, short: true }] : [])
      ],
      footer: new Date().toLocaleString()
    })
  }

  async notifyFeatureRequest(details: {
    email: string
    feature: string
    description: string
  }): Promise<boolean> {
    return this.notify({
      channel: 'feedback',
      title: '💡 Feature Request',
      message: `*Feature:* ${details.feature}\n\n${details.description}`,
      color: 'good',
      fields: [
        { title: 'Requested By', value: details.email, short: false }
      ],
      footer: new Date().toLocaleString()
    })
  }

  // ============================================================================
  // MONITORING ALERTS
  // ============================================================================

  async notifySiteDown(details: {
    siteName: string
    siteUrl: string
    userEmail?: string
    statusCode?: number
  }): Promise<boolean> {
    return this.notify({
      channel: 'monitoring',
      title: '🚨 Site Down Alert',
      message: `${details.siteName} is currently down`,
      color: 'danger',
      fields: [
        { title: 'Site', value: details.siteUrl, short: false },
        ...(details.statusCode ? [{ title: 'Status Code', value: String(details.statusCode), short: true }] : []),
        ...(details.userEmail ? [{ title: 'Owner', value: details.userEmail, short: true }] : [])
      ],
      footer: new Date().toLocaleString()
    })
  }

  async notifySiteRecovered(details: {
    siteName: string
    siteUrl: string
    downtime: string
  }): Promise<boolean> {
    return this.notify({
      channel: 'monitoring',
      title: '✅ Site Recovered',
      message: `${details.siteName} is back online`,
      color: 'good',
      fields: [
        { title: 'Site', value: details.siteUrl, short: false },
        { title: 'Downtime', value: details.downtime, short: true }
      ],
      footer: new Date().toLocaleString()
    })
  }
}

// Export singleton instance
export const slackNotifier = new SlackNotifier()

// Convenience exports
export const notifySecurityViolation = slackNotifier.notifySecurityViolation.bind(slackNotifier)
export const notifyPaymentSuccess = slackNotifier.notifyPaymentSuccess.bind(slackNotifier)
export const notifyPaymentFailed = slackNotifier.notifyPaymentFailed.bind(slackNotifier)
export const notifyNewSubscription = slackNotifier.notifyNewSubscription.bind(slackNotifier)
export const notifySubscriptionCancellation = slackNotifier.notifySubscriptionCancellation.bind(slackNotifier)
export const notifyContactFormSubmission = slackNotifier.notifyContactFormSubmission.bind(slackNotifier)
export const notifySiteDown = slackNotifier.notifySiteDown.bind(slackNotifier)
export const notifySiteRecovered = slackNotifier.notifySiteRecovered.bind(slackNotifier)
