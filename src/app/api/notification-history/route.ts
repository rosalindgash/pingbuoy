import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Query parameters schema
const querySchema = z.object({
  page: z.string().transform(val => parseInt(val)).default('1'),
  limit: z.string().transform(val => Math.min(parseInt(val), 100)).default('20'),
  notification_type: z.enum(['email', 'sms', 'webhook', 'slack', 'discord']).optional(),
  alert_type: z.enum(['downtime', 'recovery', 'maintenance', 'report']).optional(),
  status: z.enum(['sent', 'failed', 'queued', 'delivered']).optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional()
})

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_REQUESTS = 200 // requests per hour
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

// Authenticate user
async function authenticateUser(request: NextRequest): Promise<{ user: any; error?: string }> {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return { user: null, error: 'Missing or invalid authorization header' }
    }

    const token = authHeader.substring(7)
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return { user: null, error: 'Invalid or expired token' }
    }

    return { user }
  } catch (error) {
    return { user: null, error: 'Authentication failed' }
  }
}

// GET: Retrieve user's notification history with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    // Authentication
    const { user, error: authError } = await authenticateUser(request)
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams)
    
    let parsedQuery
    try {
      parsedQuery = querySchema.parse(queryParams)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      )
    }

    // Build query
    let query = supabase
      .from('notification_history')
      .select(`
        id,
        website_id,
        notification_type,
        alert_type,
        status,
        recipient,
        subject,
        message_preview,
        error_message,
        sent_at,
        delivered_at,
        created_at
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })

    // Apply filters
    if (parsedQuery.notification_type) {
      query = query.eq('notification_type', parsedQuery.notification_type)
    }

    if (parsedQuery.alert_type) {
      query = query.eq('alert_type', parsedQuery.alert_type)
    }

    if (parsedQuery.status) {
      query = query.eq('status', parsedQuery.status)
    }

    if (parsedQuery.from_date) {
      query = query.gte('sent_at', parsedQuery.from_date)
    }

    if (parsedQuery.to_date) {
      query = query.lte('sent_at', parsedQuery.to_date)
    }

    // Apply pagination
    const offset = (parsedQuery.page - 1) * parsedQuery.limit
    query = query.range(offset, offset + parsedQuery.limit - 1)

    const { data: history, error: dbError, count } = await query

    if (dbError) {
      console.error('Database error fetching notification history:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch notification history' },
        { status: 500 }
      )
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / parsedQuery.limit)
    const hasNextPage = parsedQuery.page < totalPages
    const hasPrevPage = parsedQuery.page > 1

    return NextResponse.json({
      history: history || [],
      pagination: {
        page: parsedQuery.page,
        limit: parsedQuery.limit,
        total: count || 0,
        totalPages,
        hasNextPage,
        hasPrevPage
      },
      filters: {
        notification_type: parsedQuery.notification_type,
        alert_type: parsedQuery.alert_type,
        status: parsedQuery.status,
        from_date: parsedQuery.from_date,
        to_date: parsedQuery.to_date
      }
    })

  } catch (error) {
    console.error('Error in GET /api/notification-history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Create notification history entry (system use only)
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

    // Check for service role authorization (only system can create history entries)
    const authHeader = request.headers.get('Authorization')
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!authHeader?.includes(serviceKey!) || !serviceKey) {
      return NextResponse.json(
        { error: 'Unauthorized - Service role required' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()

    // Validate required fields
    const requiredFields = ['user_id', 'notification_type', 'alert_type', 'status', 'recipient']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Sanitize and validate data
    const historyData = {
      user_id: body.user_id,
      website_id: body.website_id || null,
      notification_type: body.notification_type,
      alert_type: body.alert_type,
      status: body.status,
      recipient: body.recipient.substring(0, 255), // Limit length
      subject: body.subject ? body.subject.substring(0, 255) : null,
      message_preview: body.message_preview ? body.message_preview.substring(0, 500) : null,
      error_message: body.error_message ? body.error_message.substring(0, 1000) : null,
      sent_at: body.sent_at || new Date().toISOString(),
      delivered_at: body.delivered_at || null
    }

    // Insert history record
    const { data: history, error: dbError } = await supabase
      .from('notification_history')
      .insert(historyData)
      .select()
      .single()

    if (dbError) {
      console.error('Database error creating notification history:', dbError)
      return NextResponse.json(
        { error: 'Failed to create notification history' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      history,
      message: 'Notification history created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/notification-history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Delete old notification history (cleanup endpoint)
export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    // Check for service role authorization
    const authHeader = request.headers.get('Authorization')
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!authHeader?.includes(serviceKey!) || !serviceKey) {
      return NextResponse.json(
        { error: 'Unauthorized - Service role required' },
        { status: 401 }
      )
    }

    // Delete records older than 90 days
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 90)

    const { data: deletedRecords, error: dbError } = await supabase
      .from('notification_history')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id')

    if (dbError) {
      console.error('Database error deleting old notification history:', dbError)
      return NextResponse.json(
        { error: 'Failed to delete old notification history' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: `Deleted ${deletedRecords?.length || 0} old notification history records`,
      deletedCount: deletedRecords?.length || 0,
      cutoffDate: cutoffDate.toISOString()
    })

  } catch (error) {
    console.error('Error in DELETE /api/notification-history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}