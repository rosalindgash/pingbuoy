import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  { params }: { params: { domain: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { domain } = params

    // Decode the domain parameter
    const decodedDomain = decodeURIComponent(domain)

    // Build precise URL variations to match against
    const possibleUrls = [
      `https://${decodedDomain}`,
      `http://${decodedDomain}`,
      `https://www.${decodedDomain}`,
      `http://www.${decodedDomain}`,
      `https://${decodedDomain}/`,
      `http://${decodedDomain}/`,
      `https://www.${decodedDomain}/`,
      `http://www.${decodedDomain}/`
    ]

    // Find the site - only public status pages can be manually checked
    const { data: sites, error: siteError } = await supabase
      .from('sites')
      .select('id, name, url, status, user_id, public_status')
      .eq('is_active', true)
      .or(`public_status.eq.true,public_status.is.null`) // Handle missing field gracefully
      .or(possibleUrls.map(url => `url.eq.${url}`).join(','))

    if (siteError || !sites || sites.length === 0) {
      return NextResponse.json({ error: 'Site not found or not public' }, { status: 404 })
    }

    // Find the best matching site
    const extractDomainFromUrl = (url: string) => {
      try {
        return new URL(url).hostname.replace('www.', '')
      } catch {
        return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
      }
    }

    const site = sites.find(s => {
      const siteDomain = extractDomainFromUrl(s.url)
      return siteDomain === decodedDomain
    })

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    // Rate limiting: check if site was checked in the last minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000)
    const { data: recentCheck } = await supabase
      .from('uptime_logs')
      .select('checked_at')
      .eq('site_id', site.id)
      .gte('checked_at', oneMinuteAgo.toISOString())
      .limit(1)
      .single()

    if (recentCheck) {
      return NextResponse.json({
        error: 'Please wait before checking again',
        nextCheckAllowed: new Date(new Date(recentCheck.checked_at).getTime() + 60 * 1000)
      }, { status: 429 })
    }

    // Perform uptime check
    const checkResult = await performUptimeCheck(site.url)

    // Update site in database
    const { error: updateError } = await supabase
      .from('sites')
      .update({
        status: checkResult.status,
        last_checked: new Date().toISOString()
      })
      .eq('id', site.id)

    if (updateError) {
      console.error('Failed to update site:', updateError)
    }

    // Log the check
    const { error: logError } = await supabase
      .from('uptime_logs')
      .insert({
        site_id: site.id,
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
    console.error('Public manual check failed:', error)
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
    const timeout = setTimeout(() => controller.abort(), 15000) // 15 second timeout for manual checks

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