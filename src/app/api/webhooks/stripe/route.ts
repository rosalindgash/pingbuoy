import { stripe } from '@/lib/stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    // Log error without exposing sensitive information
    console.error('Webhook signature verification failed', {
      timestamp: new Date().toISOString(),
      hasSignature: !!signature,
      bodyLength: body.length,
      // Don't log the actual signature or body content
    })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId

        if (userId && session.customer) {
          // All checkout sessions are for Pro plan ($29.00)
          const plan = 'pro'

          console.log(`✅ Checkout completed: User ${userId} upgrading to ${plan} plan`)

          // Update user plan
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase as any)
            .from('users')
            .update({ 
              plan,
              stripe_customer_id: session.customer as string
            })
            .eq('id', userId)

          if (error) {
            console.error('❌ Failed to update user plan:', error)
          } else {
            console.log(`✅ Updated user ${userId} to ${plan} plan`)
            
            // TODO: Send payment receipt email
            // You can implement email sending here using your preferred email service
            // Example: await sendReceiptEmail(userEmail, session.amount_total, plan)
            console.log(`📧 Should send receipt email for $${(session.amount_total! / 100).toFixed(2)} ${plan} subscription`)
          }
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Get user by customer ID
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single() as { data: { id: string } | null }

        if (user) {
          const plan = subscription.status === 'active' ? 'pro' : 'free'
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('users')
            .update({ plan })
            .eq('id', user.id)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        // Get user and send notification
        const { data: user } = await supabase
          .from('users')
          .select('id, email')
          .eq('stripe_customer_id', customerId)
          .single() as { data: { id: string; email: string } | null }

        if (user) {
          // TODO: Send payment failed notification
          console.log(`Payment failed for user ${user.email}`)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}