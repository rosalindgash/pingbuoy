import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { createClient } from '@/lib/supabase/server'

// Interface for Core Web Vitals data
interface CoreWebVitalsData {
  id: string
  site_url: string
  lcp: number | null
  fid: number | null // Now stores INP values for compatibility
  cls: number | null
  fcp: number | null
  ttfb: number | null
  checked_at: string
  created_at: string
}

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const authSupabase = await createClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has founder plan
    const { data: userProfile, error: profileError } = await (authSupabase as any)
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile || userProfile.plan !== 'founder') {
      return NextResponse.json(
        { error: 'Forbidden - Founder plan required' },
        { status: 403 }
      )
    }

    // Create server-side Supabase client with service role for data access
    const supabase = createServiceRoleClient()

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const siteUrl = searchParams.get('site_url')
    const hoursBack = parseInt(searchParams.get('hours_back') || '24')

    // Calculate time filter
    const timeFilter = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString()

    // Build the query
    let query = supabase
      .from('core_web_vitals')
      .select('*')
      .gte('checked_at', timeFilter)
      .order('checked_at', { ascending: false })

    // Add site URL filter if provided
    if (siteUrl) {
      query = query.eq('site_url', siteUrl)
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1)

    const { data: vitals, error } = await query

    if (error) {
      console.error('Error fetching core web vitals:', error)
      return NextResponse.json(
        { error: 'Failed to fetch core web vitals data' },
        { status: 500 }
      )
    }

    // Get summary stats
    const summaryQuery = supabase
      .from('core_web_vitals')
      .select('lcp, fid, cls, fcp, ttfb, checked_at')
      .gte('checked_at', timeFilter)

    if (siteUrl) {
      summaryQuery.eq('site_url', siteUrl)
    }

    const { data: summaryData } = await summaryQuery

    // Calculate aggregated metrics
    const summary = {
      total_records: summaryData?.length || 0,
      avg_lcp: 0,
      avg_fid: 0,
      avg_cls: 0,
      avg_fcp: 0,
      avg_ttfb: 0,
      time_range_hours: hoursBack
    }

    if (summaryData && summaryData.length > 0) {
      const validLcp = summaryData.filter((d: any) => d.lcp !== null).map((d: any) => d.lcp!)
      const validFid = summaryData.filter((d: any) => d.fid !== null).map((d: any) => d.fid!)
      const validCls = summaryData.filter((d: any) => d.cls !== null).map((d: any) => d.cls!)
      const validFcp = summaryData.filter((d: any) => d.fcp !== null).map((d: any) => d.fcp!)
      const validTtfb = summaryData.filter((d: any) => d.ttfb !== null).map((d: any) => d.ttfb!)

      summary.avg_lcp = validLcp.length > 0 ? Math.round(validLcp.reduce((a, b) => a + b, 0) / validLcp.length) : 0
      summary.avg_fid = validFid.length > 0 ? Math.round(validFid.reduce((a, b) => a + b, 0) / validFid.length) : 0
      summary.avg_cls = validCls.length > 0 ? Math.round((validCls.reduce((a, b) => a + b, 0) / validCls.length) * 1000) / 1000 : 0
      summary.avg_fcp = validFcp.length > 0 ? Math.round(validFcp.reduce((a, b) => a + b, 0) / validFcp.length) : 0
      summary.avg_ttfb = validTtfb.length > 0 ? Math.round(validTtfb.reduce((a, b) => a + b, 0) / validTtfb.length) : 0
    }

    // Get unique site URLs for filtering
    const { data: siteUrls } = await supabase
      .from('core_web_vitals')
      .select('site_url')
      .gte('checked_at', timeFilter)

    const uniqueSiteUrls = [...new Set(siteUrls?.map(s => s.site_url) || [])]

    return NextResponse.json({
      success: true,
      data: vitals || [],
      summary,
      available_sites: uniqueSiteUrls,
      pagination: {
        limit,
        offset,
        total: vitals?.length || 0
      }
    })

  } catch (error) {
    console.error('Core Web Vitals API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not supported. Use Edge Function for data ingestion.' },
    { status: 405 }
  )
}