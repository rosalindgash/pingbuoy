'use client'

import { useEffect, useState } from 'react'
import { Clock, Zap, Crown } from 'lucide-react'
import { getUserMonitoringInfo, getNextCheckTime } from '@/lib/uptime-client'

interface MonitoringFrequencyProps {
  userPlan: 'free' | 'pro' | 'founder'
  siteId?: string
}

export default function MonitoringFrequency({ userPlan, siteId }: MonitoringFrequencyProps) {
  const [monitoringInfo, setMonitoringInfo] = useState<{
    plan: string
    frequency_display: string
    monitoring_frequency: string
  } | null>(null)
  const [nextCheckTime, setNextCheckTime] = useState<string | null>(null)
  const [timeUntilNext, setTimeUntilNext] = useState<string>('')

  useEffect(() => {
    fetchMonitoringInfo()
    if (siteId) {
      fetchNextCheckTime()
    }
  }, [siteId])

  useEffect(() => {
    if (nextCheckTime) {
      const interval = setInterval(updateTimeUntilNext, 1000)
      return () => clearInterval(interval)
    }
  }, [nextCheckTime])

  const fetchMonitoringInfo = async () => {
    try {
      const info = await getUserMonitoringInfo()
      if (info) {
        setMonitoringInfo(info)
      } else {
        console.warn('No monitoring info available - user may not be authenticated or have valid plan')
      }
    } catch (error) {
      console.error('Error fetching monitoring info:', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const fetchNextCheckTime = async () => {
    if (!siteId) return
    try {
      const nextTime = await getNextCheckTime(siteId)
      if (nextTime) {
        setNextCheckTime(nextTime)
      } else {
        console.warn('No next check time available - site may not exist or user may not have access')
      }
    } catch (error) {
      console.error('Error fetching next check time:', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const updateTimeUntilNext = () => {
    if (!nextCheckTime) return

    const now = new Date()
    const next = new Date(nextCheckTime)
    const diff = next.getTime() - now.getTime()

    if (diff <= 0) {
      setTimeUntilNext('Checking now...')
      // Refresh next check time when it's due
      setTimeout(fetchNextCheckTime, 2000)
      return
    }

    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    if (minutes > 0) {
      setTimeUntilNext(`${minutes}m ${remainingSeconds}s`)
    } else {
      setTimeUntilNext(`${remainingSeconds}s`)
    }
  }

  const getFrequencyInfo = () => {
    switch (userPlan) {
      case 'pro':
      case 'founder':
        return {
          frequency: '1 minute',
          icon: Zap,
          color: 'text-green-600 bg-green-50 border-green-200',
          description: 'Real-time monitoring'
        }
      default:
        return {
          frequency: '5 minutes',
          icon: Clock,
          color: 'text-blue-600 bg-blue-50 border-blue-200',
          description: 'Standard monitoring'
        }
    }
  }

  const frequencyInfo = getFrequencyInfo()
  const FrequencyIcon = frequencyInfo.icon

  return (
    <div className="space-y-3">
      {/* Monitoring Frequency Display */}
      <div className={`inline-flex items-center px-3 py-2 rounded-lg border ${frequencyInfo.color}`}>
        <FrequencyIcon className="w-4 h-4 mr-2" />
        <div className="text-sm">
          <span className="font-medium">Checks every {monitoringInfo?.frequency_display || frequencyInfo.frequency}</span>
          {userPlan === 'founder' && (
            <Crown className="w-3 h-3 ml-2 inline" />
          )}
        </div>
      </div>

      {/* Next Check Timer */}
      {siteId && timeUntilNext && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">Next check:</span> {timeUntilNext}
        </div>
      )}

      {/* Upgrade prompt for free users */}
      {userPlan === 'free' && (
        <div className="text-xs text-gray-500 mt-2">
          <span>Want faster monitoring? </span>
          <a href="/pricing" className="text-blue-600 hover:text-blue-800 font-medium">
            Upgrade to Pro
          </a>
          <span> for 1-minute checks</span>
        </div>
      )}
    </div>
  )
}