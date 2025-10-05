import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withServiceAuth, serviceAuth } from '@/lib/service-auth'
import { apiLogger } from '@/lib/secure-logger'
import {
  checkDualLimit,
  checkIPLimit,
  getClientIP,
  createRateLimitResponse,
  getRateLimitHeaders,
  RATE_LIMIT_CONFIGS
} from '@/lib/redis-rate-limit'

// Server-safe sanitization without DOM dependencies
function sanitizeString(str: string, maxLength: number = 500): string {
  return str
    .replace(/<script\b[^<]*?(?:(?!<\/script>)<[^<]*?)*?<\/script>/gi, '') // eslint-disable-line security/detect-unsafe-regex
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .substring(0, maxLength)
}

// Event validation schema
const analyticsEventSchema = z.object({
  action: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
  label: z.string().max(500).optional(),
  value: z.number().min(0).max(1000000).optional(),
  custom_parameters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  timestamp: z.string().datetime(),
  session_id: z.string().max(100),
  page_url: z.string().url()
})

const batchEventsSchema = z.object({
  events: z.array(analyticsEventSchema).max(100) // Limit batch size
})

// Note: Rate limiting now handled by Redis-based system

interface AnalyticsEvent {
  action: string
  category: string
  label?: string
  value?: number
  timestamp: string
  session_id: string
  page_url: string
  custom_parameters?: Record<string, string | number | boolean>
}

interface SanitizedEvent extends AnalyticsEvent {
  ip_address: string
  user_agent: string
  processed_at: string
}

// Sanitize analytics data
function sanitizeAnalyticsEvent(event: AnalyticsEvent): AnalyticsEvent {
  const sanitized: AnalyticsEvent = {
    action: sanitizeString(event.action, 100),
    category: sanitizeString(event.category, 100),
    label: event.label ? sanitizeString(event.label, 500) : undefined,
    value: typeof event.value === 'number' ? Math.max(0, Math.min(event.value, 1000000)) : undefined,
    timestamp: event.timestamp,
    session_id: sanitizeString(event.session_id, 100),
    page_url: event.page_url,
    custom_parameters: {}
  }

  // Sanitize custom parameters
  if (event.custom_parameters && typeof event.custom_parameters === 'object') {
    for (const [key, value] of Object.entries(event.custom_parameters)) {
      if (typeof key === 'string' && key.length <= 50) {
        const cleanKey = sanitizeString(key, 50)

        if (typeof value === 'string') {
          sanitized.custom_parameters![cleanKey] = sanitizeString(value, 500) // eslint-disable-line security/detect-object-injection
        } else if (typeof value === 'number') {
          sanitized.custom_parameters![cleanKey] = Math.max(-1000000, Math.min(value, 1000000)) // eslint-disable-line security/detect-object-injection
        } else if (typeof value === 'boolean') {
          sanitized.custom_parameters![cleanKey] = value // eslint-disable-line security/detect-object-injection
        }
      }
    }
  }

  return sanitized
}

// POST: Store analytics events
export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request)

    // Check authentication to determine user plan
    const authHeader = request.headers.get('Authorization')
    let userId: string | null = null
    let userPlan: 'free' | 'pro' | 'founder' = 'free'

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const supabase = await serviceAuth.createServiceClient('analytics_collector')
        const { data: { user } } = await supabase.auth.getUser(authHeader.substring(7))
        if (user) {
          userId = user.id
          // Get user plan from user metadata or subscription table
          userPlan = (user.user_metadata?.plan as 'free' | 'pro' | 'founder') || 'free'
        }
      } catch (error) {
        // Continue as unauthenticated user
        apiLogger.warn('Analytics: Failed to authenticate user', error)
      }
    }

    // Rate limiting based on authentication status
    let rateLimitResult

    if (userId) {
      // Authenticated user - check both IP and user limits
      rateLimitResult = await checkDualLimit(
        clientIP,
        userId,
        RATE_LIMIT_CONFIGS.analytics.ip,
        RATE_LIMIT_CONFIGS.analytics[userPlan],
        'analytics'
      )
    } else {
      // Unauthenticated - only IP-based limiting
      rateLimitResult = await checkIPLimit(
        clientIP,
        RATE_LIMIT_CONFIGS.analytics.ip,
        'analytics'
      )
    }

    if (!rateLimitResult.success) {
      const relevantResult = 'ip' in rateLimitResult
        ? (rateLimitResult.ip.success ? rateLimitResult.user! : rateLimitResult.ip)
        : rateLimitResult

      return createRateLimitResponse(
        relevantResult,
        'Analytics rate limit exceeded. Please try again later.'
      )
    }

    // Parse and validate request body
    const body = await request.json()
    
    let validatedData
    try {
      validatedData = batchEventsSchema.parse(body)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid event data format' },
        { status: 400 }
      )
    }

    // Process and sanitize events
    const sanitizedEvents: SanitizedEvent[] = validatedData.events.map(event => {
      const sanitized = sanitizeAnalyticsEvent(event)
      
      // Add metadata
      return {
        ...sanitized,
        ip_address: clientIP,
        user_agent: request.headers.get('user-agent') || 'unknown',
        processed_at: new Date().toISOString()
      }
    })

    // Store events in database (if we want to keep our own analytics)
    if (process.env.STORE_ANALYTICS_EVENTS === 'true') {
      const supabase = await serviceAuth.createServiceClient('analytics_collector')

      const { error: dbError } = await supabase
        .from('analytics_events')
        .insert(sanitizedEvents)

      if (dbError) {
        apiLogger.error('Analytics: Database error storing events', dbError)
        // Don't fail the request, just log the error
      }
    }

    // In production, you might also send to external analytics services
    // await sendToExternalAnalytics(sanitizedEvents)

    const relevantRateLimit = 'ip' in rateLimitResult
      ? (rateLimitResult.ip.success ? rateLimitResult.user! : rateLimitResult.ip)
      : rateLimitResult

    return NextResponse.json({
      success: true,
      processed: sanitizedEvents.length,
      message: 'Events processed successfully'
    }, {
      headers: getRateLimitHeaders(relevantRateLimit)
    })

  } catch (error) {
    apiLogger.error('Analytics API error', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: Retrieve analytics data (for admin/dashboard use)
export async function GET(request: NextRequest) {
  return withServiceAuth(request, 'analytics_collector', async () => {

    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '24h'
    const category = searchParams.get('category')
    
    // Calculate time range
    const now = new Date()
    const startTime = new Date()
    
    switch (timeframe) {
      case '1h':
        startTime.setHours(now.getHours() - 1)
        break
      case '24h':
        startTime.setDate(now.getDate() - 1)
        break
      case '7d':
        startTime.setDate(now.getDate() - 7)
        break
      case '30d':
        startTime.setDate(now.getDate() - 30)
        break
      default:
        startTime.setDate(now.getDate() - 1)
    }

    // Query analytics data
    const supabase = await serviceAuth.createServiceClient('analytics_collector')
    let query = supabase
      .from('analytics_events')
      .select('action, category, label, value, timestamp, custom_parameters')
      .gte('processed_at', startTime.toISOString())
      .order('processed_at', { ascending: false })
      .limit(1000)

    if (category) {
      query = query.eq('category', category)
    }

    const { data: events, error } = await query

    if (error) {
      apiLogger.error('Analytics: Database error fetching events', error)
      throw new Error('Failed to fetch analytics data')
    }

    // Aggregate data for response
    const aggregated = {
      total_events: events?.length || 0,
      timeframe,
      categories: {} as Record<string, number>,
      actions: {} as Record<string, number>,
      top_pages: {} as Record<string, number>
    }

    events?.forEach(event => {
      // Count by category
      aggregated.categories[event.category] = (aggregated.categories[event.category] || 0) + 1  

      // Count by action
      aggregated.actions[event.action] = (aggregated.actions[event.action] || 0) + 1  

      // Count top pages from custom parameters
      if (event.custom_parameters?.page_url) {
        const url = String(event.custom_parameters.page_url)
        aggregated.top_pages[url] = (aggregated.top_pages[url] || 0) + 1 // eslint-disable-line security/detect-object-injection
      }
    })

    return {
      success: true,
      data: aggregated,
      events: events?.slice(0, 50) // Return only first 50 events for detailed view
    }
  })
}