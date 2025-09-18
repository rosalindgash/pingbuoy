import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { withMonitoringAuth, sendNotificationEmail } from '../_shared/service-auth.ts'
import { withSecureCORS } from '../_shared/cors-config.ts'
import { createLogger, ErrorCodes } from '../_shared/logger.ts'

// SSRF Defense Configuration for uptime monitoring
interface SSRFDefenseConfig {
  allowPrivateIPs: boolean
  maxRedirects: number
  timeout: number
  allowedPorts: number[]
}

const SSRF_CONFIG: SSRFDefenseConfig = {
  allowPrivateIPs: false,
  maxRedirects: 3,
  timeout: 15000,
  allowedPorts: [80, 443, 8080, 8443]
}

// Private IP ranges (CIDR format)
const PRIVATE_IP_RANGES = [
  '10.0.0.0/8',        // Private Class A
  '172.16.0.0/12',     // Private Class B
  '192.168.0.0/16',    // Private Class C
  '127.0.0.0/8',       // Loopback
  '169.254.0.0/16',    // Link-local
  '0.0.0.0/8',         // Invalid/broadcast
  '224.0.0.0/4',       // Multicast
  '240.0.0.0/4',       // Reserved
]

// Cloud metadata service IPs
const METADATA_SERVICE_IPS = [
  '169.254.169.254',   // AWS, Azure, GCP
  '169.254.170.2',     // AWS ECS
  '100.100.100.200',   // Alibaba Cloud
]

// Validate if IP is in CIDR range
function ipInCIDR(ip: string, cidr: string): boolean {
  try {
    const [rangeIP, prefixLength] = cidr.split('/')
    const prefix = parseInt(prefixLength)

    // Simple IPv4 check
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

// Check if IP is private/reserved
function isPrivateIP(ip: string): boolean {
  return PRIVATE_IP_RANGES.some(range => ipInCIDR(ip, range)) || METADATA_SERVICE_IPS.includes(ip)
}

// Validate URL against SSRF attacks
async function validateUrl(url: string): Promise<{ isValid: boolean; reason?: string; resolvedIPs?: string[] }> {
  try {
    const parsedUrl = new URL(url)

    // Basic protocol check
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { isValid: false, reason: 'Invalid protocol. Only HTTP and HTTPS allowed.' }
    }

    // Port validation
    const port = parsedUrl.port ? parseInt(parsedUrl.port) : (parsedUrl.protocol === 'https:' ? 443 : 80)
    if (!SSRF_CONFIG.allowedPorts.includes(port)) {
      return { isValid: false, reason: `Port ${port} not allowed` }
    }

    // DNS resolution check - simplified for Deno
    // In production, you'd want proper DNS resolution validation
    const hostname = parsedUrl.hostname

    // Basic hostname validation
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
      return { isValid: false, reason: 'Private IP or localhost blocked' }
    }

    return { isValid: true }

  } catch (error) {
    return { isValid: false, reason: 'Invalid URL format' }
  }
}

// Safe fetch with SSRF protection
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
      'User-Agent': 'PingBuoy-Monitor/2.0 (SSRF-Protected)',
      ...options.headers
    }
  }

  let currentUrl = url
  let redirectCount = 0
  let response: Response

  // Handle redirects manually for validation
  while (true) {
    response = await fetch(currentUrl, secureOptions)

    // If not a redirect, break
    if (!response.status.toString().startsWith('3')) {
      break
    }

    // Check redirect limit
    if (redirectCount >= SSRF_CONFIG.maxRedirects) {
      throw new Error(`Too many redirects (${redirectCount})`)
    }

    // Get redirect location
    const location = response.headers.get('Location')
    if (!location) {
      throw new Error('Redirect response missing Location header')
    }

    // Resolve relative redirects
    const redirectUrl = new URL(location, currentUrl).toString()

    // Validate redirect URL
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

serve(withSecureCORS(async (req) => {
  const logger = createLogger('uptime-monitor')
  const startTime = Date.now()

  logger.requestStart(req.method)

  try {
    const results = await withMonitoringAuth('uptime_monitor', async (supabaseClient) => {
      // Get all active sites
      const { data: sites, error: sitesError } = await supabaseClient
        .from('sites')
        .select('*')
        .eq('is_active', true)

      if (sitesError) {
        logger.error('Failed to fetch sites', {
          errorCode: ErrorCodes.DB_QUERY_ERROR,
          error: sitesError.code || 'UNKNOWN'
        })
        throw sitesError
      }

      logger.info('Monitoring check started', { sitesCount: sites.length })

    const results = []

    for (const site of sites) {
      try {
        const checkStartTime = Date.now()

        // Check site status with SSRF protection
        const response = await safeFetch(site.url, {
          method: 'HEAD'
        })

        const endTime = Date.now()
        const responseTime = endTime - checkStartTime
        const isUp = response.status >= 200 && response.status < 400

        logger.monitoringResult(site.id, isUp ? 'up' : 'down', response.status, responseTime)
        
        // Log the check
        const { error: logError } = await supabaseClient
          .from('uptime_logs')
          .insert({
            site_id: site.id,
            status: isUp ? 'up' : 'down',
            response_time: responseTime,
            status_code: response.status,
          })

        if (logError) {
          logger.error('Failed to log uptime check', {
            siteId: site.id,
            errorCode: ErrorCodes.DB_QUERY_ERROR,
            error: logError.code || 'UNKNOWN'
          })
        }

        // Update site status
        await supabaseClient
          .from('sites')
          .update({ 
            status: isUp ? 'up' : 'down',
            last_checked: new Date().toISOString()
          })
          .eq('id', site.id)

        // Check if we need to send an alert
        if (!isUp) {
          // Get the last alert for this site
          const { data: lastAlert } = await supabaseClient
            .from('alerts')
            .select('*')
            .eq('site_id', site.id)
            .eq('type', 'uptime')
            .eq('resolved', false)
            .order('sent_at', { ascending: false })
            .limit(1)
            .single()

          // Only send alert if there's no unresolved alert (to avoid spam)
          if (!lastAlert) {
            const { error: alertError } = await supabaseClient
              .from('alerts')
              .insert({
                site_id: site.id,
                type: 'uptime',
                message: `Website ${site.name} (${site.url}) is down. Status code: ${response.status}`,
              })

            if (alertError) {
              logger.error('Failed to create alert', {
                siteId: site.id,
                errorCode: ErrorCodes.DB_QUERY_ERROR,
                error: alertError.code || 'UNKNOWN'
              })
            } else {
              logger.alertCreated(site.id, 'uptime', 'auto-generated')
            }

            // Send email notification
            try {
              const { data: userData } = await supabaseClient
                .from('users')
                .select('email')
                .eq('id', site.user_id)
                .single()

              if (userData?.email) {
                await sendNotificationEmail('uptime_alert', {
                  userEmail: userData.email,
                  siteName: site.name,
                  siteUrl: site.url,
                  statusCode: response.status
                })
                logger.emailResult('uptime_alert', true)
              }
            } catch (emailError) {
              logger.error('Failed to send email notification', {
                siteId: site.id,
                errorCode: ErrorCodes.EMAIL_SEND_FAILED,
                template: 'uptime_alert'
              })
            }
          }
        } else {
          // Site is up, check if we need to send recovery notification
          const { data: unresolvedAlerts } = await supabaseClient
            .from('alerts')
            .select('*')
            .eq('site_id', site.id)
            .eq('type', 'uptime')
            .eq('resolved', false)

          if (unresolvedAlerts && unresolvedAlerts.length > 0) {
            // Calculate downtime
            const oldestAlert = unresolvedAlerts[unresolvedAlerts.length - 1]
            const downtime = new Date().getTime() - new Date(oldestAlert.sent_at).getTime()
            const downtimeMinutes = Math.round(downtime / (1000 * 60))
            const downtimeText = downtimeMinutes < 60 ? 
              `${downtimeMinutes} minutes` : 
              `${Math.round(downtimeMinutes / 60)} hours`

            // Send recovery notification
            try {
              const { data: userData } = await supabaseClient
                .from('users')
                .select('email')
                .eq('id', site.user_id)
                .single()

              if (userData?.email) {
                await sendNotificationEmail('uptime_recovered', {
                  userEmail: userData.email,
                  siteName: site.name,
                  siteUrl: site.url,
                  downtime: downtimeText
                })
                logger.emailResult('uptime_recovered', true)
              }
            } catch (emailError) {
              logger.error('Failed to send recovery email', {
                siteId: site.id,
                errorCode: ErrorCodes.EMAIL_SEND_FAILED,
                template: 'uptime_recovered'
              })
            }
          }

          // Resolve any open alerts
          await supabaseClient
            .from('alerts')
            .update({ resolved: true })
            .eq('site_id', site.id)
            .eq('type', 'uptime')
            .eq('resolved', false)
        }

        results.push({
          site_id: site.id,
          status: isUp ? 'up' : 'down',
          response_time: responseTime,
          status_code: response.status
        })

      } catch (error) {
        logger.error('Site monitoring check failed', {
          siteId: site.id,
          errorCode: error.message.includes('SSRF') ? ErrorCodes.SSRF_BLOCKED :
                    error.message.includes('timeout') ? ErrorCodes.TIMEOUT_ERROR :
                    ErrorCodes.NETWORK_ERROR
        })

        // Log the failed check
        const { error: logError } = await supabaseClient
          .from('uptime_logs')
          .insert({
            site_id: site.id,
            status: 'down',
            response_time: null,
            status_code: null,
          })

        if (logError) {
          logger.error('Failed to log monitoring check', {
            siteId: site.id,
            errorCode: ErrorCodes.DB_QUERY_ERROR,
            error: logError.code || 'UNKNOWN'
          })
        }

        // Update site status to down
        await supabaseClient
          .from('sites')
          .update({ 
            status: 'down',
            last_checked: new Date().toISOString()
          })
          .eq('id', site.id)

        results.push({
          site_id: site.id,
          status: 'down',
          error: 'MONITORING_FAILED'
        })
      }
    }

      return {
        success: true,
        checked: sites.length,
        results
      }
    })

    const duration = Date.now() - startTime
    logger.requestEnd(200, duration)

    return new Response(
      JSON.stringify(results),
      {
        headers: {
          'Content-Type': 'application/json'
        },
      },
    )

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Request failed', {
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
        status: 500,
      },
    )
  }
}))