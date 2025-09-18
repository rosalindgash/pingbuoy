import { NextRequest } from 'next/server'
import { sendUptimeAlert, sendUptimeRecoveredNotification, sendDeadLinksSummary } from '@/lib/email'
import { withServiceAuth } from '@/lib/service-auth'

export async function POST(request: NextRequest) {
  return withServiceAuth(request, 'email_sender', async () => {
    const { type, userEmail, siteName, siteUrl, statusCode, downtime, brokenLinks, totalLinks } = await request.json()

    let result

    switch (type) {
      case 'uptime_alert':
        result = await sendUptimeAlert(userEmail, siteName, siteUrl, statusCode)
        break
      case 'uptime_recovered':
        result = await sendUptimeRecoveredNotification(userEmail, siteName, siteUrl, downtime)
        break
      case 'dead_links_summary':
        result = await sendDeadLinksSummary(userEmail, siteName, siteUrl, brokenLinks, totalLinks)
        break
      default:
        throw new Error('Invalid email type')
    }

    if (result.success) {
      return { success: true, messageId: result.messageId }
    } else {
      throw new Error(result.error)
    }
  })
}