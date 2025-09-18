'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getSiteDeadLinksStats, startDeadLinkScan } from '@/lib/deadlinks-client'
import type { User } from '@supabase/supabase-js'
import { AlertTriangle, ExternalLink, Search, Play, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

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

interface SiteWithStats {
  id: string
  name: string
  url: string
  status: 'up' | 'down' | 'unknown'
  brokenLinks: number
  totalDeadLinks: number
  fixedLinks: number
  lastScan?: {
    scanned_at: string
    status: string
    broken_links: number
    total_links: number
  }
  scanning?: boolean
}

export default function DeadLinksPage() {
  const [user, setUser] = useState<User | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [sitesWithStats, setSitesWithStats] = useState<SiteWithStats[]>([])
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
      
      // Fetch stats for each site
      if (sitesData) {
        for (const site of sitesData) {
          fetchSiteStats(site.id)
        }
      }
    } catch (error) {
      console.error('Error fetching sites:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSiteStats = async (siteId: string) => {
    setStatsLoading(prev => ({ ...prev, [siteId]: true }))
    
    try {
      const stats = await getSiteDeadLinksStats(siteId)
      const site = sites.find(s => s.id === siteId) || sitesWithStats.find(s => s.id === siteId)
      
      if (site) {
        const siteWithStats: SiteWithStats = {
          ...site,
          brokenLinks: stats.brokenLinks,
          totalDeadLinks: stats.totalDeadLinks,
          fixedLinks: stats.fixedLinks,
          lastScan: stats.lastScan
        }
        
        setSitesWithStats(prev => {
          const existing = prev.findIndex(s => s.id === siteId)
          if (existing >= 0) {
            const updated = [...prev]
            updated[existing] = siteWithStats
            return updated
          } else {
            return [...prev, siteWithStats]
          }
        })
      }
    } catch (error) {
      console.error('Error fetching site stats:', error)
    } finally {
      setStatsLoading(prev => ({ ...prev, [siteId]: false }))
    }
  }

  const handleStartScan = async (siteId: string) => {
    setSitesWithStats(prev => prev.map(site => 
      site.id === siteId ? { ...site, scanning: true } : site
    ))

    try {
      await startDeadLinkScan(siteId)
      // Refresh stats after starting scan
      setTimeout(() => fetchSiteStats(siteId), 1000)
    } catch (error) {
      console.error('Error starting scan:', error)
      alert(error instanceof Error ? error.message : 'Failed to start scan')
    } finally {
      setSitesWithStats(prev => prev.map(site => 
        site.id === siteId ? { ...site, scanning: false } : site
      ))
    }
  }

  const getOverallStats = () => {
    const totalBroken = sitesWithStats.reduce((sum, site) => sum + site.brokenLinks, 0)
    const totalFixed = sitesWithStats.reduce((sum, site) => sum + site.fixedLinks, 0)
    const totalScanned = sitesWithStats.filter(site => site.lastScan).length
    
    return { totalBroken, totalFixed, totalScanned, totalSites: sitesWithStats.length }
  }

  const overallStats = getOverallStats()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dead links data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Dead Link Scanner</h1>
              <p className="text-gray-600">Find and fix broken links on your websites</p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline" className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Broken Links</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {overallStats.totalBroken}
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Fixed Links</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {overallStats.totalFixed}
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
                  <Search className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Sites Scanned</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {overallStats.totalScanned}
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
                  <AlertTriangle className="h-6 w-6 text-gray-600" />
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
        </div>

        {/* Sites Grid */}
        {sitesWithStats.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No websites to scan</h3>
            <p className="text-gray-600 mb-4">Add websites to your dashboard to start scanning for dead links</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sitesWithStats.map((site) => (
              <div
                key={site.id}
                className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      site.brokenLinks === 0 ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <h3 className="font-medium text-gray-900 truncate">
                      {site.name}
                    </h3>
                  </div>
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Broken Links</span>
                    <span className={`text-sm font-medium ${
                      site.brokenLinks === 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {statsLoading[site.id] ? '...' : site.brokenLinks}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Fixed Links</span>
                    <span className="text-sm font-medium text-green-600">
                      {statsLoading[site.id] ? '...' : site.fixedLinks}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Last Scan</span>
                    <span className="text-sm text-gray-900">
                      {site.lastScan 
                        ? new Date(site.lastScan.started_at).toLocaleDateString()
                        : 'Never'
                      }
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <span className={`text-sm font-medium ${
                      site.lastScan?.status === 'completed' ? 'text-green-600' :
                      site.lastScan?.status === 'running' ? 'text-blue-600' :
                      site.lastScan?.status === 'failed' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {site.scanning ? 'Starting...' : (site.lastScan?.status || 'Not scanned')}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handleStartScan(site.id)}
                    disabled={site.scanning || site.lastScan?.status === 'running'}
                    className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {site.scanning ? 'Starting...' : 'Start Scan'}
                  </button>

                  <Link href={`/dashboard/dead-links/${site.id}`}>
                    <button className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                      <Search className="w-4 h-4 mr-2" />
                      View Details
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}