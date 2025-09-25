import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { withSecureCORS } from '../_shared/cors-config.ts'
import { createLogger, ErrorCodes } from '../_shared/logger.ts'
import { withMonitoringAuth, sendNotificationEmail } from '../_shared/service-auth.ts'

// SSRF Defense Configuration (same as uptime monitor)
const SSRF_CONFIG = {
  allowPrivateIPs: false,
  maxRedirects: 3,
  timeout: 30000, // Longer timeout for page speed tests
  allowedPorts: [80, 443, 8080, 8443]
}

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
      'User-Agent': 'PingBuoy-PageSpeed/2.0 (SSRF-Protected)',
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

async function measurePageSpeed(url: string): Promise<{
  loadTime: number
  firstByteTime: number
  pageSize: number
  statusCode: number
}> {
  const startTime = performance.now()

  // Measure time to first byte
  const response = await safeFetch(url)
  const firstByteTime = performance.now() - startTime

  // Get the full content to measure total load time and size
  const content = await response.text()
  const totalLoadTime = performance.now() - startTime
  const pageSize = new TextEncoder().encode(content).length

  return {
    loadTime: Math.round(totalLoadTime),
    firstByteTime: Math.round(firstByteTime),
    pageSize,
    statusCode: response.status
  }
}

serve(withSecureCORS(async (req) => {
  const logger = createLogger('page-speed-monitor')
  const startTime = Date.now()

  logger.requestStart(req.method)

  try {
    const results = await withMonitoringAuth('page_speed_monitor', async (supabaseClient) => {
      // Get all active sites for page speed monitoring
      const { data: sites, error: sitesError } = await supabaseClient
        .from('sites')
        .select('id, name, url, user_id')
        .eq('is_active', true)

      if (sitesError) {
        logger.error('Failed to fetch sites', {
          errorCode: ErrorCodes.DB_QUERY_ERROR,
          error: sitesError.code || 'UNKNOWN'
        })
        throw sitesError
      }

      logger.info('Page speed monitoring started', { sitesCount: sites.length })

      const speedResults = []

      for (const site of sites) {
        try {
          const speedMetrics = await measurePageSpeed(site.url)

          // Log the speed test
          const { error: logError } = await supabaseClient
            .from('page_speed_logs')
            .insert({
              site_id: site.id,
              load_time: speedMetrics.loadTime,
              first_byte_time: speedMetrics.firstByteTime,
              page_size: speedMetrics.pageSize,
              status_code: speedMetrics.statusCode
            })

          if (logError) {
            logger.error('Failed to log page speed test', {
              siteId: site.id,
              errorCode: ErrorCodes.DB_QUERY_ERROR,
              error: logError.code || 'UNKNOWN'
            })
          }

          // Check for slow page alerts (> 5 seconds load time)
          if (speedMetrics.loadTime > 5000) {
            const { error: alertError } = await supabaseClient
              .from('alerts')
              .insert({
                site_id: site.id,
                type: 'page_speed',
                message: `Page load time is slow: ${speedMetrics.loadTime}ms (${speedMetrics.firstByteTime}ms TTFB)`
              })

            if (!alertError) {
              logger.alertCreated(site.id, 'page_speed', 'auto-generated')

              // Send email notification for slow pages
              try {
                const { data: userData } = await supabaseClient
                  .from('users')
                  .select('email')
                  .eq('id', site.user_id)
                  .single()

                if (userData?.email) {
                  await sendNotificationEmail('page_speed_alert', {
                    userEmail: userData.email,
                    siteName: site.name,
                    siteUrl: site.url,
                    loadTime: speedMetrics.loadTime,
                    firstByteTime: speedMetrics.firstByteTime
                  })
                  logger.emailResult('page_speed_alert', true)
                }
              } catch (emailError) {
                logger.error('Failed to send page speed email', {
                  siteId: site.id,
                  errorCode: ErrorCodes.EMAIL_SEND_FAILED,
                  template: 'page_speed_alert'
                })
              }
            }
          }

          speedResults.push({
            siteId: site.id,
            siteName: site.name,
            success: true,
            ...speedMetrics
          })

          logger.info('Page speed test completed', {
            siteId: site.id,
            loadTime: speedMetrics.loadTime,
            firstByteTime: speedMetrics.firstByteTime
          })

          // Add delay between tests
          await new Promise(resolve => setTimeout(resolve, 1000))

        } catch (error) {
          logger.error('Page speed test failed', {
            siteId: site.id,
            errorCode: error.message.includes('SSRF') ? ErrorCodes.SSRF_BLOCKED :
                      error.message.includes('timeout') ? ErrorCodes.TIMEOUT_ERROR :
                      ErrorCodes.NETWORK_ERROR
          })

          speedResults.push({
            siteId: site.id,
            siteName: site.name,
            success: false,
            error: error.message
          })
        }
      }

      return {
        success: true,
        totalSites: sites.length,
        completedTests: speedResults.filter(r => r.success).length,
        failedTests: speedResults.filter(r => !r.success).length,
        results: speedResults
      }
    })

    const duration = Date.now() - startTime
    logger.requestEnd(200, duration)

    return new Response(
      JSON.stringify(results),
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Page speed monitoring failed', {
      errorCode: ErrorCodes.EXTERNAL_SERVICE_ERROR,
      duration
    })
    logger.requestEnd(500, duration)

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        headers: {
          'Content-Type': 'application/json'
        },
        status: 500
      }
    )
  }
}))