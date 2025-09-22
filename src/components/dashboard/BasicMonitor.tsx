'use client'

import { useState, useEffect } from 'react'
import { Globe, Clock, CheckCircle, AlertCircle, TrendingUp, Activity } from 'lucide-react'

interface Site {
  id: string
  name: string
  url: string
  status: 'up' | 'down' | 'unknown'
  last_checked: string | null
}

interface BasicMonitorProps {
  site: Site
}

interface BasicStats {
  responseTime: number | null
  lastChecked: string | null
  status: 'up' | 'down' | 'unknown'
  checksToday: number
  uptimeToday: number
}

export default function BasicMonitor({ site }: BasicMonitorProps) {
  const [stats, setStats] = useState<BasicStats>({
    responseTime: null,
    lastChecked: site.last_checked,
    status: site.status,
    checksToday: 0,
    uptimeToday: 0
  })
  const [loading, setLoading] = useState(false)

  // Get basic site statistics
  const fetchBasicStats = async () => {
    try {
      // Mock basic stats for now - in a real implementation, this would call your uptime API
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Simulate some basic stats
      const mockStats: BasicStats = {
        responseTime: site.status === 'up' ? Math.floor(Math.random() * 800) + 200 : null,
        lastChecked: site.last_checked,
        status: site.status,
        checksToday: Math.floor(Math.random() * 50) + 10,
        uptimeToday: site.status === 'up' ? Math.floor(Math.random() * 10) + 90 : Math.floor(Math.random() * 50) + 20
      }

      setStats(mockStats)
    } catch (error) {
      console.error('Error fetching basic stats:', error)
    }
  }

  // Manual check function
  const runQuickCheck = async () => {
    setLoading(true)
    try {
      // This would make a real ping to your uptime monitoring API
      const response = await fetch(`/api/sites/${site.id}/ping`, {
        method: 'POST'
      })

      if (response.ok) {
        const result = await response.json()
        setStats(prev => ({
          ...prev,
          responseTime: result.responseTime,
          lastChecked: new Date().toISOString(),
          status: result.status,
          checksToday: prev.checksToday + 1
        }))
      }
    } catch (error) {
      console.error('Error running quick check:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBasicStats()
  }, [site.id])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up': return 'text-green-600'
      case 'down': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'up': return 'bg-green-100'
      case 'down': return 'bg-red-100'
      default: return 'bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'down': return <AlertCircle className="h-5 w-5 text-red-500" />
      default: return <Globe className="h-5 w-5 text-gray-400" />
    }
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
              <h3 className="text-lg font-medium text-gray-900">Website Monitoring</h3>
              <p className="text-sm text-gray-600">{site.name}</p>
            </div>
          </div>
          <button
            onClick={runQuickCheck}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <Activity className="h-4 w-4" />
            <span>{loading ? 'Checking...' : 'Quick Check'}</span>
          </button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getStatusBgColor(stats.status)}`}>
              {getStatusIcon(stats.status)}
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-900">
                <span className={getStatusColor(stats.status)}>
                  {stats.status.charAt(0).toUpperCase() + stats.status.slice(1)}
                </span>
              </h4>
              <p className="text-sm text-gray-600">
                Last checked: {formatDate(stats.lastChecked)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Basic Statistics */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Response Time */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-2xl font-semibold text-gray-900">
              {stats.responseTime ? `${stats.responseTime}ms` : 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Response Time</div>
          </div>

          {/* Checks Today */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Activity className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-2xl font-semibold text-gray-900">
              {stats.checksToday}
            </div>
            <div className="text-sm text-gray-600">Checks Today</div>
          </div>

          {/* Today's Uptime */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </div>
            <div className="text-2xl font-semibold text-gray-900">
              {stats.uptimeToday}%
            </div>
            <div className="text-sm text-gray-600">Today's Uptime</div>
          </div>
        </div>

        {/* Quick Info */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h5 className="text-sm font-medium text-blue-800 mb-2">Website Status</h5>
            <p className="text-sm text-blue-700">
              {stats.status === 'up'
                ? `Your website is currently online and responding in ${stats.responseTime || 'unknown'}ms.`
                : stats.status === 'down'
                ? 'Your website appears to be offline. We\'ll continue monitoring and alert you when it\'s back up.'
                : 'We\'re checking your website status. This may take a moment for new sites.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}