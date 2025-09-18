import { stripe } from '@/lib/stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/supabase'
import { randomBytes } from 'crypto'
import { validateCSRF } from '@/lib/csrf-protection'

type UserProfile = Database['public']['Tables']['users']['Row']

export async function POST(request: NextRequest) {
  const requestId = randomBytes(8).toString('hex')

  // CSRF Protection: Validate Origin/Referer for billing portal access
  const csrfValidation = validateCSRF(request)
  if (!csrfValidation.isValid) {
    console.warn(`[${requestId}] CSRF protection blocked billing portal request`, {
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
    if (!stripe) {
      console.error(`[${requestId}] Stripe not configured`)
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.warn(`[${requestId}] Authentication failed`, { hasUser: !!user })
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.info(`[${requestId}] Billing portal requested`, {
      userId: user.id
    })

    // Get user profile to get Stripe customer ID
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single() as { data: Pick<UserProfile, 'stripe_customer_id'> | null, error: unknown }

    if (profileError || !userProfile || !userProfile.stripe_customer_id) {
      console.warn(`[${requestId}] No billing information found`, {
        userId: user.id,
        hasProfile: !!userProfile,
        hasCustomerId: !!(userProfile?.stripe_customer_id)
      })
      return NextResponse.json({ error: 'No billing information found' }, { status: 404 })
    }

    try {
      // Create Stripe customer portal session
      const session = await stripe.billingPortal.sessions.create({
        customer: userProfile.stripe_customer_id,
        return_url: `${request.nextUrl.origin}/dashboard/settings`,
      })

      console.info(`[${requestId}] Billing portal session created`, {
        userId: user.id,
        customerId: userProfile.stripe_customer_id
      })

      return NextResponse.json({ url: session.url })
    } catch (stripeError) {
      console.error(`[${requestId}] Failed to create billing portal session`, {
        userId: user.id,
        errorCode: 'STRIPE_PORTAL_CREATE_FAILED'
      })
      return NextResponse.json({ error: 'Unable to access billing portal' }, { status: 500 })
    }

  } catch (error) {
    console.error(`[${requestId}] Unexpected error in billing portal API`, {
      errorCode: 'PORTAL_UNEXPECTED_ERROR',
      hasStripe: !!stripe
    })
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 500 })
  }
}