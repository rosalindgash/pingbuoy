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
    const { data, error } = await supabase
      .from('uptime_logs')
      .select('status, checked_at')
      .eq('site_id', siteId)
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
    const up = data.filter((log: any) => log.status === 'up').length
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