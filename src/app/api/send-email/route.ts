import { NextRequest, NextResponse } from 'next/server'
import { sendUptimeAlert, sendUptimeRecoveredNotification, sendDeadLinksSummary } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    // Verify this request is coming from our edge functions
    const authHeader = request.headers.get('authorization')
    if (!authHeader || authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
        return NextResponse.json({ error: 'Invalid email type' }, { status: 400 })
    }

    if (result.success) {
      return NextResponse.json({ success: true, messageId: result.messageId })
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
  } catch (error: unknown) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}