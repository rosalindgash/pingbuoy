'use client'

import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface PerformanceData {
  checkedAt: string
  performanceScore: number
  lcp: number
  fid: number
  cls: number
}

interface PerformanceChartProps {
  data: PerformanceData[]
  metric: 'performanceScore' | 'lcp' | 'fid' | 'cls'
  title: string
  unit?: string
  className?: string
}

export default function PerformanceChart({
  data,
  metric,
  title,
  unit = '',
  className = ''
}: PerformanceChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { points: [], min: 0, max: 100, trend: 'stable' as const }

    const values = data.map(d => d[metric]).filter(v => v != null)
    if (values.length === 0) return { points: [], min: 0, max: 100, trend: 'stable' as const }

    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1

    // Create SVG path points
    const points = data.map((d, index) => {
      const x = (index / (data.length - 1)) * 100
      const y = 100 - ((d[metric] - min) / range) * 100
      return { x, y, value: d[metric], date: d.checkedAt }
    })

    // Calculate trend
    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (values.length > 1) {
      const firstValue = values[0]
      const lastValue = values[values.length - 1]
      const change = ((lastValue - firstValue) / firstValue) * 100

      if (metric === 'performanceScore') {
        // Higher is better for performance score
        trend = change > 5 ? 'up' : change < -5 ? 'down' : 'stable'
      } else {
        // Lower is better for timing metrics
        trend = change < -5 ? 'up' : change > 5 ? 'down' : 'stable'
      }
    }

    return { points, min, max, trend }
  }, [data, metric])

  const getTrendIcon = () => {
    switch (chartData.trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  const getTrendColor = () => {
    switch (chartData.trend) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const formatValue = (value: number) => {
    if (metric === 'cls') {
      return value.toFixed(3)
    }
    if (metric === 'performanceScore') {
      return Math.round(value).toString()
    }
    // Timing metrics
    if (value < 1000) {
      return `${Math.round(value)}ms`
    }
    return `${(value / 1000).toFixed(1)}s`
  }

  const getMetricColor = (value: number) => {
    switch (metric) {
      case 'performanceScore':
        if (value >= 90) return 'text-green-600'
        if (value >= 50) return 'text-yellow-600'
        return 'text-red-600'
      case 'lcp':
        if (value <= 2500) return 'text-green-600'
        if (value <= 4000) return 'text-yellow-600'
        return 'text-red-600'
      case 'fid':
        if (value <= 100) return 'text-green-600'
        if (value <= 300) return 'text-yellow-600'
        return 'text-red-600'
      case 'cls':
        if (value <= 0.1) return 'text-green-600'
        if (value <= 0.25) return 'text-yellow-600'
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  if (!data || data.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <h4 className="text-sm font-medium text-gray-900 mb-4">{title}</h4>
        <div className="text-center py-8">
          <div className="text-gray-400 text-sm">No data available</div>
        </div>
      </div>
    )
  }

  const latestValue = data[data.length - 1]?.[metric]

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-900">{title}</h4>
        <div className="flex items-center space-x-2">
          {getTrendIcon()}
          <span className={`text-sm font-medium ${getTrendColor()}`}>
            {latestValue != null ? formatValue(latestValue) : 'N/A'}
          </span>
        </div>
      </div>

      <div className="relative h-24 mb-4">
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          <defs>
            <pattern
              id={`grid-${metric}`}
              width="10"
              height="25"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 10 0 L 0 0 0 25"
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100" height="100" fill={`url(#grid-${metric})`} />

          {/* Chart line */}
          {chartData.points.length > 1 && (
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              points={chartData.points.map(p => `${p.x},${p.y}`).join(' ')}
            />
          )}

          {/* Data points */}
          {chartData.points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="2"
              fill="#3b82f6"
              className="hover:r-3 transition-all cursor-pointer"
            >
              <title>
                {formatValue(point.value)} - {new Date(point.date).toLocaleDateString()}
              </title>
            </circle>
          ))}
        </svg>
      </div>

      {/* Value display */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>{data.length} checks</span>
        <span className={getMetricColor(latestValue || 0)}>
          Latest: {latestValue != null ? formatValue(latestValue) : 'N/A'}
        </span>
      </div>
    </div>
  )
}