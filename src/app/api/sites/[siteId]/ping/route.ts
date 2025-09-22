import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            // Required for SSR client
          },
          remove(name: string, options: any) {
            // Required for SSR client
          },
        },
      }
    )

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Authentication failed in ping API:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { siteId } = params

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

    // Perform a simple ping check
    const startTime = Date.now()
    let status: 'up' | 'down' = 'down'
    let responseTime = 0

    try {
      const response = await fetch(site.url, {
        method: 'GET',
        headers: {
          'User-Agent': 'PingBuoy-Monitor/1.0'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      responseTime = Date.now() - startTime
      status = response.ok ? 'up' : 'down'
    } catch (error) {
      responseTime = Date.now() - startTime
      status = 'down'
    }

    const checkedAt = new Date().toISOString()

    // Log the check in uptime_logs table
    await supabase
      .from('uptime_logs')
      .insert({
        site_id: siteId,
        status,
        response_time: responseTime,
        status_code: status === 'up' ? 200 : 0,
        checked_at: checkedAt
      })

    // Update the site status in database
    await supabase
      .from('sites')
      .update({
        status,
        last_checked: checkedAt
      })
      .eq('id', siteId)

    return NextResponse.json({
      status,
      responseTime,
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