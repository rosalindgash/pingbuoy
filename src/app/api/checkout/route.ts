import { stripe } from '@/lib/stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/supabase'
import { randomBytes } from 'crypto'
import { validateCSRF } from '@/lib/csrf-protection'
import { apiLogger } from '@/lib/secure-logger'

type UserProfile = Database['public']['Tables']['users']['Row']

// Generate secure idempotency key
function generateIdempotencyKey(userId: string, operation: string): string {
  const timestamp = Date.now()
  const random = randomBytes(8).toString('hex')
  return `${operation}_${userId}_${timestamp}_${random}`
}

export async function POST(request: NextRequest) {
  const requestId = randomBytes(8).toString('hex')

  // CSRF Protection: Validate Origin/Referer for payment requests
  const csrfValidation = validateCSRF(request)
  if (!csrfValidation.isValid) {
    apiLogger.warn('CSRF protection blocked checkout request', {
      requestId,
      reason: csrfValidation.reason,
      hasOrigin: !!csrfValidation.origin,
      hasReferer: !!csrfValidation.referer
    })
    return NextResponse.json(
      { error: 'Request blocked by security policy' },
      { status: 403 }
    )
  }

  try {
    if (!stripe) {
      apiLogger.error('Stripe not configured', null, { requestId })
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    const { plan } = await request.json()

    // Map plan to price ID - using test mode price IDs
    const priceIds = {
      pro: 'price_1S5eJuD0KzamsXsqlb6HV1aI', // eslint-disable-line no-secrets/no-secrets
    } as const

    const priceId = priceIds[plan as keyof typeof priceIds]

    // Validate plan and priceId
    if (!plan || !priceId) {
      apiLogger.warn('Invalid plan request', { requestId, hasValidPlan: !!plan, hasPriceId: !!priceId })
      return NextResponse.json(
        { error: 'Invalid subscription plan' },
        { status: 400 }
      )
    }
    
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      apiLogger.warn('Authentication failed', { requestId, hasUser: !!user })
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    apiLogger.info('Checkout session requested', { requestId, userId: user.id, planType: plan })

    // Get user profile to check for existing customer ID
    const { data: userProfile } = await supabase
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single() as { data: Pick<UserProfile, 'stripe_customer_id' | 'email'> | null }

    let customerId = userProfile?.stripe_customer_id

    // Create Stripe customer if doesn't exist (with idempotency)
    if (!customerId) {
      const customerIdempotencyKey = generateIdempotencyKey(user.id, 'customer_create')

      try {
        const customer = await stripe.customers.create({
          email: user.email!,
          metadata: {
            userId: user.id,
            createdAt: new Date().toISOString()
          },
        }, {
          idempotencyKey: customerIdempotencyKey
        })

        customerId = customer.id

        apiLogger.info('Stripe customer created', { requestId, userId: user.id, customerId })

        // Update user profile with customer ID (with race condition protection)
        const { error: updateError } = await (supabase as any)
          .from('users')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id)
          .is('stripe_customer_id', null) // Only update if still null

        if (updateError) {
          apiLogger.warn('Failed to update customer ID', { requestId, userId: user.id, errorCode: updateError.code })
          // Check if another request already updated it
          const { data: refreshedProfile } = await (supabase as any)
            .from('users')
            .select('stripe_customer_id')
            .eq('id', user.id)
            .single()

          if (refreshedProfile?.stripe_customer_id) {
            customerId = refreshedProfile.stripe_customer_id
            apiLogger.info('Using existing customer ID from concurrent request', { requestId, userId: user.id, customerId })
          }
        }
      } catch (stripeError) {
        apiLogger.error('Failed to create Stripe customer', null, { requestId, userId: user.id, errorCode: 'STRIPE_CUSTOMER_CREATE_FAILED' })
        return NextResponse.json({ error: 'Unable to process subscription' }, { status: 500 })
      }
    }

    // Ensure we have a customer ID
    if (!customerId) {
      apiLogger.error('No customer ID available after customer creation', null, { requestId, userId: user.id })
      return NextResponse.json({ error: 'Unable to process subscription' }, { status: 500 })
    }

    // Create checkout session (with idempotency)
    const sessionIdempotencyKey = generateIdempotencyKey(user.id, 'checkout_session')

    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${request.nextUrl.origin}/dashboard?success=true`,
        cancel_url: `${request.nextUrl.origin}/pricing?canceled=true`,
        metadata: {
          userId: user.id,
          planType: plan,
          requestId: requestId
        },
      }, {
        idempotencyKey: sessionIdempotencyKey
      })

      apiLogger.info('Checkout session created', { requestId, userId: user.id, sessionId: session.id, planType: plan })

      return NextResponse.json({ sessionId: session.id })
    } catch (stripeError) {
      apiLogger.error('Failed to create checkout session', null, { requestId, userId: user.id, errorCode: 'STRIPE_CHECKOUT_CREATE_FAILED' })
      return NextResponse.json({ error: 'Unable to create checkout session' }, { status: 500 })
    }

  } catch (error) {
    apiLogger.error('Unexpected error in checkout API', error, { requestId, errorCode: 'CHECKOUT_UNEXPECTED_ERROR', hasStripe: !!stripe })
    return NextResponse.json(
      { error: 'Service temporarily unavailable' },
      { status: 500 }
    )
  }
}