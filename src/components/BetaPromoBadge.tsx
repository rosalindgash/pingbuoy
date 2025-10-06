'use client'

import { useEffect, useState } from 'react'

export default function BetaPromoBadge() {
  const [remainingUses, setRemainingUses] = useState<number | null>(null)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const fetchRemainingUses = async () => {
      try {
        const response = await fetch('/api/beta-count')
        const data = await response.json()

        const redeemed = data.redeemed || 0
        const remaining = 50 - redeemed

        setRemainingUses(remaining)

        // Hide badge if no uses remaining
        if (remaining <= 0) {
          setIsVisible(false)
        }
      } catch (err) {
        console.error('Error fetching beta count:', err)
        setRemainingUses(50)
      }
    }

    fetchRemainingUses()

    // Poll every 30 seconds to update the count
    const interval = setInterval(fetchRemainingUses, 30000)
    return () => clearInterval(interval)
  }, [])

  if (!isVisible || remainingUses === null || remainingUses <= 0) {
    return null
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-full text-xs">
      <span className="font-semibold text-orange-900">
        🎉 BETA50
      </span>
      <span className="text-orange-700">50% off</span>
      <span className="text-orange-600 font-medium">
        {remainingUses} left
      </span>
    </div>
  )
}
