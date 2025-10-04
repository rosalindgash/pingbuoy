import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY not found. Stripe functionality will be disabled.')
}

export const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2025-08-27.basil',
}) : null

export const getStripeJs = async () => {
  const publicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY
  if (!publicKey) {
    console.warn('NEXT_PUBLIC_STRIPE_PUBLIC_KEY not found.')
    return null
  }
  const stripeJs = await import('@stripe/stripe-js')
  return stripeJs.loadStripe(publicKey)
}

export const PRICE_IDS = {
  PRO_MONTHLY: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_not_configured',
  PRO_YEARLY: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_not_configured',
}

export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    sites: 2,
    uptimeChecks: '10 min intervals',
    features: [
      'Monitor up to 2 websites',
      'Uptime monitoring (10-min checks)',
      'Email alerts only',
      '7 days history',
      'Email support (24-48 hours)',
      'No SSL certificate monitoring',
      'No API monitoring',
    ]
  },
  PRO: {
    name: 'Pro',
    price: 59,
    sites: 15,
    uptimeChecks: '3 min intervals',
    features: [
      'Monitor up to 15 websites',
      'Uptime monitoring (3-min checks)',
      'SSL certificate monitoring',
      'API monitoring (up to 3 endpoints)',
      'Email + Slack + Discord + Webhooks alerts',
      '60 days history',
      'Priority email support (within 4 hours)'
    ]
  }
}