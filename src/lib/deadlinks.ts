import { createServerSupabaseClient } from './supabase-server'
import { Database } from './supabase'

type DeadLink = Database['public']['Tables']['dead_links']['Row']
type Scan = Database['public']['Tables']['scans']['Row']

export async function getDeadLinks(siteId: string): Promise<DeadLink[]> {
  const supabase = await createServerSupabaseClient()
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('dead_links')
    .select('*')
    .eq('site_id', siteId)
    .order('found_at', { ascending: false })
    
  if (error) {
    console.error('Error fetching dead links:', error)
    return []
  }
  
  return data
}

export async function getScans(siteId: string): Promise<Scan[]> {
  const supabase = await createServerSupabaseClient()
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('scans')
    .select('*')
    .eq('site_id', siteId)
    .order('started_at', { ascending: false })
    .limit(10)
    
  if (error) {
    console.error('Error fetching scans:', error)
    return []
  }
  
  return data
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function startDeadLinkScan(siteId: string): Promise<any> {
  const supabase = await createServerSupabaseClient()
  
  // Check if there's already a running scan
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingScan } = await (supabase as any)
    .from('scans')
    .select('*')
    .eq('site_id', siteId)
    .eq('status', 'running')
    .single()
    
  if (existingScan) {
    throw new Error('A scan is already running for this site')
  }
  
  // Call the edge function to start the scan
  const { data, error } = await supabase.functions.invoke('dead-link-scanner', {
    body: { siteId }
  })
  
  if (error) {
    throw new Error('Failed to start scan: ' + error.message)
  }
  
  return data
}

export async function markDeadLinkFixed(deadLinkId: string, userId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  
  // First verify the user owns this dead link (through site ownership)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: deadLink } = await (supabase as any)
    .from('dead_links')
    .select(`
      *,
      sites!inner (
        user_id
      )
    `)
    .eq('id', deadLinkId)
    .single()
    
  if (!deadLink || deadLink.sites.user_id !== userId) {
    throw new Error('Dead link not found or access denied')
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('dead_links')
    .update({ fixed: true })
    .eq('id', deadLinkId)
    
  if (error) {
    throw new Error('Failed to mark as fixed: ' + error.message)
  }
}

// Sanitize CSV cells to prevent formula injection
function sanitizeCSVCell(cell: string): string {
  const cellStr = String(cell)
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r']

  // Prefix dangerous characters with single quote to prevent formula execution
  if (dangerousChars.some(char => cellStr.startsWith(char))) {
    return `'${cellStr}`
  }

  return cellStr
}

export async function exportDeadLinksCSV(siteId: string, userId: string): Promise<string> {
  const supabase = await createServerSupabaseClient()

  // Verify user owns this site
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: site } = await (supabase as any)
    .from('sites')
    .select('*')
    .eq('id', siteId)
    .eq('user_id', userId)
    .single()

  if (!site) {
    throw new Error('Site not found or access denied')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: deadLinks, error } = await (supabase as any)
    .from('dead_links')
    .select('*')
    .eq('site_id', siteId)
    .order('found_at', { ascending: false })

  if (error) {
    throw new Error('Failed to fetch dead links: ' + error.message)
  }

  // Convert to CSV
  const headers = ['URL', 'Source URL', 'Status Code', 'Found At', 'Fixed']
  const rows = deadLinks.map((link: DeadLink) => [
    sanitizeCSVCell(link.url),
    sanitizeCSVCell(link.source_url),
    sanitizeCSVCell(link.status_code.toString()),
    sanitizeCSVCell(new Date(link.found_at).toLocaleString()),
    sanitizeCSVCell(link.fixed ? 'Yes' : 'No')
  ])

  const csv = [headers, ...rows]
    .map(row => row.map((cell: string) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n')

  return csv
}