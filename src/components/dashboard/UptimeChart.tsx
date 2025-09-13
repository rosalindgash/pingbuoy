import { getSiteRecentLogs } from '@/lib/uptime'

interface UptimeChartProps {
  siteId: string
}

export default async function UptimeChart({ siteId }: UptimeChartProps) {
  const logs = await getSiteRecentLogs(siteId, 288) // Last 24 hours (5-min intervals)

  if (logs.length === 0) {
    return (
      <div className="h-8 bg-gray-100 rounded flex items-center justify-center">
        <span className="text-sm text-gray-500">No data available</span>
      </div>
    )
  }

  // Group logs by hour for better visualization
  const hourlyData = logs.reduce((acc, log) => {
    const hour = new Date(log.checked_at).getHours()
    const key = hour.toString()
    
    if (!Object.prototype.hasOwnProperty.call(acc, key)) {
      acc[key] = { up: 0, down: 0, total: 0 }
    }
    
    if (log.status === 'up' || log.status === 'down') {
      acc[key][log.status]++
      acc[key].total++
    }
    
    return acc
  }, {} as Record<string, { up: number, down: number, total: number }>)

  // Create array of 24 hours
  const chartData = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString()
    const data = Object.prototype.hasOwnProperty.call(hourlyData, hour) 
      ? hourlyData[hour] 
      : { up: 0, down: 0, total: 0 }
    const percentage = data.total > 0 ? (data.up / data.total) * 100 : 100
    
    return {
      hour: i,
      percentage,
      status: percentage >= 100 ? 'up' : percentage === 0 ? 'down' : 'partial'
    }
  })

  return (
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
          title={`Hour ${item.hour}: ${item.percentage.toFixed(1)}% uptime`}
        />
      ))}
    </div>
  )
}