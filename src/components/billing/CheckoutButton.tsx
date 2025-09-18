'use client'

import { useState } from 'react'
import { getStripeJs } from '@/lib/stripe'
import { Button } from '@/components/ui/button'

interface CheckoutButtonProps {
  priceId: string
  planName: string
  disabled?: boolean
}

export default function CheckoutButton({ 
  priceId, 
  planName, 
  disabled = false 
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      })

      const { sessionId } = await response.json()

      const stripe = await getStripeJs()
      await stripe?.redirectToCheckout({ sessionId })
    } catch (error) {
      console.error('Error:', error)
      alert('Something went wrong!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleCheckout}
      disabled={disabled || loading}
      className="w-full"
    >
      {loading ? 'Loading...' : `Upgrade to ${planName}`}
    </Button>
  )
}