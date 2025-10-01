import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Check if we have any active sites and their users
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select(`
        id, url, name, user_id, ssl_status, ssl_last_checked,
        users(plan, email)
      `)
      .eq('is_active', true)
      .limit(5)

    if (sitesError) {
      return NextResponse.json({ error: 'Failed to fetch sites', details: sitesError }, { status: 500 })
    }

    if (!sites || sites.length === 0) {
      return NextResponse.json({
        message: 'No active sites found in database',
        suggestion: 'Add some test sites to see SSL monitoring in action'
      })
    }

    // Force sites to be checked by updating last_checked to be old
    await supabase
      .from('sites')
      .update({ last_checked: new Date(Date.now() - 5 * 60 * 1000).toISOString() })
      .eq('is_active', true)

    // Also ensure the user has a valid plan
    await supabase
      .from('users')
      .update({ plan: 'pro' })
      .eq('id', sites[0]?.user_id)

    // Clear rate limiting by removing recent logs
    await supabase
      .from('uptime_logs')
      .delete()
      .gte('checked_at', new Date(Date.now() - 2 * 60 * 1000).toISOString())

    // Try to call the SSL monitoring function
    const { data: functionResult, error: functionError } = await supabase
      .rpc('real_tiered_uptime_monitoring_with_ssl')

    if (functionError) {
      return NextResponse.json({
        error: 'Failed to execute monitoring function',
        details: functionError,
        sites: sites.length
      }, { status: 500 })
    }

    // Get updated site data after monitoring
    const { data: updatedSites, error: updatedSitesError } = await supabase
      .from('sites')
      .select('id, url, name, user_id, ssl_status, ssl_last_checked, status, last_checked')
      .eq('is_active', true)
      .limit(5)

    // Check recent uptime logs to see what happened
    const { data: recentLogs, error: logsError } = await supabase
      .from('uptime_logs')
      .select('site_id, status, status_code, ssl_valid, ssl_checked_at, checked_at, error_message')
      .order('checked_at', { ascending: false })
      .limit(5)

    // Check the cron job status
    const { data: cronJobs, error: cronError } = await supabase
      .from('cron.job')
      .select('jobname, schedule, command, active')
      .ilike('jobname', '%monitoring%')

    if (cronError) {
      console.log('Could not check cron jobs (expected in local dev):', cronError)
    }

    return NextResponse.json({
      message: 'SSL monitoring test completed',
      originalSites: sites,
      updatedSites: updatedSites || 'Failed to fetch updated sites',
      recentLogs: recentLogs || 'Failed to fetch logs',
      functionResult,
      cronJobs: cronJobs || 'Not accessible (local dev)',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('SSL monitoring test failed:', error)
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}