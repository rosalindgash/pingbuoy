'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { getSiteUptimeStats, getSiteLatestPageSpeed, getSiteHourlyUptimeData, getSiteLatestDeadLinks } from '@/lib/uptime-client'
import { CheckCircle, XCircle, Clock, Gauge, Activity, Globe, RefreshCw, Link, Shield, ShieldX } from 'lucide-react'
import Image from 'next/image'

interface Site {
  id: string
  name: string
  url: string
  status: 'up' | 'down' | 'unknown'
  last_checked: string | null
  user_id: string
  ssl_status: boolean | null
  ssl_last_checked: string | null
}

interface User {
  plan: 'free' | 'pro' | 'founder'
  email: string
}

interface UptimeStats {
  uptime: number
  total: number
  up: number
}

interface PageSpeedStats {
  score: number
  loadTime: number
  lastChecked: string | null
}

interface DeadLinksStats {
  totalLinks: number
  brokenLinks: number
  lastScanned: string | null
}

interface DeadLink {
  id: string
  url: string
  status_code: number | null
  error: string | null
  found_on_page: string
  last_checked: string
}

interface HourlyData {
  hour: number
  percentage: number
  status: 'up' | 'down' | 'partial'
  total: number
  up: number
}

export default function StatusPage() {
  const params = useParams()
  const domain = params.domain as string

  const [site, setSite] = useState<Site | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [uptimeStats, setUptimeStats] = useState<UptimeStats | null>(null)
  const [pageSpeedStats, setPageSpeedStats] = useState<PageSpeedStats | null>(null)
  const [deadLinksStats, setDeadLinksStats] = useState<DeadLinksStats | null>(null)
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (domain) {
      fetchSiteData()
    }
  }, [domain])

  const extractDomainFromUrl = (url: string) => {
    try {
      // Remove protocol and path, keep only domain
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
    }
  }

  const fetchSiteData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Create anon supabase client for public access
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        }
      )

      // Decode the domain parameter in case it's URL encoded
      const decodedDomain = decodeURIComponent(domain)

      // Build precise URL variations to match against
      const possibleUrls = [
        `https://${decodedDomain}`,
        `http://${decodedDomain}`,
        `https://www.${decodedDomain}`,
        `http://${decodedDomain}`,
        `https://${decodedDomain}/`,
        `http://${decodedDomain}/`,
        `https://www.${decodedDomain}/`,
        `http://www.${decodedDomain}/`
      ]

      // SECURITY FIX: Query directly by domain instead of fetching all sites
      // Use targeted queries instead of fetching all sites
      const { data: sitesData, error: sitesError } = await supabase
        .from('sites')
        .select(`
          id, name, url, status, last_checked, user_id, ssl_status, ssl_last_checked,
          users(plan, email)
        `)
        .eq('is_active', true)
        .or(possibleUrls.map(url => `url.eq.${url}`).join(','))

      if (sitesError) {
        console.error('Database error:', sitesError)
        setError('Error loading site data')
        return
      }

      // Find the best matching site
      const matchingSite = sitesData?.find(site => {
        const siteDomain = extractDomainFromUrl(site.url)
        return siteDomain === decodedDomain
      })

      if (!matchingSite) {
        setError('Site not found or is not public')
        return
      }

      setSite(matchingSite)
      setUser(matchingSite.users)

      // Fetch monitoring data
      const [uptimeData, speedData, deadLinksData, hourlyDataResult] = await Promise.all([
        getSiteUptimeStats(matchingSite.id, 30),
        getSiteLatestPageSpeed(matchingSite.id),
        getSiteLatestDeadLinks(matchingSite.id),
        getSiteHourlyUptimeData(matchingSite.id, 24)
      ])

      setUptimeStats(uptimeData)
      setPageSpeedStats(speedData)
      setDeadLinksStats(deadLinksData)
      setHourlyData(hourlyDataResult)

      // Note: Dead links list is NOT shown on public status page for privacy

    } catch (err) {
      console.error('Error fetching site data:', err)
      setError('Failed to load site status')
    } finally {
      setLoading(false)
    }
  }


  const handleRefresh = async () => {
    if (!site || refreshing) return

    setRefreshing(true)
    try {
      // Trigger a manual uptime check using the public status API
      const response = await fetch(`/api/status/${domain}/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Status page refresh result:', result)

        // Update the site data immediately
        setSite(prev => prev ? {
          ...prev,
          status: result.site.status,
          last_checked: result.site.last_checked,
          ssl_status: result.result?.sslValid !== undefined ? result.result.sslValid : prev.ssl_status,
          ssl_last_checked: result.result?.sslValid !== undefined ? result.site.last_checked : prev.ssl_last_checked
        } : null)

        // Refresh the full data after a brief delay
        setTimeout(() => {
          fetchSiteData()
        }, 1500)
      } else if (response.status === 429) {
        // Rate limited
        const errorData = await response.json()
        console.log('Rate limited:', errorData)
        // Show user-friendly message without setting error state
      } else {
        console.error('Refresh failed:', response.status, await response.text())
      }
    } catch (error) {
      console.error('Failed to refresh:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const formatLastChecked = (timestamp: string | null) => {
    if (!timestamp) return 'Never'

    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`
    return date.toLocaleDateString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up': return 'text-green-600 bg-green-50'
      case 'down': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'down': return <XCircle className="w-5 h-5 text-red-600" />
      default: return <Clock className="w-5 h-5 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading status page...</p>
        </div>
      </div>
    )
  }

  if (error || !site) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white p-8 rounded-lg shadow-sm border">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Site Not Found</h1>
            <p className="text-gray-600">{error || 'The requested status page could not be found.'}</p>
            <p className="text-gray-500 text-sm mt-2">Looking for: {domain}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Site icon */}
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Globe className="w-8 h-8 text-blue-600" />
                </div>

                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{site.name}</h1>
                  <p className="text-gray-600 mt-1">{site.url}</p>
                </div>
              </div>

              {/* Current Status */}
              <div className="text-right">
                <div className="flex items-center justify-end space-x-3 mb-2">
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </button>
                  <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(site.status)}`}>
                    {getStatusIcon(site.status)}
                    <span className="ml-2 capitalize">{site.status}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Last checked: {formatLastChecked(site.last_checked)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Uptime */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">30-Day Uptime</p>
                <p className="text-2xl font-bold text-gray-900">
                  {uptimeStats ? `${uptimeStats.uptime}%` : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* SSL Certificate Status */}
          {site.url.startsWith('https://') && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                {site.ssl_status === true ? (
                  <Shield className="w-8 h-8 text-green-500" />
                ) : site.ssl_status === false ? (
                  <ShieldX className="w-8 h-8 text-red-500" />
                ) : (
                  <Shield className="w-8 h-8 text-gray-400" />
                )}
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">SSL Certificate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {site.ssl_status === true ? 'Valid' : site.ssl_status === false ? 'Invalid' : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Performance placeholder for HTTP sites */}
          {!site.url.startsWith('https://') && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <Gauge className="w-8 h-8 text-gray-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">SSL Certificate</p>
                  <p className="text-2xl font-bold text-gray-900">N/A</p>
                  <p className="text-xs text-gray-500">HTTP site - no SSL</p>
                </div>
              </div>
            </div>
          )}

          {/* Response Time */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <Clock className={`w-8 h-8 ${
                pageSpeedStats?.loadTime && pageSpeedStats.loadTime > 0
                  ? pageSpeedStats.loadTime <= 300 ? 'text-green-500'    // Fast: <= 300ms
                  : pageSpeedStats.loadTime <= 800 ? 'text-yellow-500'   // Medium: 301-800ms
                  : 'text-red-500'                                       // Slow: > 800ms
                  : 'text-gray-400'                                      // No data
              }`} />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900">
				  {pageSpeedStats?.loadTime && pageSpeedStats.loadTime > 0 ? `${pageSpeedStats.loadTime}ms` : 'N/A'}
				</p>
              </div>
            </div>
          </div>

          {/* Dead Links */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <Link className={`w-8 h-8 ${deadLinksStats?.brokenLinks && deadLinksStats.brokenLinks > 0 ? 'text-red-500' : 'text-green-500'}`} />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Link Health</p>
                <p className="text-2xl font-bold text-gray-900">
                  {deadLinksStats?.brokenLinks && deadLinksStats.brokenLinks > 0 ? `${deadLinksStats.brokenLinks} broken` : 'No issues'}
                </p>
                </div>
            </div>
          </div>
        </div>

        {/* 24-Hour Uptime Chart */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">24-Hour Uptime History</h2>
          <div className="grid grid-cols-24 gap-1 h-8">
            {hourlyData.map((hour, index) => (
              <div
                key={index}
                className={`rounded ${
                  hour.percentage >= 100 ? 'bg-green-500' :
                  hour.percentage > 0 ? 'bg-yellow-500' : 'bg-red-500'
                } h-full`}
                title={`${hour.percentage.toFixed(1)}% uptime (${hour.up}/${hour.total} checks)`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>24 hours ago</span>
            <span>Now</span>
          </div>
        </div>

        {/* Broken links are NOT shown on public status page - they're private to site owners */}

        {/* Footer */}
        <div className="text-center py-8">
          {user?.plan === 'free' && (
            <p className="text-sm text-gray-500">
              Powered by{' '}
              <a
                href="https://pingbuoy.com"
                className="text-blue-600 hover:text-blue-800 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                PingBuoy.com
              </a>
            </p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            Last updated: {formatLastChecked(site.last_checked)} (CST)
          </p>
        </div>
      </div>
    </div>
  )
}