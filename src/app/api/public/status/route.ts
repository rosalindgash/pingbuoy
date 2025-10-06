import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { siteId } = await params

    // Verify user owns this site
    const { data: site, error: siteError } = await (supabase as any)
      .from('sites')
      .select('*')
      .eq('id', siteId)
      .eq('user_id', user.id)
      .single()

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    // Perform uptime check
    const checkResult = await performUptimeCheck(site.url)

    // Update site in database
    const { error: updateError } = await (supabase as any)
      .from('sites')
      .update({
        status: checkResult.status,
        last_checked: new Date().toISOString()
      })
      .eq('id', siteId)

    if (updateError) {
      console.error('Failed to update site:', updateError)
    }

    // Log the check
    const { error: logError } = await (supabase as any)
      .from('uptime_logs')
      .insert({
        site_id: siteId,
        status: checkResult.status,
        response_time: checkResult.responseTime,
        status_code: checkResult.statusCode,
        error_message: checkResult.error || null,
        checked_at: new Date().toISOString()
      })

    if (logError) {
      console.error('Failed to log check:', logError)
    }

    return NextResponse.json({
      success: true,
      site: {
        id: site.id,
        name: site.name,
        url: site.url,
        status: checkResult.status,
        last_checked: new Date().toISOString()
      },
      result: checkResult
    })

  } catch (error) {
    console.error('Manual check failed:', error)
    return NextResponse.json(
      { error: 'Check failed' },
      { status: 500 }
    )
  }
}

async function performUptimeCheck(url: string) {
  const startTime = Date.now()

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'PingBuoy Monitor/1.0 (+https://pingbuoy.com)'
      }
    })

    clearTimeout(timeout)
    const responseTime = Date.now() - startTime
    const isUp = response.status >= 200 && response.status < 400

    return {
      status: isUp ? 'up' : 'down',
      responseTime,
      statusCode: response.status,
      error: null
    }

  } catch (error) {
    const responseTime = Date.now() - startTime

    return {
      status: 'down' as const,
      responseTime,
      statusCode: null,
      error: error instanceof Error ? error.message : 'Connection failed'
    }
  }
}