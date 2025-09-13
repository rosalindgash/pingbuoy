'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getSiteUptimeStats, getSiteHourlyUptimeData } from '@/lib/uptime-client'
import { Globe, TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import UptimeChartClient from '@/components/dashboard/UptimeChartClient'

interface Site {
  id: string
  name: string
  url: string
  status: 'up' | 'down' | 'unknown'
  user_id: string
  is_active: boolean
  created_at: string
  last_checked: string | null
}

interface UptimeStats {
  uptime: number
  total: number
  up: number
}

export default function UptimePage() {
  const [user, setUser] = useState<any>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [uptimeStats, setUptimeStats] = useState<Record<string, UptimeStats>>({})
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUser(user)
      await fetchSites(user.id)
    }
    
    checkUser()
  }, [])

  const fetchSites = async (userId: string) => {
    setLoading(true)
    try {
      const { data: sitesData } = await supabase
        .from('sites')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      setSites(sitesData || [])
      
      // Fetch uptime stats for each site
      if (sitesData) {
        for (const site of sitesData) {
          fetchUptimeStats(site.id)
        }
      }
    } catch (error) {
      console.error('Error fetching sites:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUptimeStats = async (siteId: string) => {
    setStatsLoading(prev => ({ ...prev, [siteId]: true }))
    
    try {
      const stats = await getSiteUptimeStats(siteId, 30) // Last 30 days
      setUptimeStats(prev => ({ ...prev, [siteId]: stats }))
    } catch (error) {
      console.error('Error fetching uptime stats:', error)
    } finally {
      setStatsLoading(prev => ({ ...prev, [siteId]: false }))
    }
  }

  const getOverallStats = () => {
    if (sites.length === 0) return { avgUptime: 100, totalSites: 0, upSites: 0, downSites: 0 }
    
    const totalUptime = Object.values(uptimeStats).reduce((sum, stat) => sum + stat.uptime, 0)
    const avgUptime = totalUptime / Math.max(Object.keys(uptimeStats).length, 1)
    const upSites = sites.filter(site => site.status === 'up').length
    const downSites = sites.filter(site => site.status === 'down').length
    
    return {
      avgUptime: Math.round(avgUptime * 100) / 100,
      totalSites: sites.length,
      upSites,
      downSites
    }
  }

  const overallStats = getOverallStats()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading uptime data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Uptime Monitoring</h1>
          <p className="text-gray-600">Monitor your websites' availability and performance</p>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Average Uptime</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {overallStats.avgUptime}%
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Globe className="h-6 w-6 text-gray-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Sites</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {overallStats.totalSites}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Sites Online</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {overallStats.upSites}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Sites Offline</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {overallStats.downSites}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sites List */}
        {sites.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <Globe className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sites to monitor</h3>
            <p className="text-gray-600 mb-4">Add websites to start monitoring their uptime</p>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {sites.map((site) => {
              const stats = uptimeStats[site.id]
              const loading = statsLoading[site.id]
              
              return (
                <div key={site.id} className="bg-white shadow rounded-lg p-6">
                  {/* Site Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className={`w-4 h-4 rounded-full ${
                        site.status === 'up' ? 'bg-green-500' :
                        site.status === 'down' ? 'bg-red-500' : 'bg-gray-500'
                      }`} />
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{site.name}</h3>
                        <p className="text-sm text-gray-500">{site.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                        site.status === 'up' ? 'bg-green-100 text-green-800' :
                        site.status === 'down' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {site.status === 'up' ? 'Online' : 
                         site.status === 'down' ? 'Offline' : 'Unknown'}
                      </span>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {loading ? '...' : stats ? `${stats.uptime}%` : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">30-day uptime</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {loading ? '...' : stats ? stats.total : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">Total checks</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {loading ? '...' : stats ? stats.up : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">Successful</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {loading ? '...' : stats ? (stats.total - stats.up) : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">Failed</div>
                    </div>
                  </div>

                  {/* Uptime Chart */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">48-Hour History</h4>
                    <UptimeChartClient siteId={site.id} />
                  </div>

                  {/* Last Checked */}
                  {site.last_checked && (
                    <div className="mt-4 flex items-center text-sm text-gray-500">
                      <Clock className="w-4 h-4 mr-2" />
                      Last checked: {new Date(site.last_checked).toLocaleString()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}