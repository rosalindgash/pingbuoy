import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { pageSpeedService } from '@/lib/pagespeed'

export async function POST(request: NextRequest) {
  try {
    const { action, siteId } = await request.json()

    if (!action || !siteId) {
      return NextResponse.json({ error: 'Action and site ID are required' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns this site
    const { data: site } = await supabase
      .from('sites')
      .select('*')
      .eq('id', siteId)
      .eq('user_id', user.id)
      .single()

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    let result

    switch (action) {
      case 'uptime':
        // Manual uptime check
        const uptimeStart = Date.now()
        try {
          const response = await fetch(site.url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(15000)
          })

          const responseTime = Date.now() - uptimeStart
          const isUp = response.status >= 200 && response.status < 400

          // Log the check
          await supabase
            .from('uptime_logs')
            .insert({
              site_id: site.id,
              status: isUp ? 'up' : 'down',
              response_time: responseTime,
              status_code: response.status,
            })

          // Update site status
          await supabase
            .from('sites')
            .update({
              status: isUp ? 'up' : 'down',
              last_checked: new Date().toISOString()
            })
            .eq('id', site.id)

          result = {
            type: 'uptime',
            status: isUp ? 'up' : 'down',
            responseTime,
            statusCode: response.status
          }
        } catch (error) {
          // Log failed check
          await supabase
            .from('uptime_logs')
            .insert({
              site_id: site.id,
              status: 'down',
              response_time: null,
              status_code: null,
            })

          await supabase
            .from('sites')
            .update({
              status: 'down',
              last_checked: new Date().toISOString()
            })
            .eq('id', site.id)

          result = {
            type: 'uptime',
            status: 'down',
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
        break

      case 'performance':
        // Manual page speed check
        result = await pageSpeedService.checkAndLog(site.id, site.url, user.id, 'mobile')
        if (result) {
          result = {
            type: 'performance',
            ...result
          }
        } else {
          result = {
            type: 'performance',
            error: 'Failed to run performance check'
          }
        }
        break

      case 'deadlinks':
        // Manual dead link scan
        try {
          const scanResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/dead-link-scanner`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ siteId: site.id })
          })

          if (!scanResponse.ok) {
            throw new Error(`Scan failed: ${scanResponse.status}`)
          }

          const scanResult = await scanResponse.json()
          result = {
            type: 'deadlinks',
            ...scanResult
          }
        } catch (error) {
          result = {
            type: 'deadlinks',
            error: error instanceof Error ? error.message : 'Scan failed'
          }
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      site: {
        id: site.id,
        name: site.name,
        url: site.url
      },
      result
    })

  } catch (error) {
    console.error('Manual monitoring trigger failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}