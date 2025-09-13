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

    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to get Stripe customer ID
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single() as { data: Pick<UserProfile, 'stripe_customer_id'> | null, error: unknown }

    if (profileError || !userProfile || !userProfile.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing information found' }, { status: 400 })
    }

    // Create Stripe customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: userProfile.stripe_customer_id,
      return_url: `${request.nextUrl.origin}/dashboard/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Billing portal API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}