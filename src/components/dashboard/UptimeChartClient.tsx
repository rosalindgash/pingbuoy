'use client'

import { useEffect, useState } from 'react'
import { getSiteHourlyUptimeData } from '@/lib/uptime-client'

interface UptimeChartClientProps {
  siteId: string
}

interface HourlyData {
  hour: number
  percentage: number
  status: 'up' | 'down' | 'partial'
  total: number
  up: number
}

export default function UptimeChartClient({ siteId }: UptimeChartClientProps) {
  const [chartData, setChartData] = useState<HourlyData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUptimeData = async () => {
      setLoading(true)
      try {
        const data = await getSiteHourlyUptimeData(siteId, 48) // Last 48 hours
        setChartData(data)
      } catch (error) {
        console.error('Error fetching uptime data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUptimeData()
  }, [siteId])

  if (loading) {
    return (
      <div className="h-8 bg-gray-100 rounded flex items-center justify-center">
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="h-8 bg-gray-100 rounded flex items-center justify-center">
        <span className="text-sm text-gray-500">No data available</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-gray-500">
        <span>48 hours ago</span>
        <span>Now</span>
      </div>
      <div className="flex space-x-1 h-8">
        {chartData.map((item, index) => (
          <div
            key={index}
            className={`flex-1 rounded-sm ${
              item.status === 'up' 
                ? 'bg-green-500' 
                : item.status === 'down' 
                ? 'bg-red-500' 
                : item.percentage > 50
                ? 'bg-yellow-500'
                : 'bg-red-400'
            }`}
            title={`${item.total > 0 ? item.percentage.toFixed(1) + '% uptime' : 'No data'} (${item.up}/${item.total} checks)`}
          />
        ))}
      </div>
    </div>
  )
}