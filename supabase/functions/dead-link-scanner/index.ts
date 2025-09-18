import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts'
import { withSecureCORS } from '../_shared/cors-config.ts'
import { createLogger, ErrorCodes } from '../_shared/logger.ts'
import { withMonitoringAuth, sendNotificationEmail } from '../_shared/service-auth.ts'

// SSRF Defense Configuration
const SSRF_CONFIG = {
  allowPrivateIPs: false,
  maxRedirects: 2,
  timeout: 10000,
  allowedPorts: [80, 443, 8080, 8443]
}

// Private IP ranges and validation functions
const PRIVATE_IP_RANGES = [
  '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '127.0.0.0/8',
  '169.254.0.0/16', '0.0.0.0/8', '224.0.0.0/4', '240.0.0.0/4'
]

const METADATA_SERVICE_IPS = ['169.254.169.254', '169.254.170.2', '100.100.100.200']

function ipInCIDR(ip: string, cidr: string): boolean {
  try {
    const [rangeIP, prefixLength] = cidr.split('/')
    const prefix = parseInt(prefixLength)

    if (ip.includes('.') && rangeIP.includes('.')) {
      const ipParts = ip.split('.').map(Number)
      const rangeParts = rangeIP.split('.').map(Number)

      let ipInt = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3]
      let rangeInt = (rangeParts[0] << 24) + (rangeParts[1] << 16) + (rangeParts[2] << 8) + rangeParts[3]

      const mask = ~(Math.pow(2, 32 - prefix) - 1)
      return (ipInt & mask) === (rangeInt & mask)
    }

    return false
  } catch {
    return false
  }
}

function isPrivateIP(ip: string): boolean {
  return PRIVATE_IP_RANGES.some(range => ipInCIDR(ip, range)) || METADATA_SERVICE_IPS.includes(ip)
}

async function validateUrl(url: string): Promise<{ isValid: boolean; reason?: string }> {
  try {
    const parsedUrl = new URL(url)

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { isValid: false, reason: 'Invalid protocol. Only HTTP and HTTPS allowed.' }
    }

    const port = parsedUrl.port ? parseInt(parsedUrl.port) : (parsedUrl.protocol === 'https:' ? 443 : 80)
    if (!SSRF_CONFIG.allowedPorts.includes(port)) {
      return { isValid: false, reason: `Port ${port} not allowed` }
    }

    const hostname = parsedUrl.hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
      return { isValid: false, reason: 'Private IP or localhost blocked' }
    }

    return { isValid: true }

  } catch (error) {
    return { isValid: false, reason: 'Invalid URL format' }
  }
}

async function safeFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const validation = await validateUrl(url)

  if (!validation.isValid) {
    throw new Error(`SSRF protection blocked request: ${validation.reason}`)
  }

  const secureOptions: RequestInit = {
    ...options,
    redirect: 'manual',
    signal: AbortSignal.timeout(SSRF_CONFIG.timeout),
    headers: {
      'User-Agent': 'PingBuoy-DeadLinkScanner/2.0 (SSRF-Protected)',
      ...options.headers
    }
  }

  let currentUrl = url
  let redirectCount = 0
  let response: Response

  while (true) {
    response = await fetch(currentUrl, secureOptions)

    if (!response.status.toString().startsWith('3')) {
      break
    }

    if (redirectCount >= SSRF_CONFIG.maxRedirects) {
      throw new Error(`Too many redirects (${redirectCount})`)
    }

    const location = response.headers.get('Location')
    if (!location) {
      throw new Error('Redirect response missing Location header')
    }

    const redirectUrl = new URL(location, currentUrl).toString()
    const redirectValidation = await validateUrl(redirectUrl)
    if (!redirectValidation.isValid) {
      throw new Error(`SSRF protection blocked redirect: ${redirectValidation.reason}`)
    }

    currentUrl = redirectUrl
    redirectCount++
  }

  return response
}

// CORS headers now handled by secure CORS configuration

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
    const response = await safeFetch(url, {
      method: 'HEAD'
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

serve(withSecureCORS(async (req) => {
  const logger = createLogger('dead-link-scanner')
  const startTime = Date.now()

  logger.requestStart(req.method)

  try {
    // Get the site ID from the request
    const { siteId } = await req.json()

    if (!siteId) {
      logger.error('Site ID missing from request', {
        errorCode: ErrorCodes.MISSING_PARAMS
      })
      logger.requestEnd(400, Date.now() - startTime)
      return new Response(
        JSON.stringify({ error: 'Site ID is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    logger.info('Dead link scan started', { siteId })

    const results = await withMonitoringAuth('dead_link_scanner', async (supabaseClient) => {
      // Get site details
      const { data: site, error: siteError } = await supabaseClient
        .from('sites')
        .select('*')
        .eq('id', siteId)
        .single()

      if (siteError || !site) {
        logger.error('Site not found', {
          siteId,
          errorCode: ErrorCodes.SITE_NOT_FOUND,
          error: siteError?.code || 'NOT_FOUND'
        })
        throw new Error('Site not found')
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
        logger.error('Failed to create scan record', {
          siteId,
          errorCode: ErrorCodes.DB_QUERY_ERROR,
          error: scanError.code || 'UNKNOWN'
        })
        throw scanError
      }

      const scanId = scan.id
      logger.info('Scan record created', { siteId, scanId })

      try {
        // Fetch the website's HTML with SSRF protection
        const response = await safeFetch(site.url)

        if (!response.ok) {
          throw new Error(`Failed to fetch website: ${response.status}`)
        }

        const html = await response.text()
        const links = await extractLinks(html, site.url)

        logger.info('Links extracted for scanning', {
          siteId,
          scanId,
          totalLinks: links.length
        })

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

        logger.info('Dead link scanning completed', {
          siteId,
          scanId,
          totalLinks: links.length,
          brokenLinks: deadLinks.length
        })

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
            logger.error('Failed to insert dead links', {
              siteId,
              scanId,
              errorCode: ErrorCodes.DB_QUERY_ERROR,
              error: insertError.code || 'UNKNOWN'
            })
          } else {
            logger.dbOperation('INSERT', 'dead_links', true, deadLinks.length)
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
          const { error: alertError } = await supabaseClient
            .from('alerts')
            .insert({
              site_id: siteId,
              type: 'dead_links',
              message: `Found ${deadLinks.length} broken links`,
            })

          if (alertError) {
            logger.error('Failed to create alert', {
              siteId,
              scanId,
              errorCode: ErrorCodes.DB_QUERY_ERROR,
              error: alertError.code || 'UNKNOWN'
            })
          } else {
            logger.alertCreated(siteId, 'dead_links', 'auto-generated')
          }
        }

        // Send email summary
        try {
          const { data: userData } = await supabaseClient
            .from('users')
            .select('email')
            .eq('id', site.user_id)
            .single()

          if (userData?.email) {
            await sendNotificationEmail('dead_links_summary', {
              userEmail: userData.email,
              siteName: site.name,
              siteUrl: site.url,
              brokenLinks: deadLinks.length,
              totalLinks: links.length
            })
            logger.emailResult('dead_links_summary', true)
          }
        } catch (emailError) {
          logger.error('Failed to send email summary', {
            siteId,
            scanId,
            errorCode: ErrorCodes.EMAIL_SEND_FAILED,
            template: 'dead_links_summary'
          })
        }

        logger.scanResult(scanId, links.length, deadLinks.length, 'completed')

        return {
          success: true,
          scanId: scan.id,
          totalLinks: links.length,
          brokenLinks: deadLinks.length,
          deadLinks: deadLinks.slice(0, 10) // Return first 10 for immediate display
        }

      } catch (error) {
        logger.error('Scan processing failed', {
          siteId,
          scanId,
          errorCode: error.message.includes('SSRF') ? ErrorCodes.SSRF_BLOCKED :
                    error.message.includes('timeout') ? ErrorCodes.TIMEOUT_ERROR :
                    ErrorCodes.SCAN_FAILED
        })

        // Update scan record as failed
        await supabaseClient
          .from('scans')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString()
          })
          .eq('id', scan.id)

        logger.scanResult(scan.id, 0, 0, 'failed')
        throw error
      }
    })

    logger.requestEnd(200, Date.now() - startTime)

    return new Response(
      JSON.stringify(results),
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    logger.error('Request failed', {
      errorCode: ErrorCodes.EXTERNAL_SERVICE_ERROR,
      duration: Date.now() - startTime
    })

    // Handle specific error cases
    if (error.message === 'Site not found') {
      logger.requestEnd(404, Date.now() - startTime)
      return new Response(
        JSON.stringify({ error: 'Site not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    logger.requestEnd(500, Date.now() - startTime)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
}))