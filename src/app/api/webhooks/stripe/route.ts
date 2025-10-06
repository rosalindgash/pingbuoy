import { stripe } from '@/lib/stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { randomBytes } from 'crypto'
import { getRateLimiter } from '@/lib/redis-rate-limit'
import { apiLogger } from '@/lib/secure-logger'
import {
  notifyPaymentSuccess,
  notifyPaymentFailed,
  notifyNewSubscription,
  notifySubscriptionCancellation
} from '@/lib/slack-notifications'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
const WEBHOOK_TTL_SECONDS = 15 * 60 // 15 minutes TTL for webhook deduplication

// Declare global type for webhook cache
declare global {
  var _webhookCache: Record<string, number> | undefined
}

export async function POST(request: NextRequest) {
  const requestId = randomBytes(8).toString('hex')

  if (!stripe) {
    console.error(`[${requestId}] Stripe not configured for webhook`)
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  if (!webhookSecret) {
    console.error(`[${requestId}] Webhook secret not configured`)
    return NextResponse.json({ error: 'Service misconfiguration' }, { status: 503 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.warn(`[${requestId}] Missing Stripe signature`)
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (webhookError) {
    console.error(`[${requestId}] Webhook signature verification failed`, {
      hasSignature: !!signature,
      bodyLength: body.length,
      errorCode: 'WEBHOOK_SIGNATURE_INVALID'
    })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Redis-based webhook deduplication
  try {
    const rateLimiter = getRateLimiter()
    const webhookKey = `stripe:webhook:${event.id}`

    // Check if webhook already processed using Redis SETNX (Set if Not eXists)
    const redis = (rateLimiter as any).redis
    const wasProcessed = await redis.set(webhookKey, Date.now().toString(), {
      ex: WEBHOOK_TTL_SECONDS,
      nx: true // Only set if key doesn't exist
    })

    // If wasProcessed is null, the key already existed (duplicate webhook)
    if (!wasProcessed) {
      console.info(`[${requestId}] Duplicate webhook ignored`, {
        eventId: event.id,
        eventType: event.type
      })
      return NextResponse.json({ received: true, duplicate: true })
    }
  } catch (redisError) {
    // Fallback to in-memory deduplication if Redis fails
    console.warn(`[${requestId}] Redis webhook deduplication failed, using fallback`, {
      error: redisError instanceof Error ? redisError.message : 'Unknown error'
    })

    const memoryKey = event.id
    const now = Date.now()

    // Simple in-memory fallback (not perfect in serverless but better than nothing)
    if (global._webhookCache?.[memoryKey] && (now - global._webhookCache[memoryKey]) < (WEBHOOK_TTL_SECONDS * 1000)) {
      console.info(`[${requestId}] Duplicate webhook ignored (fallback)`, {
        eventId: event.id,
        eventType: event.type
      })
      return NextResponse.json({ received: true, duplicate: true })
    }

    // Initialize global cache if needed
    if (!global._webhookCache) {
      global._webhookCache = {}
    }
    global._webhookCache[memoryKey] = now
  }

  console.info(`[${requestId}] Processing webhook`, {
    eventId: event.id,
    eventType: event.type,
    created: event.created
  })

  const supabase = await createServerSupabaseClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId

        if (!userId || !session.customer) {
          console.warn(`[${requestId}] Checkout session missing required data`, {
            eventId: event.id,
            hasUserId: !!userId,
            hasCustomer: !!session.customer
          })
          break
        }

        const plan = 'pro' // All checkout sessions are for Pro plan

        console.info(`[${requestId}] Processing checkout completion`, {
          eventId: event.id,
          userId: userId,
          planType: plan,
          customerId: session.customer
        })

        try {
          // Update user plan with idempotency
          const idempotencyKey = `checkout_${event.id}_${userId}`

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase as any)
            .from('users')
            .update({
              plan,
              stripe_customer_id: session.customer as string,
              updated_at: new Date().toISOString() // Ensure update is tracked
            })
            .eq('id', userId)

          if (error) {
            console.error(`[${requestId}] Failed to update user plan`, {
              eventId: event.id,
              userId: userId,
              errorCode: 'USER_PLAN_UPDATE_FAILED',
              error: error.code || 'UNKNOWN'
            })
          } else {
            console.info(`[${requestId}] User plan updated successfully`, {
              eventId: event.id,
              userId: userId,
              planType: plan
            })

            // Send Slack notifications
            const { data: user } = await supabase
              .from('users')
              .select('email')
              .eq('id', userId)
              .single() as { data: { email: string } | null }

            if (user?.email) {
              // Notify payment success
              await notifyPaymentSuccess({
                customerEmail: user.email,
                plan: plan,
                amount: session.amount_total || undefined
              })

              // Notify new subscription
              await notifyNewSubscription({
                email: user.email,
                plan: plan,
                source: 'checkout'
              })
            }
          }
        } catch (dbError) {
          console.error(`[${requestId}] Database error during checkout processing`, {
            eventId: event.id,
            userId: userId,
            errorCode: 'DATABASE_ERROR'
          })
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        if (!customerId) {
          console.warn(`[${requestId}] Subscription event missing customer ID`, {
            eventId: event.id,
            eventType: event.type
          })
          break
        }

        console.info(`[${requestId}] Processing subscription change`, {
          eventId: event.id,
          eventType: event.type,
          customerId: customerId,
          subscriptionStatus: subscription.status
        })

        try {
          // Get user by customer ID
          const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single() as { data: { id: string } | null }

          if (!user) {
            console.warn(`[${requestId}] User not found for customer`, {
              eventId: event.id,
              customerId: customerId
            })
            break
          }

          const plan = subscription.status === 'active' ? 'pro' : 'free'
          const idempotencyKey = `subscription_${event.id}_${user.id}`

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase as any)
            .from('users')
            .update({
              plan,
              updated_at: new Date().toISOString() // Ensure update is tracked
            })
            .eq('id', user.id)

          if (error) {
            console.error(`[${requestId}] Failed to update subscription status`, {
              eventId: event.id,
              userId: user.id,
              errorCode: 'SUBSCRIPTION_UPDATE_FAILED',
              error: error.code || 'UNKNOWN'
            })
          } else {
            console.info(`[${requestId}] Subscription updated successfully`, {
              eventId: event.id,
              userId: user.id,
              planType: plan,
              subscriptionStatus: subscription.status
            })

            // Send Slack notification for cancellations
            if (subscription.status !== 'active') {
              const { data: userEmail } = await supabase
                .from('users')
                .select('email')
                .eq('id', user.id)
                .single() as { data: { email: string } | null }

              if (userEmail?.email) {
                await notifySubscriptionCancellation({
                  email: userEmail.email,
                  plan: plan
                })
              }
            }
          }
        } catch (dbError) {
          console.error(`[${requestId}] Database error during subscription processing`, {
            eventId: event.id,
            customerId: customerId,
            errorCode: 'DATABASE_ERROR'
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        if (!customerId) {
          console.warn(`[${requestId}] Payment failed event missing customer ID`, {
            eventId: event.id
          })
          break
        }

        console.info(`[${requestId}] Processing payment failure`, {
          eventId: event.id,
          customerId: customerId
        })

        try {
          // Get user for notification
          const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single() as { data: { id: string } | null }

          if (!user) {
            console.warn(`[${requestId}] User not found for payment failure`, {
              eventId: event.id,
              customerId: customerId
            })
            break
          }

          // Send Slack notification for payment failure
          const { data: userEmail } = await supabase
            .from('users')
            .select('email')
            .eq('id', user.id)
            .single() as { data: { email: string } | null }

          if (userEmail?.email) {
            await notifyPaymentFailed({
              customerEmail: userEmail.email
            })
          }

        } catch (dbError) {
          console.error(`[${requestId}] Database error during payment failure processing`, {
            eventId: event.id,
            customerId: customerId,
            errorCode: 'DATABASE_ERROR'
          })
        }
        break
      }

      default:
        console.info(`[${requestId}] Unhandled webhook event type`, {
          eventId: event.id,
          eventType: event.type
        })
        break
    }

    console.info(`[${requestId}] Webhook processed successfully`, {
      eventId: event.id,
      eventType: event.type
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error(`[${requestId}] Error processing webhook`, {
      eventId: event?.id,
      eventType: event?.type,
      errorCode: 'WEBHOOK_PROCESSING_FAILED',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    // CRITICAL: Always return 200 to acknowledge receipt and prevent Stripe retry storms
    // The webhook was received and signature verified - log the error but don't trigger retries
    return NextResponse.json(
      { received: true, processed: false },
      { status: 200 }
    )
  }
}