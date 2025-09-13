'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getDeadLinks, getSiteDeadLinksStats, markDeadLinkFixed } from '@/lib/deadlinks-client'
import { ArrowLeft, ExternalLink, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface Site {
  id: string
  name: string
  url: string
  status: 'up' | 'down' | 'unknown'
}

interface DeadLink {
  id: string
  url: string
  source_url: string
  status_code: number
  found_at: string
  fixed: boolean
}

export default function SiteDeadLinksPage() {
  const params = useParams()
  const siteId = params.siteId as string
  
  const [user, setUser] = useState<any>(null)
  const [site, setSite] = useState<Site | null>(null)
  const [deadLinks, setDeadLinks] = useState<DeadLink[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'broken' | 'fixed'>('all')

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUser(user)
      await Promise.all([fetchSite(user.id), fetchDeadLinks(), fetchStats()])
    }
    
    checkUser()
  }, [siteId])

  const fetchSite = async (userId: string) => {
    try {
      const { data: siteData } = await supabase
        .from('sites')
        .select('*')
        .eq('id', siteId)
        .eq('user_id', userId)
        .single()
      
      setSite(siteData)
    } catch (error) {
      console.error('Error fetching site:', error)
    }
  }

  const fetchDeadLinks = async () => {
    try {
      const links = await getDeadLinks(siteId)
      setDeadLinks(links)
    } catch (error) {
      console.error('Error fetching dead links:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const siteStats = await getSiteDeadLinksStats(siteId)
      setStats(siteStats)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkFixed = async (linkId: string) => {
    try {
      await markDeadLinkFixed(linkId)
      setDeadLinks(prev => prev.map(link => 
        link.id === linkId ? { ...link, fixed: true } : link
      ))
      fetchStats() // Refresh stats
    } catch (error) {
      console.error('Error marking as fixed:', error)
      alert('Failed to mark as fixed')
    }
  }

  const filteredLinks = deadLinks.filter(link => {
    if (filter === 'broken') return !link.fixed
    if (filter === 'fixed') return link.fixed
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dead links...</p>
        </div>
      </div>
    )
  }

  if (!site) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center py-8">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <p className="text-red-600 mb-4">Site not found or access denied</p>
          <Link href="/dashboard/dead-links">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Back to Dead Links
            </button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/dead-links">
            <button className="flex items-center text-gray-600 hover:text-gray-900 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dead Links
            </button>
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {site.name} - Dead Links
              </h1>
              <div className="flex items-center space-x-2">
                <p className="text-gray-600">{site.url}</p>
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Broken Links</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.brokenLinks}</dd>
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
                      <dd className="text-lg font-medium text-gray-900">{stats.fixedLinks}</dd>
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
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Found</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.totalDeadLinks}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'all', label: 'All Links', count: deadLinks.length },
                { key: 'broken', label: 'Broken', count: deadLinks.filter(l => !l.fixed).length },
                { key: 'fixed', label: 'Fixed', count: deadLinks.filter(l => l.fixed).length }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key as any)}
                  className={`${
                    filter === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Dead Links Table */}
        {filteredLinks.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No {filter === 'all' ? '' : filter} links found
            </h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? 'No dead links have been found for this site yet.' 
                : `No ${filter} links found.`
              }
            </p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Broken URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source Page
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Found
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLinks.map((link) => (
                  <tr key={link.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
                          link.fixed ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 break-all">
                            {link.url}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-blue-600 hover:text-blue-900 break-all">
                        <a href={link.source_url} target="_blank" rel="noopener noreferrer">
                          {link.source_url}
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        link.status_code >= 400 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {link.status_code}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(link.found_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {!link.fixed && (
                        <button
                          onClick={() => handleMarkFixed(link.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Mark as Fixed
                        </button>
                      )}
                      {link.fixed && (
                        <span className="text-green-600">Fixed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}