'use client'

import { useState } from 'react'
import { Play, Activity, Link, Gauge } from 'lucide-react'

interface MonitoringTriggersProps {
  siteId: string
  siteName: string
  siteUrl: string
}

export default function MonitoringTriggers({ siteId, siteName, siteUrl }: MonitoringTriggersProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const triggerMonitoring = async (action: 'uptime' | 'performance' | 'deadlinks') => {
    setLoading(action)
    setError(null)
    setResults(null)

    try {
      const response = await fetch('/api/monitoring/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          siteId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger monitoring')
      }

      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(null)
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'uptime': return 'Check Uptime'
      case 'performance': return 'Check Performance'
      case 'deadlinks': return 'Scan Dead Links'
      default: return action
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'uptime': return <Activity className="h-4 w-4" />
      case 'performance': return <Gauge className="h-4 w-4" />
      case 'deadlinks': return <Link className="h-4 w-4" />
      default: return <Play className="h-4 w-4" />
    }
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-4">Manual Monitoring</h3>
      <p className="text-sm text-gray-600 mb-6">
        Trigger immediate monitoring checks for <strong>{siteName}</strong>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {(['uptime', 'performance', 'deadlinks'] as const).map((action) => (
          <button
            key={action}
            onClick={() => triggerMonitoring(action)}
            disabled={loading !== null}
            className={`flex items-center justify-center gap-2 px-4 py-3 border rounded-lg transition-colors ${
              loading === action
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {loading === action ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
            ) : (
              getActionIcon(action)
            )}
            {getActionLabel(action)}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {results && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-800 mb-2">
            {getActionLabel(results.result.type)} Complete
          </h4>

          {results.result.type === 'uptime' && (
            <div className="text-sm text-green-700">
              <p>Status: <span className="font-medium">{results.result.status}</span></p>
              {results.result.responseTime && (
                <p>Response Time: <span className="font-medium">{results.result.responseTime}ms</span></p>
              )}
              {results.result.statusCode && (
                <p>Status Code: <span className="font-medium">{results.result.statusCode}</span></p>
              )}
            </div>
          )}

          {results.result.type === 'performance' && (
            <div className="text-sm text-green-700">
              <p>Performance Score: <span className="font-medium">{results.result.performance_score || 'N/A'}</span></p>
              {results.result.lcp && (
                <p>LCP: <span className="font-medium">{results.result.lcp}ms</span></p>
              )}
              {results.result.fid && (
                <p>FID: <span className="font-medium">{results.result.fid}ms</span></p>
              )}
              {results.result.cls && (
                <p>CLS: <span className="font-medium">{results.result.cls}</span></p>
              )}
            </div>
          )}

          {results.result.type === 'deadlinks' && (
            <div className="text-sm text-green-700">
              <p>Total Links: <span className="font-medium">{results.result.totalLinks || 0}</span></p>
              <p>Broken Links: <span className="font-medium">{results.result.brokenLinks || 0}</span></p>
              {results.result.scanId && (
                <p>Scan ID: <span className="font-medium">{results.result.scanId}</span></p>
              )}
            </div>
          )}

          {results.result.error && (
            <p className="text-red-600 text-sm">Error: {results.result.error}</p>
          )}
        </div>
      )}
    </div>
  )
}