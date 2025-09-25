'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Globe, TrendingUp, AlertTriangle, Activity, RefreshCw, Plus, Menu, X, Puzzle, Settings, LogOut } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

interface CoreWebVitalsData {
  id: string
  site_url: string
  lcp: number | null // Largest Contentful Paint
  fid: number | null // First Input Delay
  cls: number | null // Cumulative Layout Shift
  fcp: number | null // First Contentful Paint
  ttfb: number | null // Time to First Byte
  checked_at: string
}

interface SystemHealth {
  database_responsive: boolean
  api_responsive: boolean
  monitoring_active: boolean
  last_check: string
}

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  plan: 'free' | 'pro' | 'founder'
  created_at: string
  stripe_customer_id: string | null
}

export default function CoreVitalsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [vitalsData, setVitalsData] = useState<CoreWebVitalsData[]>([])
  const [vitalsSummary, setVitalsSummary] = useState<any>(null)
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Build navigation based on user plan
  const getNavigation = () => {
    const baseNavigation = [
      { name: 'Dashboard', href: '/dashboard', icon: Globe },
      { name: 'Uptime', href: '/dashboard/uptime', icon: TrendingUp },
      { name: 'Dead Links', href: '/dashboard/dead-links', icon: AlertTriangle },
    ]

    // Add integrations for Pro users
    if (profile?.plan === 'pro' || profile?.plan === 'founder') {
      baseNavigation.push({ name: 'Integrations', href: '/dashboard/integrations', icon: Puzzle })
    }

    // Add Core Web Vitals for founder accounts
    if (profile?.plan === 'founder') {
      baseNavigation.push({ name: 'Core Vitals', href: '/dashboard/core-vitals', icon: Activity })
    }

    baseNavigation.push({ name: 'Settings', href: '/dashboard/settings', icon: Settings })

    return baseNavigation
  }

  const navigation = getNavigation()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        window.location.href = '/login'
        return
      }

      setUser(user)
      await Promise.all([fetchProfile(user.id), fetchData()])
    } catch (err) {
      console.error('Auth check failed:', err)
      window.location.href = '/login'
    } finally {
      setLoading(false)
    }
  }

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return
      }

      // Check if user is founder
      if (profile?.plan !== 'founder') {
        window.location.href = '/dashboard'
        return
      }

      setProfile(profile)
    } catch (error) {
      console.error('Profile fetch failed:', error)
    }
  }

  const fetchData = async () => {
    try {
      // Fetch Core Web Vitals data via Vercel API route (service role on server)
      const response = await fetch('/api/metrics/core-web-vitals?limit=100&hours_back=24')

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.data) {
        setVitalsData(result.data)
        setVitalsSummary(result.summary)
      } else {
        console.error('API returned unsuccessful result:', result)
      }

      // Check system health (this still uses direct Supabase for system checks)
      const healthCheck = await checkSystemHealth()
      setSystemHealth(healthCheck)

    } catch (error) {
      console.error('Failed to fetch Core Web Vitals data:', error)
    }
  }

  const checkSystemHealth = async (): Promise<SystemHealth> => {
    const now = new Date().toISOString()

    try {
      // Test database responsiveness
      const { data, error } = await supabase
        .from('sites')
        .select('count')
        .limit(1)

      const databaseResponsive = !error

      // Test API responsiveness (simplified)
      const apiResponsive = true // In production, you'd test your API endpoints

      // Check if monitoring is active (recent uptime logs)
      const { data: recentLogs } = await supabase
        .from('uptime_logs')
        .select('checked_at')
        .gte('checked_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Last 10 minutes
        .limit(1)

      const monitoringActive = (recentLogs && recentLogs.length > 0)

      return {
        database_responsive: databaseResponsive,
        api_responsive: apiResponsive,
        monitoring_active: monitoringActive,
        last_check: now
      }
    } catch (error) {
      return {
        database_responsive: false,
        api_responsive: false,
        monitoring_active: false,
        last_check: now
      }
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const formatMetric = (value: number | null, unit: string) => {
    if (value === null) return 'N/A'
    return `${Math.round(value)}${unit}`
  }

  const getMetricStatus = (metric: string, value: number | null) => {
    if (value === null) return 'unknown'

    switch (metric) {
      case 'lcp':
        return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor'
      case 'fid': // Now stores INP values but kept as 'fid' for compatibility
        return value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor' // INP thresholds
      case 'cls':
        return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor'
      case 'fcp':
        return value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor'
      case 'ttfb':
        return value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor'
      default:
        return 'unknown'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200'
      case 'needs-improvement': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'poor': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading Core Web Vitals...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <Image src="/ping-buoy-header-logo.png" alt="PingBuoy" width={150} height={40} className="h-10 w-auto" />
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${
                      isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center px-2 py-2 text-base font-medium rounded-md`}
                  >
                    <Icon className="mr-4 h-6 w-6" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="ml-3">
                <p className="text-base font-medium text-gray-700">{profile?.full_name || profile?.email}</p>
                <p className="text-sm font-medium text-gray-500 capitalize">{profile?.plan} Plan</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 bg-white">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <Image src="/ping-buoy-header-logo.png" alt="PingBuoy" width={150} height={40} className="h-10 w-auto" />
            </div>
            <nav className="mt-5 flex-1 px-2 bg-white space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${
                      isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center w-full">
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-700">{profile?.full_name || profile?.email}</p>
                <p className="text-xs font-medium text-gray-500 capitalize">{profile?.plan} Plan</p>
              </div>
              <button
                onClick={handleLogout}
                className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-500"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <div className="sticky top-0 z-10 lg:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-white border-b border-gray-200">
          <button
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">PingBuoy Core Web Vitals</h1>
                  <p className="text-sm text-gray-500">Internal performance monitoring dashboard</p>
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {/* Metrics Summary */}
              {vitalsSummary && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center">
                      <div className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(getMetricStatus('lcp', vitalsSummary.avg_lcp))}`}>
                        LCP
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-2xl font-semibold text-gray-900">{formatMetric(vitalsSummary.avg_lcp, 'ms')}</p>
                      <p className="text-sm text-gray-500">24h average</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center">
                      <div className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(getMetricStatus('fid', vitalsSummary.avg_fid))}`}>
                        INP
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-2xl font-semibold text-gray-900">{formatMetric(vitalsSummary.avg_fid, 'ms')}</p>
                      <p className="text-sm text-gray-500">24h average</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center">
                      <div className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(getMetricStatus('cls', vitalsSummary.avg_cls))}`}>
                        CLS
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-2xl font-semibold text-gray-900">{vitalsSummary.avg_cls !== null ? vitalsSummary.avg_cls.toFixed(3) : 'N/A'}</p>
                      <p className="text-sm text-gray-500">24h average</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center">
                      <div className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(getMetricStatus('fcp', vitalsSummary.avg_fcp))}`}>
                        FCP
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-2xl font-semibold text-gray-900">{formatMetric(vitalsSummary.avg_fcp, 'ms')}</p>
                      <p className="text-sm text-gray-500">24h average</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center">
                      <div className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(getMetricStatus('ttfb', vitalsSummary.avg_ttfb))}`}>
                        TTFB
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-2xl font-semibold text-gray-900">{formatMetric(vitalsSummary.avg_ttfb, 'ms')}</p>
                      <p className="text-sm text-gray-500">24h average</p>
                    </div>
                  </div>
                </div>
              )}

              {/* System Health */}
              {systemHealth && (
                <div className="bg-white rounded-lg shadow mb-8 p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">System Health</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${systemHealth.database_responsive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm">Database: {systemHealth.database_responsive ? 'Responsive' : 'Error'}</span>
                    </div>
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${systemHealth.api_responsive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm">API: {systemHealth.api_responsive ? 'Responsive' : 'Error'}</span>
                    </div>
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${systemHealth.monitoring_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm">Monitoring: {systemHealth.monitoring_active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Last checked: {new Date(systemHealth.last_check).toLocaleString()}</p>
                  {vitalsSummary && (
                    <p className="text-xs text-gray-500 mt-1">Showing {vitalsSummary.total_records} records from last {vitalsSummary.time_range_hours} hours</p>
                  )}
                </div>
              )}

              {/* Core Web Vitals Data */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Recent Core Web Vitals</h2>
                  <p className="text-sm text-gray-500">Performance metrics for PingBuoy application</p>
                </div>

                {vitalsData.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No Core Web Vitals data available yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LCP</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">INP</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CLS</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FCP</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TTFB</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Checked</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {vitalsData.map((data) => (
                          <tr key={data.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {data.site_url}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(getMetricStatus('lcp', data.lcp))}`}>
                                {formatMetric(data.lcp, 'ms')}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(getMetricStatus('fid', data.fid))}`}>
                                {formatMetric(data.fid, 'ms')}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(getMetricStatus('cls', data.cls))}`}>
                                {data.cls !== null ? data.cls.toFixed(3) : 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(getMetricStatus('fcp', data.fcp))}`}>
                                {formatMetric(data.fcp, 'ms')}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(getMetricStatus('ttfb', data.ttfb))}`}>
                                {formatMetric(data.ttfb, 'ms')}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(data.checked_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Metrics Legend */}
              <div className="mt-8 bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Metrics Reference</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <strong>LCP (Largest Contentful Paint)</strong>
                    <p className="text-gray-600">&le;2.5s good, &le;4.0s needs improvement, &gt;4.0s poor</p>
                  </div>
                  <div>
                    <strong>INP (Interaction to Next Paint)</strong>
                    <p className="text-gray-600">&le;200ms good, &le;500ms needs improvement, &gt;500ms poor</p>
                  </div>
                  <div>
                    <strong>CLS (Cumulative Layout Shift)</strong>
                    <p className="text-gray-600">&le;0.1 good, &le;0.25 needs improvement, &gt;0.25 poor</p>
                  </div>
                  <div>
                    <strong>FCP (First Contentful Paint)</strong>
                    <p className="text-gray-600">&le;1.8s good, &le;3.0s needs improvement, &gt;3.0s poor</p>
                  </div>
                  <div>
                    <strong>TTFB (Time to First Byte)</strong>
                    <p className="text-gray-600">&le;800ms good, &le;1.8s needs improvement, &gt;1.8s poor</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}