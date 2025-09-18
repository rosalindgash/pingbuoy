'use client'

import { useState } from 'react'
import {
  Activity,
  Zap,
  Clock,
  Smartphone,
  Monitor,
  Play,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PerformanceMetrics {
  lcp: number // Largest Contentful Paint (ms)
  fid: number // First Input Delay (ms)
  cls: number // Cumulative Layout Shift (score)
  fcp: number // First Contentful Paint (ms)
  ttfb: number // Time to First Byte (ms)
  speedIndex: number // Speed Index (ms)
  performanceScore: number // Overall score (0-100)
  hasFieldData: boolean
  fieldLcp?: number
  fieldFid?: number
  fieldCls?: number
  checkedAt: string
}

interface PerformanceCardProps {
  siteId: string
  siteName: string
  siteUrl: string
  latestMetrics?: PerformanceMetrics
  isProUser: boolean
  onRunCheck?: (strategy: 'mobile' | 'desktop') => void
  loading?: boolean
}

export default function PerformanceCard({
  siteId,
  siteName,
  siteUrl,
  latestMetrics,
  isProUser,
  onRunCheck,
  loading = false
}: PerformanceCardProps) {
  const [strategy, setStrategy] = useState<'mobile' | 'desktop'>('mobile')

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-100'
    if (score >= 50) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  const getMetricStatus = (metric: number, thresholds: { good: number; needs: number }) => {
    if (metric <= thresholds.good) return 'good'
    if (metric <= thresholds.needs) return 'needs-improvement'
    return 'poor'
  }

  const getMetricColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600'
      case 'needs-improvement': return 'text-yellow-600'
      case 'poor': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getMetricIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'needs-improvement': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'poor': return <AlertTriangle className="h-4 w-4 text-red-500" />
      default: return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isProUser) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Activity className="h-6 w-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900">Core Web Vitals</h3>
            <p className="text-sm text-gray-600">{siteName}</p>
          </div>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Pro
          </span>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">Pro Feature</h4>
              <p className="text-sm text-blue-700 mt-1">
                Core Web Vitals monitoring tracks LCP, FID, CLS and other performance metrics.
                Upgrade to Pro to monitor your site's user experience and SEO performance.
              </p>
              <button className="mt-3 text-sm font-medium text-blue-800 hover:text-blue-900">
                Upgrade to Pro →
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Core Web Vitals</h3>
              <p className="text-sm text-gray-600">{siteName}</p>
            </div>
          </div>

          {/* Strategy Toggle */}
          <div className="flex items-center space-x-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setStrategy('mobile')}
                className={`flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  strategy === 'mobile'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Smartphone className="h-4 w-4 mr-1" />
                Mobile
              </button>
              <button
                onClick={() => setStrategy('desktop')}
                className={`flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  strategy === 'desktop'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Monitor className="h-4 w-4 mr-1" />
                Desktop
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Score */}
      {latestMetrics && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getScoreBgColor(latestMetrics.performanceScore)}`}>
                <span className={`text-2xl font-bold ${getScoreColor(latestMetrics.performanceScore)}`}>
                  {latestMetrics.performanceScore}
                </span>
              </div>
              <div>
                <h4 className="text-lg font-medium text-gray-900">Performance Score</h4>
                <p className="text-sm text-gray-600">
                  Last checked: {formatDate(latestMetrics.checkedAt)}
                </p>
              </div>
            </div>

            <Button
              onClick={() => onRunCheck?.(strategy)}
              disabled={loading}
              size="sm"
              className="flex items-center space-x-2"
            >
              <Play className="h-4 w-4" />
              <span>{loading ? 'Checking...' : 'Run Check'}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Core Web Vitals Metrics */}
      {latestMetrics ? (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* LCP */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {getMetricIcon(getMetricStatus(latestMetrics.lcp, { good: 2500, needs: 4000 }))}
                <span className="text-sm font-medium text-gray-700">LCP</span>
              </div>
              <div className={`text-2xl font-bold ${getMetricColor(getMetricStatus(latestMetrics.lcp, { good: 2500, needs: 4000 }))}`}>
                {formatDuration(latestMetrics.lcp)}
              </div>
              <p className="text-xs text-gray-500">Largest Contentful Paint</p>
              {latestMetrics.hasFieldData && latestMetrics.fieldLcp && (
                <p className="text-xs text-gray-600">
                  Real users: {formatDuration(latestMetrics.fieldLcp)}
                </p>
              )}
            </div>

            {/* FID */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {getMetricIcon(getMetricStatus(latestMetrics.fid, { good: 100, needs: 300 }))}
                <span className="text-sm font-medium text-gray-700">FID</span>
              </div>
              <div className={`text-2xl font-bold ${getMetricColor(getMetricStatus(latestMetrics.fid, { good: 100, needs: 300 }))}`}>
                {formatDuration(latestMetrics.fid)}
              </div>
              <p className="text-xs text-gray-500">First Input Delay</p>
              {latestMetrics.hasFieldData && latestMetrics.fieldFid && (
                <p className="text-xs text-gray-600">
                  Real users: {formatDuration(latestMetrics.fieldFid)}
                </p>
              )}
            </div>

            {/* CLS */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {getMetricIcon(getMetricStatus(latestMetrics.cls, { good: 0.1, needs: 0.25 }))}
                <span className="text-sm font-medium text-gray-700">CLS</span>
              </div>
              <div className={`text-2xl font-bold ${getMetricColor(getMetricStatus(latestMetrics.cls, { good: 0.1, needs: 0.25 }))}`}>
                {latestMetrics.cls.toFixed(3)}
              </div>
              <p className="text-xs text-gray-500">Cumulative Layout Shift</p>
              {latestMetrics.hasFieldData && latestMetrics.fieldCls && (
                <p className="text-xs text-gray-600">
                  Real users: {latestMetrics.fieldCls.toFixed(3)}
                </p>
              )}
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h5 className="text-sm font-medium text-gray-900 mb-3">Additional Metrics</h5>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {formatDuration(latestMetrics.fcp)}
                </div>
                <div className="text-xs text-gray-500">First Contentful Paint</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {formatDuration(latestMetrics.ttfb)}
                </div>
                <div className="text-xs text-gray-500">Time to First Byte</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {formatDuration(latestMetrics.speedIndex)}
                </div>
                <div className="text-xs text-gray-500">Speed Index</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center">
          <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Performance Data</h4>
          <p className="text-sm text-gray-600 mb-4">
            Run your first Core Web Vitals check to see how your site performs.
          </p>
          <Button
            onClick={() => onRunCheck?.(strategy)}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <Play className="h-4 w-4" />
            <span>{loading ? 'Running Check...' : 'Run First Check'}</span>
          </Button>
        </div>
      )}
    </div>
  )
}