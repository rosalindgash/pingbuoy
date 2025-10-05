'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getSiteUptimeStats, getSiteLatestPageSpeed, getSiteHourlyUptimeData, getSiteLatestDeadLinks } from '@/lib/uptime-client'
import {
  CheckCircle, XCircle, Clock, Gauge, Activity, Globe, RefreshCw, Link,
  AlertTriangle, Shield, ShieldX, ArrowLeft, Download, Check, ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

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
  fixed: boolean
}

interface HourlyData {
  hour: number
  percentage: number
  status: 'up' | 'down' | 'partial'
  total: number
  up: number
}

export default function SiteStatusPage() {
  const params = useParams()
  const router = useRouter()
  const siteId = params.siteId as string

  const [site, setSite] = useState<Site | null>(null)
  const [uptimeStats, setUptimeStats] = useState<UptimeStats | null>(null)
  const [pageSpeedStats, setPageSpeedStats] = useState<PageSpeedStats | null>(null)
  const [deadLinksStats, setDeadLinksStats] = useState<DeadLinksStats | null>(null)
  const [deadLinks, setDeadLinks] = useState<DeadLink[]>([])
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [exportingDeadLinks, setExportingDeadLinks] = useState(false)
  const [markingFixed, setMarkingFixed] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (siteId) {
      fetchSiteData()
    }
  }, [siteId])

  const fetchSiteData = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch site details
      const { data: siteData, error: siteError } = await supabase
        .from('sites')
        .select('*')
        .eq('id', siteId)
        .eq('user_id', user.id)
        .single()

      if (siteError || !siteData) {
        setError('Site not found or access denied')
        return
      }

      setSite(siteData)

      // Fetch monitoring data
      const [uptimeData, speedData, deadLinksData, hourlyDataResult] = await Promise.all([
        getSiteUptimeStats(siteId, 30),
        getSiteLatestPageSpeed(siteId),
        getSiteLatestDeadLinks(siteId),
        getSiteHourlyUptimeData(siteId, 24)
      ])

      setUptimeStats(uptimeData)
      setPageSpeedStats(speedData)
      setDeadLinksStats(deadLinksData)
      setHourlyData(hourlyDataResult)

      // Fetch dead links list if there are any broken links
      if (deadLinksData.brokenLinks > 0) {
        await fetchDeadLinksList(siteId)
      }

    } catch (err) {
      console.error('Error fetching site data:', err)
      setError('Failed to load site status')
    } finally {
      setLoading(false)
    }
  }

  const fetchDeadLinksList = async (siteId: string) => {
    try {
      const { data, error } = await supabase
        .from('dead_links')
        .select('id, url, status_code, error, found_on_page, last_checked, fixed')
        .eq('site_id', siteId)
        .eq('fixed', false)
        .order('last_checked', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error fetching dead links:', error)
        return
      }

      setDeadLinks(data || [])
    } catch (error) {
      console.error('Error in fetchDeadLinksList:', error)
    }
  }

  const handleRefresh = async () => {
    if (!site || refreshing) return

    setRefreshing(true)
    try {
      const response = await fetch(`/api/sites/${siteId}/check`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Site check initiated')
        setTimeout(() => {
          fetchSiteData()
        }, 2000)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to refresh site')
      }
    } catch (error) {
      console.error('Failed to refresh:', error)
      toast.error('Failed to refresh site')
    } finally {
      setRefreshing(false)
    }
  }

  const handleExportDeadLinks = async () => {
    if (exportingDeadLinks) return

    setExportingDeadLinks(true)
    try {
      const response = await fetch(`/api/dead-links/export?siteId=${siteId}`)

      if (!response.ok) {
        const error = await response.json()
        if (response.status === 429) {
          toast.error('Rate limit exceeded. Please try again later.')
          return
        }
        throw new Error(error.error || 'Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dead-links-${site?.name || siteId}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Dead links exported successfully')
    } catch (error) {
      console.error('Export error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to export dead links')
    } finally {
      setExportingDeadLinks(false)
    }
  }

  const handleMarkAsFixed = async (linkId: string) => {
    setMarkingFixed(prev => ({ ...prev, [linkId]: true }))
    try {
      const response = await fetch('/api/dead-links/mark-fixed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId })
      })

      if (!response.ok) {
        throw new Error('Failed to mark link as fixed')
      }

      toast.success('Link marked as fixed')
      setDeadLinks(prev => prev.filter(link => link.id !== linkId))

      // Update stats
      if (deadLinksStats) {
        setDeadLinksStats({
          ...deadLinksStats,
          brokenLinks: deadLinksStats.brokenLinks - 1
        })
      }
    } catch (error) {
      console.error('Error marking link as fixed:', error)
      toast.error('Failed to mark link as fixed')
    } finally {
      setMarkingFixed(prev => ({ ...prev, [linkId]: false }))
    }
  }

  const formatLastChecked = (timestamp: string | null) => {
    if (!timestamp) return 'Never'

    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hour${Math.floor(diffInMinutes / 60) !== 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up': return 'bg-green-50 text-green-700 border-green-200'
      case 'down': return 'bg-red-50 text-red-700 border-red-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'down': return <XCircle className="w-5 h-5 text-red-600" />
      default: return <Clock className="w-5 h-5 text-gray-600" />
    }
  }

  const extractDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading site status...</p>
        </div>
      </div>
    )
  }

  if (error || !site) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white p-8 rounded-lg shadow-sm border max-w-md">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Site Not Found</h1>
            <p className="text-gray-600 mb-4">{error || 'The requested site could not be found.'}</p>
            <Button onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="px-6 py-8">
            <div className="flex items-center justify-end mb-4 space-x-3">
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>

              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Checking...' : 'Check Now'}
              </Button>

              <a
                href={`/status/${extractDomain(site.url)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Public Status Page
              </a>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Globe className="w-8 h-8 text-blue-600" />
                </div>

                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{site.name}</h1>
                  <p className="text-gray-600 mt-1">{site.url}</p>
                </div>
              </div>

              <div className="text-right">
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(site.status)}`}>
                  {getStatusIcon(site.status)}
                  <span className="ml-2 capitalize">{site.status}</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
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

          {/* SSL Certificate */}
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

          {!site.url.startsWith('https://') && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <Shield className="w-8 h-8 text-gray-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">SSL Certificate</p>
                  <p className="text-sm font-bold text-gray-900">N/A</p>
                  <p className="text-xs text-gray-500">HTTP site</p>
                </div>
              </div>
            </div>
          )}

          {/* Response Time */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <Clock className={`w-8 h-8 ${
                pageSpeedStats?.loadTime && pageSpeedStats.loadTime > 0
                  ? pageSpeedStats.loadTime <= 300 ? 'text-green-500'
                  : pageSpeedStats.loadTime <= 800 ? 'text-yellow-500'
                  : 'text-red-500'
                  : 'text-gray-400'
              }`} />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Response Time</p>
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
                <p className="text-sm font-medium text-gray-600">Broken Links</p>
                <p className="text-2xl font-bold text-gray-900">
                  {deadLinksStats?.brokenLinks || 0}
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

        {/* Broken Links Section */}
        {deadLinksStats && deadLinksStats.brokenLinks > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <AlertTriangle className="w-6 h-6 text-red-500 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Broken Links</h2>
                <Badge variant="destructive" className="ml-3">
                  {deadLinks.length} found
                </Badge>
              </div>

              <Button
                onClick={handleExportDeadLinks}
                disabled={exportingDeadLinks}
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                {exportingDeadLinks ? 'Exporting...' : 'Export CSV'}
              </Button>
            </div>

            {deadLinksStats.lastScanned && (
              <p className="text-sm text-gray-500 mb-4">
                Last scanned: {formatLastChecked(deadLinksStats.lastScanned)}
              </p>
            )}

            <div className="space-y-3">
              {deadLinks.map((link) => (
                <div key={link.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-4">
                      <div className="flex items-center mb-2">
                        <XCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-900 break-all">
                          {link.url}
                        </span>
                      </div>

                      <div className="text-xs text-gray-600 space-y-1 ml-6">
                        <div>
                          <strong>Status:</strong> {link.status_code ? `HTTP ${link.status_code}` : 'Connection failed'}
                        </div>
                        {link.error && (
                          <div>
                            <strong>Error:</strong> {link.error}
                          </div>
                        )}
                        <div>
                          <strong>Found on:</strong>
                          <span className="ml-1 break-all">{link.found_on_page}</span>
                        </div>
                        <div>
                          <strong>Last checked:</strong> {formatLastChecked(link.last_checked)}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkAsFixed(link.id)}
                      disabled={markingFixed[link.id]}
                    >
                      {markingFixed[link.id] ? (
                        <>Marking...</>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Mark Fixed
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {deadLinks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p>No broken links found</p>
              </div>
            )}
          </div>
        )}

        {deadLinksStats && deadLinksStats.brokenLinks === 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <div className="flex items-center justify-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">All Links Healthy</h3>
                <p className="text-sm text-gray-600">No broken links detected</p>
                {deadLinksStats.lastScanned && (
                  <p className="text-xs text-gray-500 mt-1">
                    Last scanned: {formatLastChecked(deadLinksStats.lastScanned)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
