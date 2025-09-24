'use client'

import { useEffect, useState } from 'react'

interface LiveTimestampProps {
  timestamp: string | null
  showTimeZone?: boolean
}

export default function LiveTimestamp({ timestamp, showTimeZone = false }: LiveTimestampProps) {
  const [, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 30000) // Update every 30 seconds

    return () => clearInterval(timer)
  }, [])

  if (!timestamp) {
    return <span>Never</span>
  }

  const date = new Date(timestamp)
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)

  let timeAgo = ''
  let fullDate = ''

  if (diffInMinutes < 1) {
    timeAgo = 'Just now'
  } else if (diffInMinutes < 60) {
    timeAgo = `${diffInMinutes}m ago`
  } else if (diffInHours < 24) {
    timeAgo = `${diffInHours}h ago`
  } else {
    timeAgo = `${diffInDays}d ago`
  }

  // Full date for desktop
  fullDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(showTimeZone && { timeZoneName: 'short' })
  })

  return (
    <>
      {/* Desktop - show full date */}
      <span className="hidden md:inline" title={date.toLocaleString()}>
        {fullDate}
      </span>
      {/* Mobile - show relative time */}
      <span className="md:hidden" title={date.toLocaleString()}>
        {timeAgo}
      </span>
    </>
  )
}