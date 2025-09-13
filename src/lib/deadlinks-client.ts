import { createBrowserClient } from '@supabase/ssr'
import { Database } from './supabase'

type DeadLink = Database['public']['Tables']['dead_links']['Row']
type Scan = Database['public']['Tables']['scans']['Row']

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey
)

export async function getDeadLinks(siteId: string): Promise<DeadLink[]> {
  try {
    const { data, error } = await supabase
      .from('dead_links')
      .select('*')
      .eq('site_id', siteId)
      .order('found_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching dead links:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error in getDeadLinks:', error)
    return []
  }
}

export async function getScans(siteId: string): Promise<Scan[]> {
  try {
    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .eq('site_id', siteId)
      .order('started_at', { ascending: false })
      .limit(10)
    
    if (error) {
      console.error('Error fetching scans:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error in getScans:', error)
    return []
  }
}

export async function startDeadLinkScan(siteId: string): Promise<any> {
  try {
    // Check if there's already a running scan
    const { data: existingScan } = await supabase
      .from('scans')
      .select('*')
      .eq('site_id', siteId)
      .eq('status', 'running')
      .single()
    
    if (existingScan) {
      throw new Error('A scan is already running for this site')
    }
    
    // Create a new scan record
    const { data: newScan, error: scanError } = await supabase
      .from('scans')
      .insert({
        site_id: siteId,
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (scanError) {
      throw new Error('Failed to start scan: ' + scanError.message)
    }
    
    // Note: In a real implementation, this would trigger an edge function
    // For now, we'll just return the scan record
    return newScan
  } catch (error) {
    console.error('Error in startDeadLinkScan:', error)
    throw error
  }
}

export async function markDeadLinkFixed(deadLinkId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('dead_links')
      .update({ fixed: true })
      .eq('id', deadLinkId)
    
    if (error) {
      throw new Error('Failed to mark as fixed: ' + error.message)
    }
  } catch (error) {
    console.error('Error in markDeadLinkFixed:', error)
    throw error
  }
}

export async function getSiteDeadLinksStats(siteId: string): Promise<{
  totalDeadLinks: number
  brokenLinks: number
  fixedLinks: number
  lastScan?: Scan
}> {
  try {
    const [deadLinks, scans] = await Promise.all([
      getDeadLinks(siteId),
      getScans(siteId)
    ])
    
    const brokenLinks = deadLinks.filter(link => !link.fixed).length
    const fixedLinks = deadLinks.filter(link => link.fixed).length
    const lastScan = scans[0] || undefined
    
    return {
      totalDeadLinks: deadLinks.length,
      brokenLinks,
      fixedLinks,
      lastScan
    }
  } catch (error) {
    console.error('Error in getSiteDeadLinksStats:', error)
    return {
      totalDeadLinks: 0,
      brokenLinks: 0,
      fixedLinks: 0
    }
  }
}

export async function exportDeadLinksCSV(siteId: string): Promise<string> {
  try {
    const deadLinks = await getDeadLinks(siteId)
    
    // Convert to CSV
    const headers = ['URL', 'Source URL', 'Status Code', 'Found At', 'Fixed']
    const rows = deadLinks.map((link: DeadLink) => [
      link.url,
      link.source_url,
      link.status_code.toString(),
      new Date(link.found_at).toLocaleString(),
      link.fixed ? 'Yes' : 'No'
    ])
    
    const csv = [headers, ...rows]
      .map(row => row.map((cell: string) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n')
    
    return csv
  } catch (error) {
    console.error('Error in exportDeadLinksCSV:', error)
    throw error
  }
}