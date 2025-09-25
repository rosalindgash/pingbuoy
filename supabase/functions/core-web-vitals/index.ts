import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withSecureCORS } from '../_shared/cors-config.ts'
import { createLogger, ErrorCodes } from '../_shared/logger.ts'

// Core Web Vitals metrics interface
interface WebVitalMetric {
  metric: 'CLS' | 'INP' | 'FID' | 'FCP' | 'LCP' | 'TTFB'
  value: number
  id?: string
  url: string
  timestamp: number
}

// Validate metric value ranges
function isValidMetricValue(metric: string, value: number): boolean {
  switch (metric) {
    case 'LCP':
    case 'FCP':
    case 'TTFB':
      return value >= 0 && value <= 60000 // 0-60 seconds in ms
    case 'INP':
    case 'FID':
      return value >= 0 && value <= 5000 // 0-5 seconds in ms
    case 'CLS':
      return value >= 0 && value <= 10 // CLS is a unitless score
    default:
      return false
  }
}

serve(withSecureCORS(async (req) => {
  const logger = createLogger('core-web-vitals')
  const startTime = Date.now()

  logger.requestStart(req.method)

  // Only accept POST requests
  if (req.method !== 'POST') {
    logger.requestEnd(405, Date.now() - startTime)
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    // Validate Authorization header
    const authHeader = req.headers.get('authorization')
    const serviceJwtSecret = Deno.env.get('SERVICE_JWT_SECRET')

    if (!serviceJwtSecret) {
      logger.error('SERVICE_JWT_SECRET not configured', {
        errorCode: ErrorCodes.MISSING_CONFIG
      })
      logger.requestEnd(500, Date.now() - startTime)
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (!authHeader || authHeader !== `Bearer ${serviceJwtSecret}`) {
      logger.error('Invalid authorization', {
        errorCode: ErrorCodes.UNAUTHORIZED,
        hasAuthHeader: !!authHeader
      })
      logger.requestEnd(401, Date.now() - startTime)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    const body: WebVitalMetric = await req.json()
    const { metric, value, id, url, timestamp } = body

    // Validate required fields
    if (!metric || value === undefined || !url || !timestamp) {
      logger.error('Missing required fields', {
        errorCode: ErrorCodes.MISSING_PARAMS,
        hasMetric: !!metric,
        hasValue: value !== undefined,
        hasUrl: !!url,
        hasTimestamp: !!timestamp
      })
      logger.requestEnd(400, Date.now() - startTime)
      return new Response(
        JSON.stringify({ error: 'Missing required fields: metric, value, url, timestamp' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate metric type and value
    if (!['CLS', 'INP', 'FID', 'FCP', 'LCP', 'TTFB'].includes(metric)) {
      logger.error('Invalid metric type', {
        errorCode: ErrorCodes.INVALID_PARAMS,
        metric
      })
      logger.requestEnd(400, Date.now() - startTime)
      return new Response(
        JSON.stringify({ error: 'Invalid metric type' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (!isValidMetricValue(metric, value)) {
      logger.error('Invalid metric value', {
        errorCode: ErrorCodes.INVALID_PARAMS,
        metric,
        value
      })
      logger.requestEnd(400, Date.now() - startTime)
      return new Response(
        JSON.stringify({ error: 'Invalid metric value range' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate URL and domain
    let siteUrl: URL
    try {
      siteUrl = new URL(url)
    } catch {
      logger.error('Invalid URL format', {
        errorCode: ErrorCodes.INVALID_PARAMS,
        url
      })
      logger.requestEnd(400, Date.now() - startTime)
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Only accept metrics from allowed domains (your UI origins)
    const allowedDomains = [
      'pingbuoy.com',
      'www.pingbuoy.com',
      'localhost',
      '127.0.0.1'
    ]

    // Allow additional domains from environment
    const additionalDomains = Deno.env.get('ALLOWED_WEB_VITALS_DOMAINS')?.split(',') || []
    allowedDomains.push(...additionalDomains)

    const isAllowedDomain = allowedDomains.some(domain =>
      siteUrl.hostname === domain || siteUrl.hostname.endsWith(`.${domain}`)
    )

    if (!isAllowedDomain) {
      logger.error('Domain not allowed', {
        errorCode: ErrorCodes.FORBIDDEN,
        hostname: siteUrl.hostname
      })
      logger.requestEnd(403, Date.now() - startTime)
      return new Response(
        JSON.stringify({ error: 'Domain not allowed' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate timestamp (should be recent)
    const now = Date.now()
    const maxAge = 5 * 60 * 1000 // 5 minutes
    if (Math.abs(now - timestamp) > maxAge) {
      logger.error('Timestamp too old', {
        errorCode: ErrorCodes.INVALID_PARAMS,
        timestamp,
        now,
        age: Math.abs(now - timestamp)
      })
      logger.requestEnd(400, Date.now() - startTime)
      return new Response(
        JSON.stringify({ error: 'Timestamp too old or in future' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Prepare vitals data for insertion
    const vitalsData: any = {
      site_url: url,
      checked_at: new Date(timestamp).toISOString()
    }

    // Map metric names to database columns
    switch (metric) {
      case 'CLS':
        vitalsData.cls = value
        break
      case 'INP':
        // Store INP in fid column for compatibility (INP replaced FID)
        vitalsData.fid = value
        break
      case 'FID':
        vitalsData.fid = value
        break
      case 'FCP':
        vitalsData.fcp = value
        break
      case 'LCP':
        vitalsData.lcp = value
        break
      case 'TTFB':
        vitalsData.ttfb = value
        break
    }

    // Insert Core Web Vitals data
    const { error } = await supabase
      .from('core_web_vitals')
      .insert(vitalsData)

    if (error) {
      logger.error('Database insertion failed', {
        errorCode: ErrorCodes.DB_QUERY_ERROR,
        error: error.code || 'UNKNOWN',
        message: error.message
      })
      logger.requestEnd(500, Date.now() - startTime)
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    logger.info('Web vital recorded', {
      metric,
      value,
      hostname: siteUrl.hostname,
      timestamp: new Date(timestamp).toISOString()
    })

    logger.dbOperation('INSERT', 'core_web_vitals', true, 1)

    const duration = Date.now() - startTime
    logger.requestEnd(200, duration)

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Request failed', {
      errorCode: ErrorCodes.EXTERNAL_SERVICE_ERROR,
      duration,
      error: error.message
    })
    logger.requestEnd(500, duration)

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