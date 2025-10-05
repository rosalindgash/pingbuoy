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

    // Get websites to check based on their plan intervals
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

    console.log(`Checking ${websites.length} websites`)
    let checkedCount = 0

    for (const website of websites) {
      // Skip if this website was checked too recently based on plan
      const intervalMinutes = website.users.plan === 'pro' ? 1 : 5
      const cutoffTime = new Date(Date.now() - intervalMinutes * 60 * 1000)

      const { data: recentCheck } = await supabase
        .from('uptime_logs')
        .select('checked_at')
        .eq('site_id', website.id)
        .gte('checked_at', cutoffTime.toISOString())
        .limit(1)
        .single()

      if (recentCheck) {
        console.log(`Skipping ${website.name} - checked recently`)
        continue
      }

      // Perform uptime check
      const result = await checkWebsiteUptime(website)

      // Save result
      await (supabase as any).from('uptime_logs').insert(result)

      // Update site status
      await (supabase as any)
        .from('sites')
        .update({
          status: result.status,
          last_checked: new Date().toISOString()
        })
        .eq('id', website.id)

      // Check if we need to send an alert
      if (result.status === 'down') {
        await checkAndSendAlert(supabase, website, result)
      } else {
        await clearDowntimeAlert(supabase, website)
      }

      checkedCount++

      // Small delay between checks to be respectful
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return NextResponse.json({
      success: true,
      checked: checkedCount,
      total: websites.length,
      timestamp: new Date()
    })

  } catch (error) {
    console.error('Uptime check failed:', error)
    return NextResponse.json({ error: 'Uptime monitoring failed' }, { status: 500 })
  }
}

// Custom uptime checking function
async function checkWebsiteUptime(website: any) {
  const startTime = Date.now()

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    const response = await fetch(website.url, {
      method: 'HEAD', // Faster than GET
      signal: controller.signal,
      headers: {
        'User-Agent': 'PingBuoy Monitor/1.0 (+https://pingbuoy.com)'
      }
    })

    clearTimeout(timeout)
    const responseTime = Date.now() - startTime
    const isUp = response.status < 400 // 200-399 considered "up"

    return {
      site_id: website.id,
      status: isUp ? 'up' : 'down',
      response_time: responseTime,
      status_code: response.status,
      checked_at: new Date().toISOString()
    }

  } catch (error) {
    const responseTime = Date.now() - startTime

    return {
      site_id: website.id,
      status: 'down',
      response_time: responseTime,
      status_code: null,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      checked_at: new Date().toISOString()
    }
  }
}

// Alert system functions
async function checkAndSendAlert(supabase: any, website: any, result: any) {
  // Get recent checks to see if this is a new outage
  const { data: recentChecks } = await supabase
    .from('uptime_logs')
    .select('status')
    .eq('site_id', website.id)
    .order('checked_at', { ascending: false })
    .limit(3)

  if (!recentChecks) return

  // Alert if last 2 checks were down
  const downChecks = recentChecks.filter((check: any) => check.status === 'down').length

  if (downChecks >= 2) {
    // Check if we already sent an alert recently (don't spam)
    const { data: recentAlert } = await supabase
      .from('uptime_logs')
      .select('id')
      .eq('site_id', website.id)
      .eq('status', 'down')
      .gte('checked_at', new Date(Date.now() - 60*60*1000).toISOString()) // Last hour
      .limit(5)

    if (recentAlert && recentAlert.length < 3) { // Only send if fewer than 3 alerts in past hour
      await sendDowntimeAlert(supabase, website, result)
    }
  }
}

async function sendDowntimeAlert(supabase: any, website: any, result: any) {
  const { data: user } = await supabase
    .from('users')
    .select('email, plan')
    .eq('id', website.user_id)
    .single()

  if (!user) return

  const message = `🚨 ${website.name} is DOWN!\n\n` +
    `URL: ${website.url}\n` +
    `Status: ${result.status_code ? `HTTP ${result.status_code}` : 'Connection failed'}\n` +
    `Time: ${new Date().toLocaleString()}\n\n` +
    `We'll keep monitoring and let you know when it's back up.`

  // Send email alert using Resend
  await sendEmail(user.email, `🚨 ${website.name} is DOWN`, message)
}

async function clearDowntimeAlert(supabase: any, website: any) {
  // Check if there was a recent downtime
  const { data: recentDown } = await supabase
    .from('uptime_logs')
    .select('status')
    .eq('site_id', website.id)
    .order('checked_at', { ascending: false })
    .limit(5)

  if (!recentDown) return

  const wasDown = recentDown.some((check: any) => check.status === 'down')

  if (wasDown) {
    // Send recovery email
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', website.user_id)
      .single()

    if (user) {
      const message = `✅ Good news! ${website.name} is back online.\n\nWe'll continue monitoring it 24/7.`
      await sendEmail(user.email, `✅ ${website.name} is back UP`, message)
    }
  }
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