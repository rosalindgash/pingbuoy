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

    // Get websites that need dead link scanning
    const { data: websites } = await (supabase as any)
      .from('sites')
      .select(`
        id, name, url, user_id,
        users!inner(plan, email)
      `)
      .eq('is_active', true)

    if (!websites) {
      return NextResponse.json({ error: 'No websites found' }, { status: 404 })
    }

    console.log(`Scanning ${websites.length} websites for dead links`)
    let scannedCount = 0

    for (const website of websites) {
      // Check if scan is due based on plan
      const intervalDays = website.users.plan === 'pro' ? 1 : 7
      const cutoffTime = new Date(Date.now() - intervalDays * 24 * 60 * 60 * 1000)

      // Check for recent scans (using uptime_logs table with a scan marker)
      const { data: recentScan } = await supabase
        .from('uptime_logs')
        .select('checked_at')
        .eq('site_id', website.id)
        .eq('status', 'scan') // Use 'scan' status to mark dead link scans
        .gte('checked_at', cutoffTime.toISOString())
        .limit(1)
        .single()

      if (recentScan) {
        console.log(`Skipping ${website.name} - scanned recently`)
        continue
      }

      console.log(`Scanning ${website.name} for dead links`)

      const scanResult = await scanForDeadLinks(website)

      // Save scan result using uptime_logs table with scan status
      await (supabase as any).from('uptime_logs').insert({
        site_id: website.id,
        status: 'scan',
        response_time: scanResult.totalLinks,
        status_code: scanResult.brokenLinks.length,
        error_message: JSON.stringify(scanResult.brokenLinks.slice(0, 10)), // Store first 10 broken links
        checked_at: new Date().toISOString()
      })

      // Send alert if dead links found
      if (scanResult.brokenLinks.length > 0) {
        await sendDeadLinkAlert(supabase, website, scanResult)
      }

      scannedCount++

      // Long delay between scans to be respectful
      await new Promise(resolve => setTimeout(resolve, 10000))
    }

    return NextResponse.json({
      success: true,
      scanned: scannedCount,
      total: websites.length,
      timestamp: new Date()
    })

  } catch (error) {
    console.error('Dead link scan failed:', error)
    return NextResponse.json({ error: 'Dead link scanning failed' }, { status: 500 })
  }
}

// Custom dead link scanner (no complex crawling)
async function scanForDeadLinks(website: any) {
  const foundLinks = new Set<string>()
  const brokenLinks: Array<{ url: string; status: number | null; error: string }> = []

  try {
    // Get homepage content
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

    // Simple regex to find links (good enough for most websites)
    const linkPattern = /href=["'](https?:\/\/[^"']+)["']/gi
    let match

    while ((match = linkPattern.exec(html)) !== null && foundLinks.size < 50) {
      const url = match[1]
      if (!foundLinks.has(url)) {
        foundLinks.add(url)
      }
    }

    console.log(`Found ${foundLinks.size} links to check for ${website.name}`)

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
      brokenLinks: brokenLinks.slice(0, 20) // Limit to first 20 broken links
    }

  } catch (error) {
    console.error(`Dead link scan failed for ${website.url}:`, error)
    return { totalLinks: 0, brokenLinks: [] }
  }
}

async function sendDeadLinkAlert(supabase: any, website: any, scanResult: any) {
  const { data: user } = await supabase
    .from('users')
    .select('email')
    .eq('id', website.user_id)
    .single()

  if (!user) return

  const message = `🔗 Found ${scanResult.brokenLinks.length} broken links on ${website.name}\n\n` +
    `Broken links:\n` +
    scanResult.brokenLinks.slice(0, 5).map((link: any) => `• ${link.url} (${link.error})`).join('\n') +
    (scanResult.brokenLinks.length > 5 ? `\n...and ${scanResult.brokenLinks.length - 5} more` : '') +
    `\n\nTotal links checked: ${scanResult.totalLinks}`

  await sendEmail(user.email, `🔗 Broken links found on ${website.name}`, message)
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