import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSitePerformanceLogs, getSitePerformanceSummary } from '@/lib/pagespeed'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const { siteId } = params
    const { searchParams } = new URL(request.url)
    const strategy = searchParams.get('strategy') as 'mobile' | 'desktop' || 'mobile'
    const limit = parseInt(searchParams.get('limit') || '30')
    const summary = searchParams.get('summary') === 'true'

    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns the site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, name, url')
      .eq('id', siteId)
      .eq('user_id', user.id)
      .single()

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    // Check user's plan - Core Web Vitals is Pro feature only
    const { data: userProfile } = await supabase
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single()

    if (userProfile?.plan === 'free') {
      return NextResponse.json({
        error: 'Core Web Vitals monitoring is a Pro feature. Upgrade to access performance data.'
      }, { status: 403 })
    }

    // Apply rate limiting based on user plan
    const userPlan = userProfile?.plan || 'free'
    const rateLimitResult = checkRateLimit(user.id, userPlan, 'performance-data')

    if (!rateLimitResult.success) {
      const headers = getRateLimitHeaders(rateLimitResult)
      return NextResponse.json({
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: rateLimitResult.retryAfter
      }, {
        status: 429,
        headers
      })
    }

    if (summary) {
      // Return performance summary
      const summaryData = await getSitePerformanceSummary(siteId, strategy)

      const headers = getRateLimitHeaders(rateLimitResult)
      return NextResponse.json({
        success: true,
        data: {
          site: {
            id: site.id,
            name: site.name,
            url: site.url
          },
          strategy,
          summary: summaryData
        }
      }, { headers })
    } else {
      // Return performance history
      const logs = await getSitePerformanceLogs(siteId, limit, strategy)

      const headers = getRateLimitHeaders(rateLimitResult)
      return NextResponse.json({
        success: true,
        data: {
          site: {
            id: site.id,
            name: site.name,
            url: site.url
          },
          strategy,
          logs: logs.map(log => ({
            id: log.id,
            lcp: log.lcp,
            fid: log.fid,
            cls: log.cls,
            fcp: log.fcp,
            ttfb: log.ttfb,
            speedIndex: log.speed_index,
            performanceScore: log.performance_score,
            hasFieldData: log.has_field_data,
            fieldLcp: log.field_lcp,
            fieldFid: log.field_fid,
            fieldCls: log.field_cls,
            status: log.status,
            checkedAt: log.checked_at
          }))
        }
      }, { headers })
    }

  } catch (error) {
    console.error('Performance history API error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}