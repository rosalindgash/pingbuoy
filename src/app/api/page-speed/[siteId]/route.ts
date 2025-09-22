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
        },
      }
    )

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { siteId } = params

    // Get the site and user details
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('*, users!inner(plan)')
      .eq('id', siteId)
      .eq('user_id', user.id)
      .single()

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    // Check if user has Pro access for page speed monitoring
    const userPlan = (site as any).users.plan
    if (userPlan === 'free') {
      return NextResponse.json({
        error: 'Page speed monitoring is a Pro feature',
        upgrade_required: true
      }, { status: 403 })
    }

    // Perform page speed check using Google PageSpeed Insights API
    const pageSpeedApiKey = process.env.GOOGLE_PAGESPEED_API_KEY
    if (!pageSpeedApiKey) {
      return NextResponse.json({ error: 'PageSpeed API not configured' }, { status: 500 })
    }

    const startTime = Date.now()

    try {
      // Check SSL certificate first
      let sslInfo = null
      try {
        const url = new URL(site.url)
        if (url.protocol === 'https:') {
          // Simple SSL check - in production you'd want a more comprehensive check
          const response = await fetch(site.url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(10000)
          })
          sslInfo = {
            valid: response.ok,
            expires_at: null // Would need certificate parsing for real expiry
          }
        }
      } catch (sslError) {
        console.log('SSL check failed:', sslError)
        sslInfo = { valid: false, expires_at: null }
      }

      // Call Google PageSpeed Insights API
      const pageSpeedUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(site.url)}&key=${pageSpeedApiKey}&strategy=mobile&category=performance`

      const pageSpeedResponse = await fetch(pageSpeedUrl, {
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })

      if (!pageSpeedResponse.ok) {
        throw new Error(`PageSpeed API error: ${pageSpeedResponse.status}`)
      }

      const pageSpeedData = await pageSpeedResponse.json()
      const loadTime = Date.now() - startTime

      // Extract key metrics
      const lighthouseResult = pageSpeedData.lighthouseResult
      const performanceScore = Math.round((lighthouseResult?.categories?.performance?.score || 0) * 100)

      // Get Core Web Vitals
      const audits = lighthouseResult?.audits || {}
      const lcp = audits['largest-contentful-paint']?.numericValue || null
      const fid = audits['max-potential-fid']?.numericValue || null
      const cls = audits['cumulative-layout-shift']?.numericValue || null

      const checkedAt = new Date().toISOString()

      // Store the results in uptime_logs with page speed data
      await supabase
        .from('uptime_logs')
        .insert({
          site_id: siteId,
          status: 'up', // If we got page speed data, site is up
          response_time: loadTime,
          status_code: 200,
          page_speed_score: performanceScore,
          load_time_ms: Math.round(lcp || loadTime),
          ssl_valid: sslInfo?.valid || null,
          ssl_expires_at: sslInfo?.expires_at || null,
          checked_at: checkedAt
        })

      // Update site status
      await supabase
        .from('sites')
        .update({
          status: 'up',
          last_checked: checkedAt
        })
        .eq('id', siteId)

      return NextResponse.json({
        success: true,
        siteId,
        pageSpeed: {
          score: performanceScore,
          loadTime: Math.round(lcp || loadTime),
          metrics: {
            lcp: lcp ? Math.round(lcp) : null,
            fid: fid ? Math.round(fid) : null,
            cls: cls ? Math.round(cls * 1000) / 1000 : null
          }
        },
        ssl: sslInfo,
        checkedAt
      })

    } catch (pageSpeedError) {
      console.error('Page speed check failed:', pageSpeedError)

      // Still log a basic uptime check
      const checkedAt = new Date().toISOString()
      await supabase
        .from('uptime_logs')
        .insert({
          site_id: siteId,
          status: 'up', // Assume up if we can't get page speed
          response_time: Date.now() - startTime,
          status_code: null,
          checked_at: checkedAt
        })

      return NextResponse.json({
        error: 'Page speed check failed',
        fallback: true,
        checkedAt
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Page speed API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}