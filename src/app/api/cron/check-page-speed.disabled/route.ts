import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    // Security check
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    // Get websites that need page speed testing
    const { data: websites } = await supabase
      .from('sites')
      .select(`
        id, name, url, user_id,
        users!inner(plan, email)
      `)
      .eq('is_active', true)

    if (!websites) {
      return NextResponse.json({ error: 'No websites found' }, { status: 404 })
    }

    console.log(`Checking page speed for ${websites.length} websites`)
    let testedCount = 0

    for (const website of websites) {
      // Check if speed test is due based on plan
      const intervalHours = website.users.plan === 'pro' ? 1 : 24
      const cutoffTime = new Date(Date.now() - intervalHours * 60 * 60 * 1000)

      // Check for recent speed tests (using uptime_logs table with speed marker)
      const { data: recentTest } = await supabase
        .from('uptime_logs')
        .select('checked_at')
        .eq('site_id', website.id)
        .eq('status', 'speed') // Use 'speed' status to mark speed tests
        .gte('checked_at', cutoffTime.toISOString())
        .limit(1)
        .single()

      if (recentTest) {
        console.log(`Skipping ${website.name} - speed tested recently`)
        continue
      }

      console.log(`Testing page speed for ${website.name}`)

      const speedResult = await checkPageSpeed(website)

      // Save speed test result using uptime_logs table with speed status
      // Format error_message with SPEED_TEST prefix for status page compatibility
      await supabase.from('uptime_logs').insert({
        site_id: website.id,
        status: 'speed',
        response_time: speedResult.loadTime,
        status_code: speedResult.performanceScore,
        error_message: `SPEED_TEST:${speedResult.performanceScore}`,
        checked_at: new Date().toISOString()
      })

      // Alert if page is slow (>5 seconds)
      if (speedResult.loadTime > 5000) {
        await sendSlowPageAlert(supabase, website, speedResult)
      }

      testedCount++

      // Delay between speed tests
      await new Promise(resolve => setTimeout(resolve, 5000))
    }

    return NextResponse.json({
      success: true,
      tested: testedCount,
      total: websites.length,
      timestamp: new Date()
    })

  } catch (error) {
    console.error('Page speed check failed:', error)
    return NextResponse.json({ error: 'Page speed monitoring failed' }, { status: 500 })
  }
}

// Simple page speed test (no Puppeteer needed - just timing)
async function checkPageSpeed(website: any) {
  const startTime = Date.now()

  try {
    const response = await fetch(website.url, {
      method: 'GET',
      signal: AbortSignal.timeout(60000), // 60 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PingBuoy/1.0; +https://pingbuoy.com)'
      }
    })

    const loadTime = Date.now() - startTime
    const contentLength = response.headers.get('content-length')
    const pageSize = contentLength ? parseInt(contentLength) : 0

    // Simple performance score based on load time
    let performanceScore = 100
    if (loadTime > 1000) performanceScore = 90
    if (loadTime > 2000) performanceScore = 75
    if (loadTime > 3000) performanceScore = 60
    if (loadTime > 5000) performanceScore = 40
    if (loadTime > 10000) performanceScore = 20

    return {
      loadTime,
      pageSize,
      performanceScore,
      statusCode: response.status
    }

  } catch (error) {
    const loadTime = Date.now() - startTime

    return {
      loadTime: loadTime > 60000 ? 60000 : loadTime, // Cap at timeout
      pageSize: 0,
      performanceScore: 0,
      statusCode: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function sendSlowPageAlert(supabase: any, website: any, speedResult: any) {
  const { data: user } = await supabase
    .from('users')
    .select('email')
    .eq('id', website.user_id)
    .single()

  if (!user) return

  const loadTime = (speedResult.loadTime / 1000).toFixed(1)
  const message = `⚠️ ${website.name} is loading slowly (${loadTime} seconds)\n\n` +
    `Performance score: ${speedResult.performanceScore}/100\n` +
    `Page size: ${speedResult.pageSize ? Math.round(speedResult.pageSize / 1024) + ' KB' : 'Unknown'}\n\n` +
    `Consider optimizing your website for better user experience:\n` +
    `• Optimize images\n` +
    `• Minimize CSS and JavaScript\n` +
    `• Use a Content Delivery Network (CDN)\n` +
    `• Enable compression`

  await sendEmail(user.email, `⚠️ ${website.name} slow loading`, message)
}

// Email sending function using Resend
async function sendEmail(to: string, subject: string, text: string) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'PingBuoy <alerts@pingbuoy.com>',
        to,
        subject,
        text
      })
    })

    if (!response.ok) {
      console.error('Email failed:', await response.text())
    }
  } catch (error) {
    console.error('Email failed:', error)
  }
}