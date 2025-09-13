import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

// Initialize DOMPurify for server-side use
const window = new JSDOM('').window
const purify = DOMPurify(window as any)

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Event validation schema
const analyticsEventSchema = z.object({
  action: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
  label: z.string().max(500).optional(),
  value: z.number().min(0).max(1000000).optional(),
  custom_parameters: z.record(z.any()).optional(),
  timestamp: z.string().datetime(),
  session_id: z.string().max(100),
  page_url: z.string().url()
})

const batchEventsSchema = z.object({
  events: z.array(analyticsEventSchema).max(100) // Limit batch size
})

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_REQUESTS = 1000 // requests per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(ip)

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (userLimit.count >= RATE_LIMIT_REQUESTS) {
    return false
  }

  userLimit.count++
  return true
}

// Get client IP
function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
         request.headers.get('x-real-ip') || 
         'unknown'
}

// Sanitize analytics data
function sanitizeAnalyticsEvent(event: any): any {
  const sanitized = {
    action: purify.sanitize(event.action, { ALLOWED_TAGS: [] }).substring(0, 100),
    category: purify.sanitize(event.category, { ALLOWED_TAGS: [] }).substring(0, 100),
    label: event.label ? purify.sanitize(event.label, { ALLOWED_TAGS: [] }).substring(0, 500) : null,
    value: typeof event.value === 'number' ? Math.max(0, Math.min(event.value, 1000000)) : null,
    timestamp: event.timestamp,
    session_id: purify.sanitize(event.session_id, { ALLOWED_TAGS: [] }).substring(0, 100),
    page_url: event.page_url,
    custom_parameters: {}
  }

  // Sanitize custom parameters
  if (event.custom_parameters && typeof event.custom_parameters === 'object') {
    for (const [key, value] of Object.entries(event.custom_parameters)) {
      if (typeof key === 'string' && key.length <= 50) {
        const cleanKey = purify.sanitize(key, { ALLOWED_TAGS: [] }).substring(0, 50)
        
        if (typeof value === 'string') {
          sanitized.custom_parameters[cleanKey] = purify.sanitize(value as string, { ALLOWED_TAGS: [] }).substring(0, 500)
        } else if (typeof value === 'number') {
          sanitized.custom_parameters[cleanKey] = Math.max(-1000000, Math.min(value as number, 1000000))
        } else if (typeof value === 'boolean') {
          sanitized.custom_parameters[cleanKey] = value
        }
      }
    }
  }

  return sanitized
}

// POST: Store analytics events
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
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
    const sanitizedEvents = validatedData.events.map(event => {
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
      const { error: dbError } = await supabase
        .from('analytics_events')
        .insert(sanitizedEvents)

      if (dbError) {
        console.error('Analytics: Database error storing events:', dbError)
        // Don't fail the request, just log the error
      }
    }

    // In production, you might also send to external analytics services
    // await sendToExternalAnalytics(sanitizedEvents)

    return NextResponse.json({
      success: true,
      processed: sanitizedEvents.length,
      message: 'Events processed successfully'
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: Retrieve analytics data (for admin/dashboard use)
export async function GET(request: NextRequest) {
  try {
    // This endpoint would be for internal use only
    // In production, add proper authentication and authorization
    
    const authHeader = request.headers.get('Authorization')
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!authHeader?.includes(serviceKey!) || !serviceKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '24h'
    const category = searchParams.get('category')
    
    // Calculate time range
    const now = new Date()
    let startTime = new Date()
    
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
      console.error('Analytics: Database error fetching events:', error)
      return NextResponse.json(
        { error: 'Failed to fetch analytics data' },
        { status: 500 }
      )
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
        const url = event.custom_parameters.page_url
        aggregated.top_pages[url] = (aggregated.top_pages[url] || 0) + 1
      }
    })

    return NextResponse.json({
      success: true,
      data: aggregated,
      events: events?.slice(0, 50) // Return only first 50 events for detailed view
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}