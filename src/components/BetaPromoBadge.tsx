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
    <div className="mb-4 p-3 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-orange-900">
            🎉 Beta Launch Special
          </p>
          <p className="text-xs text-orange-700 mt-1">
            Use code <span className="font-mono font-bold bg-white px-2 py-0.5 rounded">BETA50</span> for 50% off first month
          </p>
        </div>
        <div className="ml-3 text-right">
          <div className="text-xs text-orange-600 font-medium">
            {remainingUses} left
          </div>
        </div>
      </div>
    </div>
  )
}
