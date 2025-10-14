import { supabase } from './supabase'
import type { Database } from './supabase'

type UptimeLog = Database['public']['Tables']['uptime_logs']['Row']

export async function getSiteUptimeStats(siteId: string, days = 30): Promise<{ uptime: number; total: number; up: number }> {
  try {
    // Only get actual uptime checks (status 'up' or 'down'), not speed/scan checks
    const { data, error } = await supabase
      .from('uptime_logs')
      .select('status, checked_at')
      .eq('site_id', siteId)
      .in('status', ['up', 'down']) // Only include uptime checks
      .gte('checked_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('checked_at', { ascending: true })

    if (error) {
      console.error('Error fetching uptime stats:', error)
      return { uptime: 100, total: 0, up: 0 }
    }

    if (!data || data.length === 0) {
      return { uptime: 100, total: 0, up: 0 }
    }

    const total = data.length
    const up = data.filter((log: UptimeLog) => log.status === 'up').length
    const uptime = Math.round((up / total) * 100 * 100) / 100

    return { uptime, total, up }
  } catch (error) {
    console.error('Error in getSiteUptimeStats:', error)
    return { uptime: 100, total: 0, up: 0 }
  }
}

export async function getSiteRecentLogs(siteId: string, limit = 100): Promise<UptimeLog[]> {
  try {
    const { data, error } = await supabase
      .from('uptime_logs')
      .select('*')
      .eq('site_id', siteId)
      .in('status', ['up', 'down']) // Only include uptime checks
      .order('checked_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching recent logs:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getSiteRecentLogs:', error)
    return []
  }
}

// Get average response time from recent uptime checks (no page speed scores in new system)
export async function getSiteLatestPageSpeed(siteId: string): Promise<{ score: number; loadTime: number; lastChecked: string | null }> {
  try {
    // Get recent successful uptime checks to calculate average response time
    const { data, error } = await supabase
      .from('uptime_logs')
      .select('response_time, checked_at')
      .eq('site_id', siteId)
      .eq('status', 'up') // Only successful checks have valid response times
      .not('response_time', 'is', null)
      .lt('response_time', 1000) // Exclude timeout values (>= 1000ms are likely timeouts/errors)
      .gte('checked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('checked_at', { ascending: false })
      .limit(100) // Increased limit for better sample size

    if (error || !data || data.length === 0) {
      return { score: 0, loadTime: 0, lastChecked: null }
    }

    // Calculate average response time from recent checks (excluding timeout values)
    const validResponseTimes = data.filter((log: any) => log.response_time && log.response_time < 1000)

    if (validResponseTimes.length === 0) {
      return { score: 0, loadTime: 0, lastChecked: data[0]?.checked_at || null }
    }

    const avgResponseTime = Math.round(
      validResponseTimes.reduce((sum: number, log: any) => sum + (log.response_time || 0), 0) / validResponseTimes.length
    )

    return {
      score: 0, // No page speed scores in tiered monitoring system
      loadTime: avgResponseTime,
      lastChecked: data[0].checked_at
    }
  } catch (error) {
    console.error('Error in getSiteLatestPageSpeed:', error)
    return { score: 0, loadTime: 0, lastChecked: null }
  }
}

// Dead link scanning not available in tiered monitoring system
export async function getSiteLatestDeadLinks(siteId: string): Promise<{ totalLinks: number; brokenLinks: number; lastScanned: string | null }> {
  try {
    // Check if there are any dead links in the dead_links table (from previous scans)
    const { data, error } = await supabase
      .from('dead_links')
      .select('id, found_at')
      .eq('site_id', siteId)
      .eq('fixed', false)
      .order('found_at', { ascending: false })

    if (error) {
      console.error('Error fetching dead links:', error)
      return { totalLinks: 0, brokenLinks: 0, lastScanned: null }
    }

    const brokenLinks = data?.length || 0
    const lastScanned = data?.[0]?.found_at || null

    return {
      totalLinks: brokenLinks > 0 ? brokenLinks : 0, // We only know broken links, not total
      brokenLinks: brokenLinks,
      lastScanned: lastScanned
    }
  } catch (error) {
    console.error('Error in getSiteLatestDeadLinks:', error)
    return { totalLinks: 0, brokenLinks: 0, lastScanned: null }
  }
}

// Get user monitoring frequency information
export async function getUserMonitoringInfo(): Promise<{ plan: string; frequency_display: string; monitoring_frequency: string } | null> {
  try {
    // Check if supabase client is available
    if (!supabase) {
      console.error('Supabase client not available - check environment variables')
      return null
    }

    // Check authentication first
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Auth debug - getUserMonitoringInfo:', {
      hasAuthError: !!authError,
      authErrorMessage: authError?.message,
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email
    })

    if (authError || !user) {
      console.error('Authentication issue in getUserMonitoringInfo:', {
        authError: authError?.message || 'No auth error',
        hasUser: !!user,
        userId: user?.id || 'No user ID',
        userEmail: user?.email || 'No email'
      })
      return null
    }

    console.log('User authenticated successfully, attempting to fetch monitoring info...')

    const { data, error } = await supabase
      .rpc('get_current_user_monitoring_info')

    console.log('Database query result:', { data, error })

    if (error) {
      console.error('Database error in getUserMonitoringInfo:')
      console.error('Full error object:', error)
      console.error('Error properties:', {
        message: error.message || 'No message',
        details: error.details || 'No details',
        hint: error.hint || 'No hint',
        code: error.code || 'No code',
        errorType: typeof error,
        errorKeys: Object.keys(error),
        errorString: JSON.stringify(error)
      })
      return null
    }

    console.log('Successfully fetched monitoring info:', data)

    // RPC functions return arrays, so get the first result
    if (data && data.length > 0) {
      return data[0]
    }

    // Return default if no data
    console.warn('No user data found, returning default monitoring info')
    return {
      plan: 'free',
      frequency_display: '5 minutes',
      monitoring_frequency: '5 minutes'
    }
  } catch (error) {
    console.error('Exception in getUserMonitoringInfo:', error instanceof Error ? error.message : 'Unknown error', error)
    return null
  }
}

// Get next check time for a site
export async function getNextCheckTime(siteId: string): Promise<string | null> {
  try {
    // Check if supabase client is available
    if (!supabase) {
      console.error('Supabase client not available - check environment variables')
      return null
    }

    const { data, error } = await supabase
      .rpc('get_next_check_time', { site_uuid: siteId })

    if (error) {
      console.error('Error fetching next check time:')
      console.error('Error object:', error)
      console.error('Error details:', {
        message: error.message || 'No message',
        details: error.details || 'No details',
        hint: error.hint || 'No hint',
        code: error.code || 'No code',
        siteId: siteId,
        errorType: typeof error,
        errorKeys: Object.keys(error)
      })
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getNextCheckTime:', error instanceof Error ? error.message : 'Unknown error', { siteId, error })
    return null
  }
}

export async function getSiteHourlyUptimeData(siteId: string, hours = 24): Promise<Array<{
  hour: number
  percentage: number
  status: 'up' | 'down' | 'partial'
  total: number
  up: number
}>> {
  try {
    const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000)
    
    const { data: logs, error } = await supabase
      .from('uptime_logs')
      .select('status, checked_at')
      .eq('site_id', siteId)
      .in('status', ['up', 'down']) // Only include uptime checks
      .gte('checked_at', hoursAgo.toISOString())
      .order('checked_at', { ascending: true })
    
    if (error) {
      console.error('Error fetching hourly data:', error)
      return Array.from({ length: hours }, (_, i) => ({
        hour: i,
        percentage: 100,
        status: 'up' as const,
        total: 0,
        up: 0
      }))
    }
    
    if (!logs || logs.length === 0) {
      return Array.from({ length: hours }, (_, i) => ({
        hour: i,
        percentage: 100,
        status: 'up' as const,
        total: 0,
        up: 0
      }))
    }
    
    // Group logs by hour
    const hourlyData = logs.reduce((acc: Record<number, { up: number, down: number, total: number }>, log: any) => {
      const logDate = new Date(log.checked_at)
      const hourFromNow = Math.floor((Date.now() - logDate.getTime()) / (60 * 60 * 1000))
      const hourIndex = Math.max(0, Math.min(hours - 1, hourFromNow))
      
      if (!acc[hourIndex]) {
        acc[hourIndex] = { up: 0, down: 0, total: 0 }
      }
      
      if (log.status === 'up' || log.status === 'down') {
        acc[hourIndex][log.status as 'up' | 'down']++
        acc[hourIndex].total++
      }
      
      return acc
    }, {} as Record<number, { up: number, down: number, total: number }>)
    
    // Create array for last N hours
    return Array.from({ length: hours }, (_, i) => {
      const data = hourlyData[hours - 1 - i] || { up: 0, down: 0, total: 0 }
      const percentage = data.total > 0 ? (data.up / data.total) * 100 : 100
      
      return {
        hour: i,
        percentage,
        status: percentage >= 100 ? 'up' : percentage === 0 ? 'down' : 'partial',
        total: data.total,
        up: data.up
      }
    })
  } catch (error) {
    console.error('Error in getSiteHourlyUptimeData:', error)
    return Array.from({ length: hours }, (_, i) => ({
      hour: i,
      percentage: 100,
      status: 'up' as const,
      total: 0,
      up: 0
    }))
  }
}