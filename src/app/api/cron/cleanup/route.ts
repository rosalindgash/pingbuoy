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

    // Call the Supabase Edge Function for data cleanup
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      console.error('Missing Supabase configuration for cleanup')
      return NextResponse.json({ error: 'Service configuration error' }, { status: 500 })
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/cleanup_old_uptime_logs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'apikey': serviceKey
      }
    })

    if (!response.ok) {
      throw new Error(`Cleanup failed: ${response.status}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Data cleanup completed',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Cron cleanup failed:', error)
    return NextResponse.json(
      { error: 'Data cleanup failed' },
      { status: 500 }
    )
  }
}