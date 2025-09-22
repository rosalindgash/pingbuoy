import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a service role client for Core Web Vitals data
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { metric, value, id, url, timestamp } = body

    if (!metric || !value || !url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Only record metrics for PingBuoy's own domain
    const siteUrl = new URL(url)
    const allowedDomains = [
      'pingbuoy.com',
      'www.pingbuoy.com',
      'localhost',
      '127.0.0.1'
    ]

    const isAllowedDomain = allowedDomains.some(domain =>
      siteUrl.hostname === domain || siteUrl.hostname.endsWith(`.${domain}`)
    )

    if (!isAllowedDomain) {
      return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 })
    }

    // Insert Core Web Vitals data
    const vitalsData: any = {
      site_url: url,
      checked_at: new Date(timestamp).toISOString()
    }

    // Map metric names to database columns
    switch (metric) {
      case 'CLS':
        vitalsData.cls = value
        break
      case 'FID':
        vitalsData.fid = value
        break
      case 'FCP':
        vitalsData.fcp = value
        break
      case 'LCP':
        vitalsData.lcp = value
        break
      case 'TTFB':
        vitalsData.ttfb = value
        break
      default:
        return NextResponse.json({ error: 'Unknown metric' }, { status: 400 })
    }

    const { error } = await supabase
      .from('core_web_vitals')
      .insert(vitalsData)

    if (error) {
      console.error('Error inserting Core Web Vitals:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Core Web Vitals API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}