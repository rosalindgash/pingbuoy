import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Normalize amount to monthly cents
function normalizeToMonthlyCents(amountCents: number, interval: string): number {
  if (interval === 'year') {
    return Math.round(amountCents / 12)
  }
  return amountCents
}

// Calculate MRR change for expansion/contraction
async function calculateMRRChange(
  subscriptionId: string,
  newAmountCents: number
): Promise<number> {
  // Get previous event for this subscription
  const { data: previousEvent } = await supabase
    .from('events_subscriptions')
    .select('amount_recurring_cents')
    .eq('subscription_id', subscriptionId)
    .order('occurred_at_utc', { ascending: false })
    .limit(1)
    .single()

  const previousAmount = previousEvent?.amount_recurring_cents || 0
  return newAmountCents - previousAmount
}

// Classify event type based on subscription changes
function classifyEventType(
  subscription: Stripe.Subscription,
  previousStatus?: string
): string {
  const status = subscription.status

  // New subscription
  if (!previousStatus) {
    if (subscription.trial_end && subscription.trial_end > Date.now() / 1000) {
      return 'trial_started'
    }
    return 'created'
  }

  // Trial conversion
  if (previousStatus === 'trialing' && status === 'active') {
    return 'trial_converted'
  }

  // Status changes
  if (status === 'canceled') return 'canceled'
  if (status === 'paused') return 'paused'
  if (previousStatus === 'paused' && status === 'active') return 'resumed'

  return 'updated'
}

// Process subscription event
async function processSubscriptionEvent(
  event: Stripe.Event,
  subscription: Stripe.Subscription
) {
  const eventId = event.id
  const customerId = subscription.customer as string
  const subscriptionId = subscription.id
  const planId = subscription.items.data[0]?.price.id || null

  // Get price details
  const price = subscription.items.data[0]?.price
  const amountCents = price?.unit_amount || 0
  const currency = price?.currency || 'usd'
  const interval = price?.recurring?.interval || 'month'

  // Normalize to monthly
  const monthlyAmountCents = normalizeToMonthlyCents(amountCents, interval)

  // Calculate change (for upgrades/downgrades)
  const amountChangeCents = await calculateMRRChange(subscriptionId, monthlyAmountCents)

  // Determine event type
  let eventType = event.type.includes('deleted') ? 'canceled' : 'updated'

  if (event.type === 'customer.subscription.created') {
    eventType = subscription.trial_end && subscription.trial_end > Date.now() / 1000
      ? 'trial_started'
      : 'created'
  } else if (event.type === 'customer.subscription.updated') {
    // Check if it's an upgrade or downgrade
    if (amountChangeCents > 0) {
      eventType = 'upgraded'
    } else if (amountChangeCents < 0) {
      eventType = 'downgraded'
    }
  }

  // Insert event
  const { error } = await supabase
    .from('events_subscriptions')
    .insert({
      stripe_event_id: eventId,
      occurred_at_utc: new Date(event.created * 1000).toISOString(),
      customer_id: customerId,
      subscription_id: subscriptionId,
      plan_id: planId,
      currency: currency,
      amount_recurring_cents: monthlyAmountCents,
      amount_change_cents: amountChangeCents,
      event_type: eventType,
      raw_json: subscription,
      processed: true
    })

  if (error && error.code !== '23505') { // Ignore duplicate key errors
    console.error('Error inserting subscription event:', error)
    throw error
  }

  return { eventType, amountChangeCents }
}

// Process invoice event
async function processInvoiceEvent(
  event: Stripe.Event,
  invoice: Stripe.Invoice
) {
  const eventId = event.id
  const customerId = invoice.customer as string
  const subscriptionId = invoice.subscription as string

  // Skip if no subscription (one-time invoices)
  if (!subscriptionId) {
    console.log('Skipping invoice without subscription:', invoice.id)
    return { eventType: 'skipped' }
  }

  let eventType = 'invoice_paid'
  let amountRecurringCents = 0

  // Classify invoice event
  if (event.type === 'invoice.payment_failed') {
    eventType = 'payment_failed'
  } else if (event.type === 'charge.refunded') {
    eventType = 'refunded'
    // Get refund amount (only recurring items, exclude setup fees/taxes)
    const recurringItems = invoice.lines.data.filter(
      line => line.type === 'subscription' && line.proration === false
    )
    amountRecurringCents = recurringItems.reduce((sum, item) => sum + (item.amount || 0), 0)
  } else if (invoice.paid && invoice.billing_reason === 'subscription_create') {
    eventType = 'created'
    amountRecurringCents = invoice.amount_paid
  }

  // Insert event
  const { error } = await supabase
    .from('events_subscriptions')
    .insert({
      stripe_event_id: eventId,
      occurred_at_utc: new Date(event.created * 1000).toISOString(),
      customer_id: customerId,
      subscription_id: subscriptionId,
      plan_id: invoice.lines.data[0]?.price?.id || null,
      currency: invoice.currency || 'usd',
      amount_recurring_cents: amountRecurringCents,
      amount_change_cents: 0,
      event_type: eventType,
      raw_json: invoice,
      processed: true
    })

  if (error && error.code !== '23505') {
    console.error('Error inserting invoice event:', error)
    throw error
  }

  return { eventType }
}

// Trigger daily facts recomputation
async function triggerFactsRecomputation(eventDate: Date) {
  const dateStr = eventDate.toISOString().split('T')[0]

  // Call the recompute function
  const { error } = await supabase.rpc('recompute_daily_facts', {
    target_date: dateStr
  })

  if (error) {
    console.error('Error recomputing daily facts:', error)
  }
}

export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  try {
    const body = await request.text()
    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret)

    // Store raw webhook for replay/audit
    const { error: webhookError } = await supabase
      .from('webhook_events')
      .insert({
        event_id: event.id,
        event_type: event.type,
        payload: event,
        processed: false
      })

    if (webhookError && webhookError.code !== '23505') {
      console.error('Error storing webhook:', webhookError)
    }

    // Process relevant events
    let processed = false
    let eventDate = new Date(event.created * 1000)

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.paused':
      case 'customer.subscription.resumed': {
        const subscription = event.data.object as Stripe.Subscription
        await processSubscriptionEvent(event, subscription)
        processed = true
        break
      }

      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await processInvoiceEvent(event, invoice)
        processed = true
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        if (charge.invoice) {
          const invoice = await stripe.invoices.retrieve(charge.invoice as string)
          await processInvoiceEvent(event, invoice)
          processed = true
        }
        break
      }

      case 'customer.subscription.trial_will_end': {
        // Just log for now - could send alerts
        console.log('Trial ending soon:', event.data.object)
        break
      }

      default:
        console.log('Unhandled event type:', event.type)
    }

    // Mark webhook as processed
    if (processed) {
      await supabase
        .from('webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString()
        })
        .eq('event_id', event.id)

      // Trigger daily facts recomputation for this date
      await triggerFactsRecomputation(eventDate)

      // Also recompute yesterday and today to catch any edge cases
      const yesterday = new Date(eventDate)
      yesterday.setDate(yesterday.getDate() - 1)
      await triggerFactsRecomputation(yesterday)

      const today = new Date()
      await triggerFactsRecomputation(today)
    }

    return NextResponse.json({ received: true, processed })

  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 400 }
    )
  }
}
