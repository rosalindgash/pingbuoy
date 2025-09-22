import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // For security, only allow cron jobs with the correct secret
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the plan from request body
    const body = await request.json().catch(() => ({}))
    const targetPlan = body.plan || 'all' // 'free', 'pro', or 'all'

    // Call the Supabase Edge Function for uptime monitoring
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      console.error('Missing Supabase configuration for uptime monitoring')
      return NextResponse.json({ error: 'Service configuration error' }, { status: 500 })
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/uptime-monitor`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        plan: targetPlan,
        include_page_speed: true, // Page speed monitoring for all users
        include_ssl_check: targetPlan === 'pro' || targetPlan === 'all' // SSL only for Pro
      })
    })

    if (!response.ok) {
      throw new Error(`Uptime monitor failed: ${response.status}`)
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      message: 'Uptime monitoring completed',
      data: result
    })

  } catch (error) {
    console.error('Cron uptime check failed:', error)
    return NextResponse.json(
      { error: 'Uptime monitoring failed' },
      { status: 500 }
    )
  }
}