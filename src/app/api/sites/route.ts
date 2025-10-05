import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { addSite } from '@/lib/uptime'
import { Database } from '@/lib/supabase'
import { siteSchema, validateAndSanitize } from '@/lib/validation'
import { validateCSRF } from '@/lib/csrf-protection'
import { randomBytes } from 'crypto'
import { checkRateLimit } from '@/lib/upstash-rate-limit'

type UserProfile = Database['public']['Tables']['users']['Row']

export async function POST(request: NextRequest) {
  const requestId = randomBytes(8).toString('hex')

  // CSRF Protection: Validate Origin/Referer for site creation
  const csrfValidation = validateCSRF(request)
  if (!csrfValidation.isValid) {
    console.warn(`[${requestId}] CSRF protection blocked site creation request`, {
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
    const rawData = await request.json()

    // Validate and sanitize input
    const { name, url } = validateAndSanitize(siteSchema, rawData)

    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.warn(`[${requestId}] Authentication failed for site creation`, { hasUser: !!user })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting: 10 site operations per hour
    const rateLimitResponse = await checkRateLimit(user.id, 'siteOperations', 'site creation')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    console.info(`[${requestId}] Site creation requested`, {
      userId: user.id
    })

    // Check user's plan and current site count
    const { data: userProfile } = await supabase
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single() as { data: Pick<UserProfile, 'plan'> | null }

    const { data: existingSites } = await supabase
      .from('sites')
      .select('id')
      .eq('user_id', user.id)

    const siteCount = existingSites?.length || 0
    const maxSites = userProfile?.plan === 'free' ? 2 : userProfile?.plan === 'pro' ? 15 : userProfile?.plan === 'founder' ? 999 : 999

    if (siteCount >= maxSites) {
      console.warn(`[${requestId}] Site limit reached`, {
        userId: user.id,
        currentCount: siteCount,
        maxAllowed: maxSites,
        planType: userProfile?.plan || 'unknown'
      })
      return NextResponse.json(
        { error: `You've reached your plan limit of ${maxSites} websites. Please upgrade to add more.` },
        { status: 403 }
      )
    }

    const site = await addSite(user.id, url, name)

    console.info(`[${requestId}] Site created successfully`, {
      userId: user.id,
      siteId: site.id
    })

    return NextResponse.json(site)
  } catch (error: unknown) {
    console.error(`[${requestId}] Error creating site`, {
      errorCode: 'SITE_CREATE_FAILED'
    })

    // Handle validation errors specifically
    if (error instanceof Error && error.message.includes('Invalid')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // Handle database-level plan limit enforcement
    if (error instanceof Error && error.message.includes('Site limit exceeded')) {
      // Extract plan and limit from error message
      const planMatch = error.message.match(/(\w+) plan \(limit: (\d+)/)
      if (planMatch) {
        const [, plan, limit] = planMatch
        console.warn(`[${requestId}] Database enforced site limit`, {
          userId: user?.id,
          plan,
          limit
        })
        return NextResponse.json(
          { error: `You've reached your ${plan} plan limit of ${limit} websites. Please upgrade to add more.` },
          { status: 403 }
        )
      }
      // Fallback if parsing fails
      return NextResponse.json(
        { error: 'You have reached your plan limit. Please upgrade to add more sites.' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = randomBytes(8).toString('hex')

  // CSRF Protection: Validate Origin/Referer for site deletion
  const csrfValidation = validateCSRF(request)
  if (!csrfValidation.isValid) {
    console.warn(`[${requestId}] CSRF protection blocked site deletion request`, {
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
    const { searchParams } = new URL(request.url)
    const rawSiteId = searchParams.get('id')

    if (!rawSiteId) {
      console.warn(`[${requestId}] Missing site ID for deletion`)
      return NextResponse.json({ error: 'Site ID required' }, { status: 400 })
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(rawSiteId)) {
      console.warn(`[${requestId}] Invalid site ID format provided`)
      return NextResponse.json({ error: 'Invalid site ID format' }, { status: 400 })
    }
    
    const siteId = rawSiteId
    
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.warn(`[${requestId}] Authentication failed for site deletion`, { hasUser: !!user })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting: 10 site operations per hour
    const rateLimitResponse = await checkRateLimit(user.id, 'siteOperations', 'site deletion')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    console.info(`[${requestId}] Site deletion requested`, {
      userId: user.id,
      siteId: siteId
    })

    const { error } = await supabase
      .from('sites')
      .delete()
      .eq('id', siteId)
      .eq('user_id', user.id)

    if (error) {
      console.error(`[${requestId}] Database error during site deletion`, {
        userId: user.id,
        siteId: siteId,
        errorCode: 'DATABASE_DELETE_FAILED'
      })
      throw new Error('Failed to delete site: ' + error.message)
    }

    console.info(`[${requestId}] Site deleted successfully`, {
      userId: user.id,
      siteId: siteId
    })
    
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error(`[${requestId}] Error deleting site`, {
      errorCode: 'SITE_DELETE_FAILED'
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}