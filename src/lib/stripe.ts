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
    sites: 3,
    uptimeChecks: '5 min intervals',
    features: [
      'Monitor up to 3 websites',
      'Uptime monitoring (5-min checks)',
      'Page Speed monitoring (daily checks, basic metrics)',
      'Email alerts only',
      '7 days history',
      'No SSL expiry monitoring',
      'No API monitoring',
    ]
  },
  PRO: {
    name: 'Pro',
    price: 29,
    sites: 25,
    uptimeChecks: '1 min intervals',
    features: [
      'Monitor up to 25 websites',
      'Uptime monitoring (1-min checks)',
      'Page Speed monitoring (hourly checks)',
      'SSL expiry monitoring (all sites, alerts before expiry)',
      'API monitoring (up to 5 endpoints)',
      'Alerts via Email + Slack + Discord + Webhooks',
      '90 days history',
      'Priority email support'
    ]
  }
}