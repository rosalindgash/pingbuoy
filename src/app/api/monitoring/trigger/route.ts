import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/upstash-rate-limit'

// Zod schema for monitoring trigger
const monitoringTriggerSchema = z.object({
  action: z.enum(['uptime', 'pagespeed', 'deadlinks']),
  siteId: z.string().uuid()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input with Zod
    const validationResult = monitoringTriggerSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { action, siteId } = validationResult.data

    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting: 10 manual monitoring triggers per hour
    const rateLimitResponse = await checkRateLimit(user.id, 'monitoringTrigger', 'manual monitoring')
    if (rateLimitResponse) {
      return rateLimitResponse
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

    // Type assertion to help TypeScript understand site is defined
    const verifiedSite = site as NonNullable<typeof site>

    let result

    switch (action) {
      case 'uptime':
        // Manual uptime check using the same logic as cron job
        result = await checkWebsiteUptime(verifiedSite)

        // Log the check
        await (supabase as any).from('uptime_logs').insert({
          site_id: verifiedSite.id,
          status: result.status,
          response_time: result.responseTime,
          status_code: result.statusCode,
          error_message: result.error,
          checked_at: new Date().toISOString(),
          ssl_valid: result.sslValid,
          ssl_checked_at: result.sslValid !== null ? new Date().toISOString() : null
        })

        // Update site status and SSL status
        const updateData: any = {
          status: result.status,
          last_checked: new Date().toISOString()
        }

        if (result.sslValid !== null) {
          updateData.ssl_status = result.sslValid
          updateData.ssl_last_checked = new Date().toISOString()
        }

        await (supabase as any)
          .from('sites')
          .update(updateData)
          .eq('id', verifiedSite.id)
        break

      case 'pagespeed':
        // Manual page speed test using simple timing
        result = await checkPageSpeed(verifiedSite)

        // Log the speed test using the database constraint workaround
        await (supabase as any).from('uptime_logs').insert({
          site_id: verifiedSite.id,
          status: 'up', // Use 'up' to satisfy constraint
          response_time: result.loadTime, // Load time in ms
          status_code: 200, // Valid HTTP status code
          error_message: `SPEED_TEST:${result.performanceScore}`, // Encode score in error message
          checked_at: new Date().toISOString()
        })
        break

      case 'deadlinks':
        // Manual dead link scan using the same logic as cron job
        const scanResult = await scanForDeadLinks(verifiedSite)

        // Log the scan
        await (supabase as any).from('uptime_logs').insert({
          site_id: verifiedSite.id,
          status: 'scan',
          response_time: scanResult.totalLinks,
          status_code: scanResult.brokenLinks.length,
          error_message: JSON.stringify(scanResult.brokenLinks.slice(0, 10)),
          checked_at: new Date().toISOString()
        })

        result = {
          type: 'deadlinks',
          totalLinks: scanResult.totalLinks,
          brokenLinks: scanResult.brokenLinks.length,
          brokenLinksList: scanResult.brokenLinks
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      site: {
        id: verifiedSite.id,
        name: verifiedSite.name,
        url: verifiedSite.url
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

// Custom uptime checking function (same as cron job)
async function checkWebsiteUptime(website: any) {
  const startTime = Date.now()
  let sslValid: boolean | null = null

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const response = await fetch(website.url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'PingBuoy Monitor/1.0 (+https://pingbuoy.com)'
      }
    })

    clearTimeout(timeout)
    const responseTime = Date.now() - startTime
    const isUp = response.status < 400

    // For HTTPS sites, successful response indicates working SSL
    if (website.url.startsWith('https://')) {
      sslValid = isUp
    }

    return {
      type: 'uptime',
      status: isUp ? 'up' : 'down',
      responseTime,
      statusCode: response.status,
      sslValid
    }

  } catch (error) {
    const responseTime = Date.now() - startTime

    // For HTTPS sites, connection errors usually indicate SSL issues
    if (website.url.startsWith('https://')) {
      sslValid = false
    }

    return {
      type: 'uptime',
      status: 'down',
      responseTime,
      statusCode: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      sslValid
    }
  }
}

// Simple page speed test (same as cron job)
async function checkPageSpeed(website: any) {
  const startTime = Date.now()

  try {
    const response = await fetch(website.url, {
      method: 'GET',
      signal: AbortSignal.timeout(60000),
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
      type: 'pagespeed',
      loadTime,
      pageSize,
      performanceScore,
      statusCode: response.status
    }

  } catch (error) {
    const loadTime = Date.now() - startTime

    return {
      type: 'pagespeed',
      loadTime: loadTime > 60000 ? 60000 : loadTime,
      pageSize: 0,
      performanceScore: 0,
      statusCode: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Dead link scanner (same as cron job)
async function scanForDeadLinks(website: any) {
  const foundLinks = new Set<string>()
  const brokenLinks: Array<{ url: string; status: number | null; error: string }> = []

  try {
    const response = await fetch(website.url, {
      method: 'GET',
      signal: AbortSignal.timeout(30000),
      headers: {
        'User-Agent': 'PingBuoy LinkBot/1.0 (+https://pingbuoy.com)'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch ${website.url}: ${response.status}`)
    }

    const html = await response.text()

    // Simple regex to find links
    const linkPattern = /href=["'](https?:\/\/[^"']+)["']/gi
    let match

    while ((match = linkPattern.exec(html)) !== null && foundLinks.size < 50) {
      const url = match[1]
      if (!foundLinks.has(url)) {
        foundLinks.add(url)
      }
    }

    // Check each link
    for (const link of foundLinks) {
      try {
        const linkResponse = await fetch(link, {
          method: 'HEAD',
          signal: AbortSignal.timeout(10000),
          headers: {
            'User-Agent': 'PingBuoy LinkBot/1.0 (+https://pingbuoy.com)'
          }
        })

        if (linkResponse.status >= 400) {
          brokenLinks.push({
            url: link,
            status: linkResponse.status,
            error: `HTTP ${linkResponse.status}`
          })
        }

      } catch (error) {
        brokenLinks.push({
          url: link,
          status: null,
          error: error instanceof Error ? error.message : 'Connection failed'
        })
      }

      // Small delay between link checks
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    return {
      totalLinks: foundLinks.size,
      brokenLinks: brokenLinks.slice(0, 20)
    }

  } catch (error) {
    console.error(`Dead link scan failed for ${website.url}:`, error)
    return { totalLinks: 0, brokenLinks: [] }
  }
}