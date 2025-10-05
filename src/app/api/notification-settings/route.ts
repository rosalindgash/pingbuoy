import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import {
  validateNotificationSettings,
  validateNotificationUpdate,
  validateProFeatureAccess
} from '@/lib/notification-validation'
import { validateCSRF } from '@/lib/csrf-protection'
import { randomBytes } from 'crypto'

// Rate limiting for API endpoints
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_REQUESTS = 100 // requests per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(ip)

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize limit
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (userLimit.count >= RATE_LIMIT_REQUESTS) {
    return false
  }

  userLimit.count++
  return true
}

// Get client IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (real) {
    return real
  }
  
  return 'unknown'
}

// Authenticate user
async function authenticateUser(request: NextRequest): Promise<{ user: { id: string; email: string } | null; error?: string }> {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return { user: null, error: 'Missing or invalid authorization header' }
    }

    const token = authHeader.substring(7)
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return { user: null, error: 'Invalid or expired token' }
    }

    return { user }
  } catch {
    return { user: null, error: 'Authentication failed' }
  }
}

// GET: Retrieve user's notification settings
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

    // Fetch notification settings
    const supabase = await createServerSupabaseClient()
    const { data: settings, error: dbError } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        // No settings found, return defaults
        return NextResponse.json({
          settings: null,
          message: 'No notification settings found. Default settings will be created.'
        })
      }
      
      console.error('Database error fetching notification settings:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch notification settings' },
        { status: 500 }
      )
    }

    // Remove sensitive data before returning
    const { webhook_secret, ...safeSettings } = settings
    
    return NextResponse.json({ 
      settings: {
        ...safeSettings,
        webhook_secret: webhook_secret ? '***hidden***' : null
      }
    })

  } catch (error) {
    console.error('Error in GET /api/notification-settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Create new notification settings
export async function POST(request: NextRequest) {
  const requestId = randomBytes(8).toString('hex')

  // CSRF Protection: Validate Origin/Referer for notification settings creation
  const csrfValidation = validateCSRF(request)
  if (!csrfValidation.isValid) {
    console.warn(`[${requestId}] CSRF protection blocked notification settings creation`, {
      reason: csrfValidation.reason,
      origin: csrfValidation.origin,
      referer: csrfValidation.referer
    })
    return NextResponse.json(
      { error: 'Request blocked by security policy' },
      { status: 403 }
    )
  }

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

    // Parse request body
    const body = await request.json()

    // Validate settings
    const validation = validateNotificationSettings(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.issues },
        { status: 400 }
      )
    }

    // Get user's plan (mock for now - would come from subscription system)
    const userPlan = 'free' // TODO: Fetch from user subscription

    // Check Pro feature access
    const proValidation = validateProFeatureAccess(validation.data!, userPlan)
    if (!proValidation.success) {
      return NextResponse.json(
        { error: 'Pro features not available', details: proValidation.issues },
        { status: 403 }
      )
    }

    // Insert notification settings
    const supabase = await createServerSupabaseClient()
    const { data: settings, error: dbError } = await supabase
      .from('notification_settings')
      .insert({
        user_id: user.id,
        ...validation.data
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error creating notification settings:', dbError)
      return NextResponse.json(
        { error: 'Failed to create notification settings' },
        { status: 500 }
      )
    }

    // Remove sensitive data before returning
    const { webhook_secret, ...safeSettings } = settings
    
    return NextResponse.json({
      settings: {
        ...safeSettings,
        webhook_secret: webhook_secret ? '***hidden***' : null
      },
      message: 'Notification settings created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/notification-settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH: Update notification settings
export async function PATCH(request: NextRequest) {
  const requestId = randomBytes(8).toString('hex')

  // CSRF Protection: Validate Origin/Referer for notification settings update
  const csrfValidation = validateCSRF(request)
  if (!csrfValidation.isValid) {
    console.warn(`[${requestId}] CSRF protection blocked notification settings update`, {
      reason: csrfValidation.reason,
      origin: csrfValidation.origin,
      referer: csrfValidation.referer
    })
    return NextResponse.json(
      { error: 'Request blocked by security policy' },
      { status: 403 }
    )
  }

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

    // Parse request body
    const body = await request.json()

    // Validate partial update
    const validation = validateNotificationUpdate(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.issues },
        { status: 400 }
      )
    }

    // Get user's plan
    const userPlan = 'free' // TODO: Fetch from user subscription

    // Check Pro feature access
    const proValidation = validateProFeatureAccess(validation.data!, userPlan)
    if (!proValidation.success) {
      return NextResponse.json(
        { error: 'Pro features not available', details: proValidation.issues },
        { status: 403 }
      )
    }

    // Update notification settings
    const supabase = await createServerSupabaseClient()
    const { data: settings, error: dbError } = await supabase
      .from('notification_settings')
      .update({
        ...validation.data,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()
      .single()

    if (dbError) {
      console.error('Database error updating notification settings:', dbError)
      return NextResponse.json(
        { error: 'Failed to update notification settings' },
        { status: 500 }
      )
    }

    // Remove sensitive data before returning
    const { webhook_secret, ...safeSettings } = settings
    
    return NextResponse.json({
      settings: {
        ...safeSettings,
        webhook_secret: webhook_secret ? '***hidden***' : null
      },
      message: 'Notification settings updated successfully'
    })

  } catch (error) {
    console.error('Error in PATCH /api/notification-settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Delete notification settings (reset to defaults)
export async function DELETE(request: NextRequest) {
  const requestId = randomBytes(8).toString('hex')

  // CSRF Protection: Validate Origin/Referer for notification settings deletion
  const csrfValidation = validateCSRF(request)
  if (!csrfValidation.isValid) {
    console.warn(`[${requestId}] CSRF protection blocked notification settings deletion`, {
      reason: csrfValidation.reason,
      origin: csrfValidation.origin,
      referer: csrfValidation.referer
    })
    return NextResponse.json(
      { error: 'Request blocked by security policy' },
      { status: 403 }
    )
  }

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

    // Delete notification settings (will trigger default creation via database trigger)
    const supabase = await createServerSupabaseClient()
    const { error: dbError } = await supabase
      .from('notification_settings')
      .delete()
      .eq('user_id', user.id)

    if (dbError) {
      console.error('Database error deleting notification settings:', dbError)
      return NextResponse.json(
        { error: 'Failed to delete notification settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Notification settings reset to defaults'
    })

  } catch (error) {
    console.error('Error in DELETE /api/notification-settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}