'use client'

import { useState, useEffect } from 'react'
// Simple toast notification function
const toast = {
  success: (message: string) => {
    console.log('SUCCESS:', message)
    alert(`✅ ${message}`)
  },
  error: (message: string) => {
    console.log('ERROR:', message)
    alert(`❌ ${message}`)
  }
}
import PerformanceCard from './PerformanceCard'
import PerformanceChart from './PerformanceChart'

interface Site {
  id: string
  name: string
  url: string
}

interface PerformanceData {
  id: string
  lcp: number
  fid: number
  cls: number
  fcp: number
  ttfb: number
  speedIndex: number
  performanceScore: number
  hasFieldData: boolean
  fieldLcp?: number
  fieldFid?: number
  fieldCls?: number
  strategy: 'mobile' | 'desktop'
  checkedAt: string
  status: string
}

interface PerformanceMonitorProps {
  site: Site
  isProUser: boolean
}

export default function PerformanceMonitor({ site, isProUser }: PerformanceMonitorProps) {
  const [latestMetrics, setLatestMetrics] = useState<PerformanceData | null>(null)
  const [historyData, setHistoryData] = useState<PerformanceData[]>([])
  const [loading, setLoading] = useState(false)
  const [strategy, setStrategy] = useState<'mobile' | 'desktop'>('mobile')
  const [initialLoad, setInitialLoad] = useState(true)

  // Fetch performance data
  const fetchPerformanceData = async (selectedStrategy?: 'mobile' | 'desktop') => {
    if (!isProUser) return

    const currentStrategy = selectedStrategy || strategy

    try {
      const response = await fetch(`/api/performance/${site.id}?strategy=${currentStrategy}&limit=30`)
      const result = await response.json()

      if (!response.ok) {
        console.error('Failed to fetch performance data:', result.error)
        return
      }

      const logs = result.data.logs || []
      setHistoryData(logs)

      if (logs.length > 0) {
        setLatestMetrics(logs[0]) // Most recent is first
      } else {
        setLatestMetrics(null)
      }
    } catch (error) {
      console.error('Error fetching performance data:', error)
    } finally {
      setInitialLoad(false)
    }
  }

  // Run performance check
  const runPerformanceCheck = async (checkStrategy: 'mobile' | 'desktop') => {
    if (!isProUser) {
      toast.error('Core Web Vitals monitoring is a Pro feature')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/performance/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId: site.id,
          strategy: checkStrategy
        })
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Performance check failed')
        return
      }

      toast.success('Performance check completed')

      // Add the new result to our data
      const newMetric = result.data
      setLatestMetrics(newMetric)
      setHistoryData(prev => [newMetric, ...prev.slice(0, 29)]) // Keep last 30

    } catch (error) {
      console.error('Error running performance check:', error)
      toast.error('Failed to run performance check')
    } finally {
      setLoading(false)
    }
  }

  // Load initial data
  useEffect(() => {
    fetchPerformanceData()
  }, [site.id, strategy, isProUser])

  // Handle strategy change
  const handleStrategyChange = (newStrategy: 'mobile' | 'desktop') => {
    setStrategy(newStrategy)
    fetchPerformanceData(newStrategy)
  }

  if (initialLoad && isProUser) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Performance Card */}
      <PerformanceCard
        siteId={site.id}
        siteName={site.name}
        siteUrl={site.url}
        latestMetrics={latestMetrics}
        isProUser={isProUser}
        onRunCheck={runPerformanceCheck}
        loading={loading}
      />

      {/* Performance Charts - Only show for Pro users with data */}
      {isProUser && historyData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <PerformanceChart
            data={historyData}
            metric="performanceScore"
            title="Performance Score"
            className="col-span-1"
          />
          <PerformanceChart
            data={historyData}
            metric="lcp"
            title="Largest Contentful Paint"
            unit="ms"
            className="col-span-1"
          />
          <PerformanceChart
            data={historyData}
            metric="fid"
            title="First Input Delay"
            unit="ms"
            className="col-span-1"
          />
          <PerformanceChart
            data={historyData}
            metric="cls"
            title="Cumulative Layout Shift"
            className="col-span-1"
          />
        </div>
      )}

      {/* Performance Insights - Only for Pro users with data */}
      {isProUser && latestMetrics && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Insights</h3>
          <div className="space-y-4">

            {/* LCP Insights */}
            {latestMetrics.lcp > 2500 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800">Slow Largest Contentful Paint</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Your LCP is {(latestMetrics.lcp / 1000).toFixed(1)}s. Consider optimizing images,
                  removing unused CSS, and implementing lazy loading to improve load times.
                </p>
              </div>
            )}

            {/* CLS Insights */}
            {latestMetrics.cls > 0.1 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800">Layout Shift Issues</h4>
                <p className="text-sm text-red-700 mt-1">
                  Your CLS score is {latestMetrics.cls.toFixed(3)}. Reserve space for images and ads,
                  and avoid inserting content above existing content.
                </p>
              </div>
            )}

            {/* Good Performance */}
            {latestMetrics.performanceScore >= 90 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800">Excellent Performance!</h4>
                <p className="text-sm text-green-700 mt-1">
                  Your site has great Core Web Vitals scores. This helps with both user experience and SEO rankings.
                </p>
              </div>
            )}

            {/* Field Data Available */}
            {latestMetrics.hasFieldData && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800">Real User Data Available</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Your site has enough traffic to provide real user metrics from the Chrome UX Report.
                  These field metrics represent actual user experiences.
                </p>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}