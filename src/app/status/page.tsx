import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { 
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Activity,
  Calendar,
  TrendingUp,
  Mail,
  ExternalLink,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata.status

// Mock data - in production this would come from the database
const mockServices = [
  {
    id: '1',
    name: 'Website',
    description: 'Main PingBuoy website and user interface',
    status: 'operational',
    uptime: 99.99,
    responseTime: 245,
    lastChecked: '2025-01-12T10:45:00Z'
  },
  {
    id: '2',
    name: 'API',
    description: 'PingBuoy REST API for monitoring and integrations',
    status: 'operational',
    uptime: 99.95,
    responseTime: 156,
    lastChecked: '2025-01-12T10:44:30Z'
  },
  {
    id: '3',
    name: 'Monitoring Engine',
    description: 'Website monitoring and alerting system',
    status: 'operational',
    uptime: 99.98,
    responseTime: null,
    lastChecked: '2025-01-12T10:45:15Z'
  },
  {
    id: '4',
    name: 'Database',
    description: 'Primary database cluster',
    status: 'operational',
    uptime: 100.0,
    responseTime: 12,
    lastChecked: '2025-01-12T10:45:20Z'
  },
  {
    id: '5',
    name: 'CDN',
    description: 'Content delivery network for global performance',
    status: 'degraded',
    uptime: 98.5,
    responseTime: 890,
    lastChecked: '2025-01-12T10:44:45Z'
  }
]

const mockIncidents = [
  {
    id: '1',
    title: 'Intermittent CDN Slowdowns',
    description: 'Some users may experience slower loading times due to CDN performance issues.',
    status: 'monitoring',
    impact: 'minor',
    startedAt: '2025-01-12T09:30:00Z',
    updates: [
      {
        id: '1',
        status: 'monitoring',
        message: 'We are continuing to monitor the CDN performance and have implemented additional caching layers.',
        createdAt: '2025-01-12T10:15:00Z'
      },
      {
        id: '2',
        status: 'identified',
        message: 'We have identified the root cause as a configuration issue with one of our CDN providers.',
        createdAt: '2025-01-12T09:45:00Z'
      },
      {
        id: '3',
        status: 'investigating',
        message: 'We are investigating reports of slower loading times for some users.',
        createdAt: '2025-01-12T09:30:00Z'
      }
    ]
  }
]

const mockMaintenance = [
  {
    id: '1',
    title: 'Database Maintenance Window',
    description: 'Scheduled maintenance for database performance optimization. Brief service interruptions may occur.',
    scheduledStart: '2025-01-15T02:00:00Z',
    scheduledEnd: '2025-01-15T04:00:00Z',
    status: 'scheduled'
  }
]

// Uptime data for the last 90 days (mock data)
const mockUptimeData = Array.from({ length: 90 }, (_, i) => {
  const date = new Date()
  date.setDate(date.getDate() - (89 - i))
  return {
    date: date.toISOString().split('T')[0],
    uptime: Math.random() > 0.05 ? 100 : Math.random() * 100
  }
})

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

function ServiceCard({ service }: { service: typeof mockServices[0] }) {
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
        <div>
          <p className="text-gray-600">Last Checked</p>
          <p className="text-lg font-semibold text-gray-900">{formatTime(service.lastChecked)}</p>
        </div>
      </div>
    </div>
  )
}

function IncidentCard({ incident }: { incident: typeof mockIncidents[0] }) {
  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getImpactColor = (impact: string) => {
    const colors = {
      minor: 'text-yellow-800 bg-yellow-100',
      major: 'text-orange-800 bg-orange-100',
      critical: 'text-red-800 bg-red-100'
    }
    return colors[impact as keyof typeof colors] || colors.minor
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{incident.title}</h3>
          <p className="text-gray-600 mb-3">{incident.description}</p>
          <div className="flex items-center space-x-3">
            <StatusBadge status={incident.status} />
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getImpactColor(incident.impact)}`}>
              {incident.impact.charAt(0).toUpperCase() + incident.impact.slice(1)} Impact
            </span>
          </div>
        </div>
      </div>
      
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Updates</h4>
        <div className="space-y-3">
          {incident.updates.slice(0, 3).map((update) => (
            <div key={update.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <StatusBadge status={update.status} />
                  <span className="text-xs text-gray-500">
                    {formatDateTime(update.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{update.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function UptimeChart() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">90-Day Uptime History</h3>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>100% Uptime</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Downtime</span>
          </div>
        </div>
      </div>
      
      {/* Simple uptime chart visualization */}
      <div className="grid grid-cols-10 gap-1">
        {mockUptimeData.map((day, index) => (
          <div
            key={index}
            className={`h-8 rounded-sm ${
              day.uptime === 100 ? 'bg-green-500' : 'bg-red-500'
            }`}
            title={`${day.date}: ${day.uptime.toFixed(1)}% uptime`}
          />
        ))}
      </div>
      
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>90 days ago</span>
        <span>Today</span>
      </div>
    </div>
  )
}

function EmailSubscription() {
  return (
    <div className="bg-blue-50 rounded-lg p-6">
      <div className="flex items-start">
        <Mail className="h-6 w-6 text-blue-600 mt-1 mr-3" />
        <div className="flex-1">
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            Get Status Updates
          </h3>
          <p className="text-blue-800 mb-4">
            Subscribe to get notified about incidents and maintenance windows via email.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              placeholder="Enter your email address"
              className="flex-1 px-4 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button className="bg-blue-600 hover:bg-blue-700">
              Subscribe
            </Button>
          </div>
          <p className="text-xs text-blue-700 mt-2">
            We'll only send you important status updates. No spam, ever.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function StatusPage() {
  // Calculate overall status
  const overallStatus = mockServices.some(s => s.status === 'major_outage') 
    ? 'major_outage'
    : mockServices.some(s => s.status === 'partial_outage')
    ? 'partial_outage'
    : mockServices.some(s => s.status === 'degraded')
    ? 'degraded'
    : 'operational'

  const getOverallStatusText = () => {
    switch (overallStatus) {
      case 'operational': return 'All Systems Operational'
      case 'degraded': return 'Some Systems Degraded'
      case 'partial_outage': return 'Partial Service Outage'
      case 'major_outage': return 'Major Service Outage'
      default: return 'System Status Unknown'
    }
  }

  const getOverallStatusColor = () => {
    switch (overallStatus) {
      case 'operational': return 'text-green-600'
      case 'degraded': return 'text-yellow-600'
      case 'partial_outage': return 'text-orange-600'
      case 'major_outage': return 'text-red-600'
      default: return 'text-gray-600'
    }
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
              <Link href="/dashboard">
                <Button variant="outline">Dashboard</Button>
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
        </div>

        {/* Current Incidents */}
        {mockIncidents.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Current Incidents</h2>
              <Link href="#" className="text-blue-600 hover:text-blue-800 text-sm">
                View All Incidents →
              </Link>
            </div>
            <div className="space-y-6">
              {mockIncidents.map((incident) => (
                <IncidentCard key={incident.id} incident={incident} />
              ))}
            </div>
          </section>
        )}

        {/* Services Status */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Services</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {mockServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </section>

        {/* Uptime Chart */}
        <section className="mb-12">
          <UptimeChart />
        </section>

        {/* Scheduled Maintenance */}
        {mockMaintenance.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Scheduled Maintenance</h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {mockMaintenance.map((maintenance) => (
                <div key={maintenance.id} className="flex items-start">
                  <Calendar className="h-5 w-5 text-blue-600 mt-1 mr-3" />
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {maintenance.title}
                    </h3>
                    <p className="text-gray-600 mb-3">{maintenance.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>
                        <strong>Start:</strong> {new Date(maintenance.scheduledStart).toLocaleString()}
                      </span>
                      <span>
                        <strong>End:</strong> {new Date(maintenance.scheduledEnd).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Email Subscription */}
        <section className="mb-12">
          <EmailSubscription />
        </section>

        {/* Overall Statistics */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Performance Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
              <div className="flex items-center justify-center mb-4">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">99.97%</div>
              <p className="text-gray-600">Overall Uptime (30d)</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
              <div className="flex items-center justify-center mb-4">
                <Zap className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">185ms</div>
              <p className="text-gray-600">Average Response Time</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
              <div className="flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">5</div>
              <p className="text-gray-600">Services Monitored</p>
            </div>
          </div>
        </section>

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