'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface WaitlistFormProps {
  planType: 'enterprise'
}

export default function WaitlistForm({ planType }: WaitlistFormProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, plan: planType }),
      })

      if (response.ok) {
        setSubmitted(true)
        setEmail('')
      } else {
        const error = await response.text()
        alert('Error: ' + error)
      }
    } catch (_error) {
      alert('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center p-4 bg-green-50 rounded-lg">
        <div className="text-sm font-medium text-green-800">
          Thanks! You&apos;re on the waitlist
        </div>
        <div className="text-xs text-green-600 mt-1">
          We&apos;ll notify you when Enterprise plan is available
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        required
      />
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Joining...' : 'Join Waitlist'}
      </Button>
    </form>
  )
}