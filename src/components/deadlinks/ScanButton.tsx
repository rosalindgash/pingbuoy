'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ScanButtonProps {
  siteId: string
}

export default function ScanButton({ siteId }: ScanButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleScan = async () => {
    if (!confirm('This will start a new dead link scan. Existing scan results will be replaced. Continue?')) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/dead-links/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ siteId }),
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Scan started! Found ${data.brokenLinks} broken links out of ${data.totalLinks} total links.`)
        router.refresh()
      } else {
        const error = await response.text()
        alert('Error: ' + error)
      }
    } catch (_error) {
      alert('An error occurred while starting the scan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleScan} disabled={loading}>
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Search className="w-4 h-4 mr-2" />
      )}
      {loading ? 'Scanning...' : 'Start Scan'}
    </Button>
  )
}