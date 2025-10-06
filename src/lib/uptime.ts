import { createServerSupabaseClient } from './supabase-server'
import { Database } from './supabase'
import { strictSSRFDefense } from './ssrf-defense'

type Site = Database['public']['Tables']['sites']['Row']
type UptimeLog = Database['public']['Tables']['uptime_logs']['Row']

export async function getUserSites(userId: string): Promise<(Site & { uptime_logs: Pick<UptimeLog, 'status' | 'checked_at' | 'response_time'>[] })[]> {
  const supabase = await createServerSupabaseClient()
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('sites')
    .select(`
      *,
      uptime_logs (
        status,
        checked_at,
        response_time
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    
  if (error) {
    console.error('Error fetching user sites:', error)
    return []
  }
  
  return data
}

export async function addSite(userId: string, url: string, name: string, type: 'website' | 'api_endpoint' = 'website'): Promise<Site> {
  const supabase = await createServerSupabaseClient()

  // Validate URL format and security
  const validation = await strictSSRFDefense().validateUrl(url)
  if (!validation.isValid) {
    throw new Error(`URL validation failed: ${validation.reason}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('sites')
    .insert({
      user_id: userId,
      url: url.trim(),
      name: name.trim(),
      type: type
    })
    .select()
    .single()
    
  if (error) {
    throw new Error('Failed to add site: ' + error.message)
  }
  
  return data
}

export async function deleteSite(userId: string, siteId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('sites')
    .delete()
    .eq('id', siteId)
    .eq('user_id', userId) // Ensure user owns the site
    
  if (error) {
    throw new Error('Failed to delete site: ' + error.message)
  }
}

export async function getSiteUptimeStats(siteId: string, days = 30): Promise<{ uptime: number; total: number; up: number }> {
  const supabase = await createServerSupabaseClient()
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('uptime_logs')
    .select('status, checked_at')
    .eq('site_id', siteId)
    .gte('checked_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('checked_at', { ascending: true })
    
  if (error) {
    console.error('Error fetching uptime stats:', error)
    return { uptime: 100, total: 0, up: 0 }
  }
  
  if (data.length === 0) {
    return { uptime: 100, total: 0, up: 0 }
  }
  
  const total = data.length
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const up = data.filter((log: any) => log.status === 'up').length
  const uptime = Math.round((up / total) * 100 * 100) / 100
  
  return { uptime, total, up }
}

export async function getSiteRecentLogs(siteId: string, limit = 100): Promise<UptimeLog[]> {
  const supabase = await createServerSupabaseClient()
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('uptime_logs')
    .select('*')
    .eq('site_id', siteId)
    .order('checked_at', { ascending: false })
    .limit(limit)
    
  if (error) {
    console.error('Error fetching recent logs:', error)
    return []
  }
  
  return data
}