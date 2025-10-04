'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CreditCard, MapPin, Settings as SettingsIcon, Zap, Star } from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  plan: 'free' | 'pro' | 'founder'
  stripe_customer_id: string | null
}

interface BillingSectionProps {
  profile: UserProfile
}

export default function BillingSection({ profile }: BillingSectionProps) {
  const [loading, setLoading] = useState(false)
  const [upgradeLoading, setUpgradeLoading] = useState('')
  const [message, setMessage] = useState('')

  const handleManageBilling = async () => {
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (response.ok && result.url) {
        window.location.href = result.url
      } else {
        setMessage('Error: ' + (result.error || 'Failed to access billing portal'))
      }
    } catch (_error) {
      setMessage('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (plan: string) => {
    setUpgradeLoading(plan)
    setMessage('')

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      })

      const result = await response.json()

      if (response.ok && result.sessionId) {
        const stripe = await import('@stripe/stripe-js').then(mod => 
          mod.loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!)
        )
        if (stripe) {
          await stripe.redirectToCheckout({ sessionId: result.sessionId })
        }
      } else {
        setMessage('Error: ' + (result.error || 'Failed to start checkout'))
      }
    } catch (_error) {
      setMessage('An unexpected error occurred')
    } finally {
      setUpgradeLoading('')
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <CreditCard className="w-5 h-5 text-gray-400" />
        <h2 className="text-lg font-medium text-gray-900">Billing & Subscription</h2>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-900">Current Plan</p>
            <p className="text-sm text-gray-600">
              {profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)} Plan
            </p>
          </div>
          <div className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
            profile.plan === 'free' ? 'bg-gray-100 text-gray-800' :
            profile.plan === 'founder' ? 'bg-purple-100 text-purple-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {profile.plan === 'free' ? 'Free' : 
             profile.plan === 'founder' ? 'Founder' : 'Pro'}
          </div>
        </div>

        {/* Free Plan - Show Upgrade Options */}
        {profile.plan === 'free' && (
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="w-5 h-5 text-blue-600" />
                <h4 className="text-sm font-semibold text-blue-900">Unlock More Features</h4>
              </div>
              <p className="text-sm text-blue-700 mb-4">
                Monitor more websites with faster checks and advanced features
              </p>
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Star className="w-4 h-4 text-blue-600" />
                  <h5 className="text-sm font-medium text-gray-900">Pro Plan</h5>
                </div>
                <p className="text-xs text-gray-600 mb-3">15 sites, 3-min checks, SSL + API monitoring, alerts</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-900">$59/mo</span>
                  <Button
                    onClick={() => handleUpgrade('pro')}
                    disabled={upgradeLoading === 'pro'}
                    size="sm"
                  >
                    {upgradeLoading === 'pro' ? 'Loading...' : 'Upgrade'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Founder Plan - Show Special Message */}
        {profile.plan === 'founder' && (
          <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
            <div className="flex items-center space-x-2 mb-2">
              <Star className="w-5 h-5 text-purple-600" />
              <h4 className="text-sm font-semibold text-purple-900">Founder Account</h4>
            </div>
            <p className="text-sm text-purple-700">
              You have unlimited access to all PingBuoy features as a founder. Thank you for being part of our journey!
            </p>
          </div>
        )}

        {/* Paid Plans - Show Billing Management */}
        {profile.plan === 'pro' && (
          <div className="space-y-4">

            {/* Billing Management Actions */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-start space-x-3">
                  <CreditCard className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">Payment Methods</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Add, update, or remove your credit/debit cards
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleManageBilling}
                  disabled={loading}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  {loading ? 'Loading...' : 'Manage Cards'}
                </Button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">Billing Address</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Update your billing address and tax information
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleManageBilling}
                  disabled={loading}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  {loading ? 'Loading...' : 'Update Address'}
                </Button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-start space-x-3">
                  <SettingsIcon className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">Subscription & Invoices</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Manage subscription, view invoices, and download receipts
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleManageBilling}
                  disabled={loading}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  {loading ? 'Loading...' : 'Manage Subscription'}
                </Button>
              </div>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700 mb-2">
                <strong>Manage Your Subscription:</strong> Click "Manage Subscription" above to cancel, downgrade to Free, or update your billing details through Stripe&apos;s secure portal.
              </p>
              <p className="text-xs text-blue-600">
                All changes are prorated. Cancellations take effect at the end of your billing period.
              </p>
            </div>
          </div>
        )}

        {message && (
          <div className={`p-3 rounded-md text-sm border ${
            message.includes('Error') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}