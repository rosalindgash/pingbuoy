'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Activity,
  TrendingUp,
  ExternalLink,
  Zap,
  Globe,
  Shield
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DailyUptime {
  date: string
  status: 'up' | 'down' | 'degraded' | 'no-data'
  uptime: number | null
}

interface ServiceStatus {
  name: string
  description: string
  status: 'operational' | 'degraded' | 'outage' | 'unknown'
  uptime: number
  responseTime: number | null
  lastChecked?: string
  dailyUptime?: DailyUptime[]
}

interface IncidentUpdate {
  id: string
  status: string
  message: string
  created_at: string
}

interface Incident {
  id: string
  title: string
  description: string
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved'
  impact: 'none' | 'minor' | 'major' | 'critical'
  started_at: string
  resolved_at: string | null
  updates: IncidentUpdate[]
}

interface SystemMetrics {
  totalSitesMonitored: number
  checksPerformed24h: number
  averageResponseTime: number
  systemUptime: number
}

interface StatusData {
  services: ServiceStatus[]
  metrics: SystemMetrics
  incidents: Incident[]
  lastUpdated: string
  error?: string
}

export default function StatusPage() {
  const [statusData, setStatusData] = useState<StatusData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStatusData()

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchStatusData, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchStatusData = async () => {
    try {
      console.log('Fetching status data from /api/public/status')
      const response = await fetch('/api/public/status')

      if (!response.ok) {
        console.error('Status API returned error:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('Error response:', errorText)
        throw new Error(`API returned ${response.status}`)
      }

      const data = await response.json()
      console.log('Status API response:', data)

      // Transform API data to include descriptions
      const servicesWithDescriptions = data.services.map((service: any) => ({
        ...service,
        description: getServiceDescription(service.name)
      }))

      setStatusData({
        ...data,
        services: servicesWithDescriptions
      })
    } catch (error) {
      console.error('Failed to fetch status data:', error)
      setStatusData({
        services: [],
        metrics: {
          totalSitesMonitored: 0,
          checksPerformed24h: 0,
          averageResponseTime: 0,
          systemUptime: 0
        },
        incidents: [],
        lastUpdated: new Date().toISOString(),
        error: 'Unable to fetch current status'
      })
    } finally {
      setLoading(false)
    }
  }

  const getServiceDescription = (name: string) => {
    const descriptions: Record<string, string> = {
      'Website Monitoring': 'Core uptime monitoring and alerting system',
      'API Services': 'REST API for monitoring and integrations',
      'Page Speed Analysis': 'Performance monitoring using Google PageSpeed Insights',
      'SSL Monitoring': 'SSL certificate validation and expiry tracking',
      'Email Notifications': 'Alert delivery and notification system'
    }
    return descriptions[name] || 'PingBuoy service component'
  }

// Status components
function StatusBadge({ status }: { status: string }) {
  const config = {
    operational: { icon: CheckCircle, text: 'Operational', className: 'text-green-600 bg-green-100' },
    degraded: { icon: AlertTriangle, text: 'Degraded', className: 'text-yellow-600 bg-yellow-100' },
    partial_outage: { icon: XCircle, text: 'Partial Outage', className: 'text-orange-600 bg-orange-100' },
    major_outage: { icon: XCircle, text: 'Major Outage', className: 'text-red-600 bg-red-100' },
    maintenance: { icon: Clock, text: 'Maintenance', className: 'text-blue-600 bg-blue-100' }
  }
  
  const { icon: Icon, text, className } = config[status as keyof typeof config] || config.operational
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      <Icon className="h-3 w-3 mr-1" />
      {text}
    </span>
  )
}

function UptimeBar({ dailyUptime }: { dailyUptime: DailyUptime[] }) {
  const getBarColor = (status: string) => {
    switch (status) {
      case 'up':
        return 'bg-green-500'
      case 'degraded':
        return 'bg-yellow-500'
      case 'down':
        return 'bg-red-500'
      default:
        return 'bg-gray-300'
    }
  }

  return (
    <div className="flex gap-[2px] h-8 items-end">
      {dailyUptime.map((day, index) => (
        <div
          key={index}
          className={`flex-1 rounded-sm ${getBarColor(day.status)} transition-all hover:opacity-80 cursor-pointer`}
          title={`${day.date}: ${day.uptime !== null ? day.uptime + '%' : 'No data'}`}
        />
      ))}
    </div>
  )
}

function ServiceCard({ service }: { service: ServiceStatus }) {
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{service.name}</h3>
          <p className="text-sm text-gray-600">{service.description}</p>
        </div>
        <StatusBadge status={service.status} />
      </div>

      {service.dailyUptime && service.dailyUptime.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-600">Last 30 days</p>
            <p className="text-xs text-gray-600">Today</p>
          </div>
          <UptimeBar dailyUptime={service.dailyUptime} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Uptime (30d)</p>
          <p className="text-lg font-semibold text-gray-900">{service.uptime}%</p>
        </div>
        {service.responseTime && (
          <div>
            <p className="text-gray-600">Response Time</p>
            <p className="text-lg font-semibold text-gray-900">{service.responseTime}ms</p>
          </div>
        )}
        {service.lastChecked && (
          <div>
            <p className="text-gray-600">Last Checked</p>
            <p className="text-lg font-semibold text-gray-900">{formatTime(service.lastChecked)}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function IncidentCard({ incident }: { incident: Incident }) {
  const getStatusBadge = (status: string) => {
    const config = {
      investigating: { text: 'Investigating', className: 'bg-yellow-100 text-yellow-800' },
      identified: { text: 'Identified', className: 'bg-orange-100 text-orange-800' },
      monitoring: { text: 'Monitoring', className: 'bg-blue-100 text-blue-800' },
      resolved: { text: 'Resolved', className: 'bg-green-100 text-green-800' }
    }

    const { text, className } = config[status as keyof typeof config] || config.investigating

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
        {text}
      </span>
    )
  }

  const getImpactBadge = (impact: string) => {
    const config = {
      none: { text: 'No Impact', className: 'bg-gray-100 text-gray-800' },
      minor: { text: 'Minor', className: 'bg-blue-100 text-blue-800' },
      major: { text: 'Major', className: 'bg-orange-100 text-orange-800' },
      critical: { text: 'Critical', className: 'bg-red-100 text-red-800' }
    }

    const { text, className } = config[impact as keyof typeof config] || config.none

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
        {text}
      </span>
    )
  }

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{incident.title}</h3>
          <div className="flex gap-2 mb-3">
            {getStatusBadge(incident.status)}
            {getImpactBadge(incident.impact)}
          </div>
          <p className="text-sm text-gray-600">{incident.description}</p>
        </div>
      </div>

      {incident.updates && incident.updates.length > 0 && (
        <div className="mt-4 border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Updates</h4>
          <div className="space-y-3">
            {incident.updates.map((update) => (
              <div key={update.id} className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-2"></div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusBadge(update.status)}
                    <span className="text-xs text-gray-500">{formatDateTime(update.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-600">{update.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-gray-500">
        <span>Started: {formatDateTime(incident.started_at)}</span>
        {incident.resolved_at && (
          <span>Resolved: {formatDateTime(incident.resolved_at)}</span>
        )}
      </div>
    </div>
  )
}



  const getOverallStatus = () => {
    if (!statusData?.services.length) return 'unknown'

    if (statusData.services.some(s => s.status === 'outage')) return 'outage'
    if (statusData.services.some(s => s.status === 'degraded')) return 'degraded'
    return 'operational'
  }

  const getOverallStatusText = () => {
    const status = getOverallStatus()
    switch (status) {
      case 'operational': return 'All Systems Operational'
      case 'degraded': return 'Some Systems Experiencing Issues'
      case 'outage': return 'Service Disruption'
      default: return 'Status Unknown'
    }
  }

  const getOverallStatusColor = () => {
    const status = getOverallStatus()
    switch (status) {
      case 'operational': return 'text-green-600'
      case 'degraded': return 'text-yellow-600'
      case 'outage': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-pulse mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading status information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <Image
                  src="/ping-buoy-header-logo.png"
                  alt="PingBuoy"
                  width={150}
                  height={40}
                  className="h-10 w-auto"
                />
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                Back to Website
              </Link>
              <Link href="/login">
                <Button variant="outline">Login</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Activity className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">PingBuoy System Status</h1>
          </div>
          <div className={`text-2xl font-semibold mb-2 ${getOverallStatusColor()}`}>
            {getOverallStatusText()}
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Real-time status and performance monitoring for all PingBuoy services.
            We're committed to transparency about our system performance.
          </p>
          {statusData?.lastUpdated && (
            <p className="text-sm text-gray-500 mt-2">
              Last updated: {new Date(statusData.lastUpdated).toLocaleString()} (CST)
            </p>
          )}
          {statusData?.error && (
            <p className="text-sm text-red-600 mt-2">{statusData.error}</p>
          )}
        </div>

        {/* Services Status */}
        {statusData?.services && statusData.services.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Services</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {statusData.services.map((service, index) => (
                <ServiceCard key={index} service={service} />
              ))}
            </div>
          </section>
        )}

        {/* Past Incidents */}
        {statusData?.incidents && statusData.incidents.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Past Incidents</h2>
            <div className="space-y-4">
              {statusData.incidents.map((incident) => (
                <IncidentCard key={incident.id} incident={incident} />
              ))}
            </div>
          </section>
        )}

        {statusData?.incidents && statusData.incidents.length === 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Past Incidents</h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <p className="text-gray-600">No incidents reported in the last 30 days</p>
            </div>
          </section>
        )}

        {/* Footer Links */}
        <div className="text-center pt-8 border-t border-gray-200">
          <div className="flex justify-center space-x-6 text-sm text-gray-600">
            <Link href="/" className="hover:text-gray-900">
              PingBuoy Home
            </Link>
            <Link href="/contact" className="hover:text-gray-900">
              Contact Support
            </Link>
            <a 
              href="https://twitter.com/pingbuoy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-gray-900 flex items-center"
            >
              Follow Updates <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Status page powered by PingBuoy monitoring infrastructure
          </p>
        </div>
      </div>
    </div>
  )
}