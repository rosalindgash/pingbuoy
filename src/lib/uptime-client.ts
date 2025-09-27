import { createBrowserClient } from '@supabase/ssr'
import { Database } from './supabase'

type UptimeLog = Database['public']['Tables']['uptime_logs']['Row']

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey
)

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
      .order('checked_at', { ascending: false })
      .limit(10) // Last 10 successful checks

    if (error || !data || data.length === 0) {
      return { score: 0, loadTime: 0, lastChecked: null }
    }

    // Calculate average response time from recent checks
    const avgResponseTime = Math.round(
      data.reduce((sum, log) => sum + (log.response_time || 0), 0) / data.length
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
    const { data, error } = await supabase
      .from('user_monitoring_info')
      .select('plan, frequency_display, monitoring_frequency')
      .single()

    if (error) {
      console.error('Error fetching user monitoring info:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getUserMonitoringInfo:', error)
    return null
  }
}

// Get next check time for a site
export async function getNextCheckTime(siteId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_next_check_time', { site_uuid: siteId })

    if (error) {
      console.error('Error fetching next check time:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getNextCheckTime:', error)
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
    const hourlyData = logs.reduce((acc, log) => {
      const logDate = new Date(log.checked_at)
      const hourFromNow = Math.floor((Date.now() - logDate.getTime()) / (60 * 60 * 1000))
      const hourIndex = Math.max(0, Math.min(hours - 1, hourFromNow))
      
      if (!acc[hourIndex]) {
        acc[hourIndex] = { up: 0, down: 0, total: 0 }
      }
      
      if (log.status === 'up' || log.status === 'down') {
        acc[hourIndex][log.status]++
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