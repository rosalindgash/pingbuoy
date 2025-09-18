import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkAndLogPerformance } from '@/lib/pagespeed'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { z } from 'zod'

const checkSchema = z.object({
  siteId: z.string().uuid(),
  strategy: z.enum(['mobile', 'desktop']).optional().default('mobile')
})

export async function POST(request: NextRequest) {
  try {
    const rawData = await request.json()
    const { siteId, strategy } = checkSchema.parse(rawData)

    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns the site and has Pro access
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, url, user_id')
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
        error: 'Core Web Vitals monitoring is a Pro feature. Upgrade to access performance monitoring.'
      }, { status: 403 })
    }

    // Apply rate limiting based on user plan
    const userPlan = userProfile?.plan || 'free'
    const rateLimitResult = checkRateLimit(user.id, userPlan, 'performance-check')

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

    // Run the performance check
    const result = await checkAndLogPerformance(siteId, site.url, user.id, strategy)

    if (!result) {
      return NextResponse.json({
        error: 'Performance check failed. Please try again later.'
      }, { status: 500 })
    }

    // Include rate limit headers in successful response
    const headers = getRateLimitHeaders(rateLimitResult)

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        lcp: result.lcp,
        fid: result.fid,
        cls: result.cls,
        fcp: result.fcp,
        ttfb: result.ttfb,
        speedIndex: result.speed_index,
        performanceScore: result.performance_score,
        hasFieldData: result.has_field_data,
        fieldLcp: result.field_lcp,
        fieldFid: result.field_fid,
        fieldCls: result.field_cls,
        strategy: result.strategy,
        checkedAt: result.checked_at
      }
    }, { headers })

  } catch (error) {
    console.error('Performance check API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}