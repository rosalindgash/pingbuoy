import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGINS') || 'https://your-production-domain.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface DeadLink {
  url: string
  sourceUrl: string
  statusCode: number
}

async function extractLinks(html: string, baseUrl: string): Promise<string[]> {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  if (!doc) return []

  const links = doc.querySelectorAll('a[href]')
  const urls = new Set<string>()
  
  for (const link of links) {
    const href = link.getAttribute('href')
    if (!href) continue
    
    try {
      // Convert relative URLs to absolute URLs
      const absoluteUrl = new URL(href, baseUrl).href
      
      // Only check HTTP/HTTPS URLs
      if (absoluteUrl.startsWith('http://') || absoluteUrl.startsWith('https://')) {
        urls.add(absoluteUrl)
      }
    } catch {
      // Invalid URL, skip it
      continue
    }
  }
  
  return Array.from(urls)
}

async function checkLink(url: string): Promise<{ url: string, status: number, ok: boolean }> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'PingBuoy-DeadLinkScanner/1.0'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })
    
    return {
      url,
      status: response.status,
      ok: response.ok
    }
  } catch (error) {
    return {
      url,
      status: 0,
      ok: false
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get the site ID from the request
    const { siteId } = await req.json()
    
    if (!siteId) {
      return new Response(
        JSON.stringify({ error: 'Site ID is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get site details
    const { data: site, error: siteError } = await supabaseClient
      .from('sites')
      .select('*')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return new Response(
        JSON.stringify({ error: 'Site not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create a new scan record
    const { data: scan, error: scanError } = await supabaseClient
      .from('scans')
      .insert({
        site_id: siteId,
        status: 'running'
      })
      .select()
      .single()

    if (scanError) {
      throw scanError
    }

    try {
      // Fetch the website's HTML
      const response = await fetch(site.url, {
        headers: {
          'User-Agent': 'PingBuoy-DeadLinkScanner/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch website: ${response.status}`)
      }

      const html = await response.text()
      const links = await extractLinks(html, site.url)

      console.log(`Found ${links.length} links to check for site ${site.url}`)

      // Clear previous dead links for this site
      await supabaseClient
        .from('dead_links')
        .delete()
        .eq('site_id', siteId)

      const deadLinks: DeadLink[] = []
      const batchSize = 10
      
      // Check links in batches to avoid overwhelming the target sites
      for (let i = 0; i < links.length; i += batchSize) {
        const batch = links.slice(i, i + batchSize)
        const promises = batch.map(link => checkLink(link))
        const results = await Promise.all(promises)
        
        for (const result of results) {
          if (!result.ok && result.status !== 999) { // 999 is often used for rate limiting
            deadLinks.push({
              url: result.url,
              sourceUrl: site.url,
              statusCode: result.status
            })
          }
        }
        
        // Small delay between batches
        if (i + batchSize < links.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      console.log(`Found ${deadLinks.length} dead links`)

      // Insert dead links into database
      if (deadLinks.length > 0) {
        const { error: insertError } = await supabaseClient
          .from('dead_links')
          .insert(
            deadLinks.map(link => ({
              site_id: siteId,
              url: link.url,
              source_url: link.sourceUrl,
              status_code: link.statusCode
            }))
          )

        if (insertError) {
          console.error('Error inserting dead links:', insertError)
        }
      }

      // Update scan record
      await supabaseClient
        .from('scans')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          total_links: links.length,
          broken_links: deadLinks.length
        })
        .eq('id', scan.id)

      // Create alert if dead links found
      if (deadLinks.length > 0) {
        await supabaseClient
          .from('alerts')
          .insert({
            site_id: siteId,
            type: 'dead_links',
            message: `Found ${deadLinks.length} broken links on ${site.name}`,
          })
      }

      // Send email summary
      try {
        const { data: userData } = await supabaseClient
          .from('users')
          .select('email')
          .eq('id', site.user_id)
          .single()

        if (userData?.email) {
          await fetch(`${Deno.env.get('APP_URL')}/api/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
              type: 'dead_links_summary',
              userEmail: userData.email,
              siteName: site.name,
              siteUrl: site.url,
              brokenLinks: deadLinks.length,
              totalLinks: links.length
            })
          })
        }
      } catch (emailError) {
        console.error('Error sending email summary:', emailError)
      }

      return new Response(
        JSON.stringify({
          success: true,
          scanId: scan.id,
          totalLinks: links.length,
          brokenLinks: deadLinks.length,
          deadLinks: deadLinks.slice(0, 10) // Return first 10 for immediate display
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      )

    } catch (error) {
      // Update scan record as failed
      await supabaseClient
        .from('scans')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString()
        })
        .eq('id', scan.id)

      throw error
    }

  } catch (error) {
    console.error('Dead link scanner error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})