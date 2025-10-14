import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Authentication failed in ping API:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { siteId } = await params

    // Get the site details
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('*')
      .eq('id', siteId)
      .eq('user_id', user.id)
      .single()

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    // Perform uptime check using the same logic as the new cron system
    const result = await checkWebsiteUptime(site)

    const checkedAt = new Date().toISOString()

    // Log the check in uptime_logs table with consistent structure
    await (supabase as any)
      .from('uptime_logs')
      .insert({
        site_id: siteId,
        status: result.status,
        response_time: result.responseTime,
        status_code: result.statusCode,
        error_message: result.error || null,
        checked_at: checkedAt
      })

    // Update the site status in database
    await (supabase as any)
      .from('sites')
      .update({
        status: result.status,
        last_checked: checkedAt
      })
      .eq('id', siteId)

    return NextResponse.json({
      status: result.status,
      responseTime: result.responseTime,
      statusCode: result.statusCode,
      checkedAt,
      siteId
    })

  } catch (error) {
    console.error('Ping check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Use the same uptime checking function as the cron job for consistency
async function checkWebsiteUptime(website: any) {
  const startTime = Date.now()

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    const response = await fetch(website.url, {
      method: 'HEAD', // Faster than GET
      signal: controller.signal,
      headers: {
        'User-Agent': 'PingBuoy Monitor/1.0 (+https://pingbuoy.com)'
      }
    })

    clearTimeout(timeout)
    const responseTime = Date.now() - startTime
    const isUp = response.status < 400 // 200-399 considered "up"

    return {
      status: isUp ? 'up' : 'down',
      responseTime,
      statusCode: response.status
    }

  } catch (error) {
    const responseTime = Date.now() - startTime

    return {
      status: 'down',
      responseTime,
      statusCode: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}