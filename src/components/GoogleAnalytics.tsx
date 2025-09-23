'use client'

import { useEffect } from 'react'
import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals'

// Function to send Core Web Vitals to Google Analytics and our database
function sendToAnalytics({ name, value, id }: { name: string; value: number; id: string }) {
  // Send to Google Analytics
  if (typeof gtag !== 'undefined') {
    gtag('event', name, {
      value: Math.round(value),
      event_category: 'Web Vitals',
      event_label: id,
      // Use a non-interaction event to avoid affecting bounce rate
      non_interaction: true,
    })
  }

  // Also send to our own database for the Core Web Vitals dashboard
  fetch('/api/core-web-vitals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      metric: name,
      value: value,
      id: id,
      url: window.location.href,
      timestamp: Date.now(),
    }),
  }).catch(console.error)
}

export default function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  useEffect(() => {
    // Measure Core Web Vitals and send to both GA4 and our database
    onCLS(sendToAnalytics)
    onINP(sendToAnalytics) // INP replaced FID as the official Core Web Vital
    onFCP(sendToAnalytics)
    onLCP(sendToAnalytics)
    onTTFB(sendToAnalytics)
  }, [])

  // No need to render scripts since gtag is already in <head>
  return null
}