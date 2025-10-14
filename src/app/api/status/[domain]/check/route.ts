import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'

type SiteData = {
  id: string
  name: string
  url: string
  status: string | null
  user_id: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { domain } = await params

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

    // Find the site using targeted domain queries
    const { data: sites, error: siteError } = await supabase
      .from('sites')
      .select('id, name, url, status, user_id')
      .eq('is_active', true)
      .or(possibleUrls.map(url => `url.eq.${url}`).join(',')) as { data: SiteData[] | null, error: any }

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
      .single() as { data: { checked_at: string } | null }

    if (recentCheck) {
      return NextResponse.json({
        error: 'Please wait before checking again',
        nextCheckAllowed: new Date(new Date(recentCheck.checked_at).getTime() + 60 * 1000)
      }, { status: 429 })
    }

    // Perform uptime check
    const checkResult = await performUptimeCheck(site.url)

    // Use service role client for database operations to bypass RLS
    const serviceSupabase: SupabaseClient<Database> = createServiceRoleClient()

    // Update site in database
    const { error: updateError } = await (serviceSupabase
      .from('sites') as any)
      .update({
        status: checkResult.status as 'up' | 'down' | 'unknown',
        last_checked: new Date().toISOString()
      })
      .eq('id', site.id)

    if (updateError) {
      console.error('Failed to update site:', updateError)
    }

    // Log the check
    const { error: logError } = await (serviceSupabase
      .from('uptime_logs') as any)
      .insert({
        site_id: site.id,
        status: checkResult.status as 'up' | 'down',
        response_time: checkResult.responseTime,
        status_code: checkResult.statusCode,
        checked_at: new Date().toISOString(),
        ssl_valid: checkResult.sslValid
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
  let sslValid: boolean | null = null

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

    // For HTTPS sites, successful response indicates working SSL
    if (url.startsWith('https://')) {
      sslValid = isUp
    }

    return {
      status: isUp ? 'up' : 'down',
      responseTime,
      statusCode: response.status,
      error: null,
      sslValid
    }

  } catch (error) {
    const responseTime = Date.now() - startTime

    // For HTTPS sites, connection errors usually indicate SSL issues
    if (url.startsWith('https://')) {
      sslValid = false
    }

    return {
      status: 'down' as const,
      responseTime,
      statusCode: null,
      error: error instanceof Error ? error.message : 'Connection failed',
      sslValid
    }
  }
}