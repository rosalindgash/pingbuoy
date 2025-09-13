import { stripe } from '@/lib/stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/supabase'

type UserProfile = Database['public']['Tables']['users']['Row']

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const { plan } = await request.json()
    
    // Map plan to price ID - using test mode price IDs
    const priceIds = {
      pro: 'price_1S5eJuD0KzamsXsqlb6HV1aI',
    }
    
    const priceId = priceIds[plan as keyof typeof priceIds]
    
    // Validate plan and priceId
    if (!plan || !priceId) {
      return NextResponse.json(
        { error: 'Invalid plan or missing price ID configuration.' },
        { status: 400 }
      )
    }
    
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check for existing customer ID
    const { data: userProfile } = await supabase
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single() as { data: Pick<UserProfile, 'stripe_customer_id' | 'email'> | null }

    let customerId = userProfile?.stripe_customer_id

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          userId: user.id,
        },
      })
      
      customerId = customer.id
      
      // Update user profile with customer ID
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Create checkout session
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
      },
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}