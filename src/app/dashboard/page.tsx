'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Globe, TrendingUp, AlertTriangle, Settings, LogOut, Menu, X, Puzzle, Activity, FileText } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import UptimeChartClient from '@/components/dashboard/UptimeChartClient'
import BasicMonitor from '@/components/dashboard/BasicMonitor'
import LiveTimestamp from '@/components/dashboard/LiveTimestamp'
import MonitoringFrequency from '@/components/dashboard/MonitoringFrequency'
import { getSiteUptimeStats, getSiteLatestPageSpeed, getSiteLatestDeadLinks } from '@/lib/uptime-client'

interface Site {
  id: string
  name: string
  url: string
  type: 'website' | 'api_endpoint'
  status: 'up' | 'down' | 'unknown'
  user_id: string
  is_active: boolean
  created_at: string
  last_checked: string | null
}

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  plan: 'free' | 'pro' | 'founder'
  created_at: string
  stripe_customer_id: string | null
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [uptimeStats, setUptimeStats] = useState<Record<string, {uptime: number, total: number, up: number}>>({})
  const [uptimeLoading, setUptimeLoading] = useState<Record<string, boolean>>({})
  const [pageSpeedStats, setPageSpeedStats] = useState<Record<string, {score: number, loadTime: number, lastChecked: string | null}>>({})
  const [deadLinksStats, setDeadLinksStats] = useState<Record<string, {totalLinks: number, brokenLinks: number, lastScanned: string | null}>>({})
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showAddSite, setShowAddSite] = useState(false)
  const [showEditSite, setShowEditSite] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [addSiteLoading, setAddSiteLoading] = useState(false)
  const [editSiteLoading, setEditSiteLoading] = useState(false)
  const [siteForm, setSiteForm] = useState({ name: '', url: '' })
  const [checkingAll, setCheckingAll] = useState(false)
  const [checkingSites, setCheckingSites] = useState<Record<string, boolean>>({})
  const [isAdmin, setIsAdmin] = useState(false)
  const pathname = usePathname()

  // Build navigation based on user plan
  const getNavigation = () => {
    const baseNavigation = [
      { name: 'Dashboard', href: '/dashboard', icon: Globe },
    ]

    // Add integrations for Pro users
    if (profile?.plan === 'pro' || profile?.plan === 'founder') {
      baseNavigation.push({ name: 'Integrations', href: '/dashboard/integrations', icon: Puzzle })
    }

    // Add Core Web Vitals for founder accounts
    if (profile?.plan === 'founder') {
      baseNavigation.push({ name: 'Core Vitals', href: '/dashboard/core-vitals', icon: Activity })
    }

    // Add Analytics and Incidents for admin users (checked server-side)
    if (isAdmin) {
      baseNavigation.push({ name: 'Analytics', href: '/admin/analytics', icon: TrendingUp })
      baseNavigation.push({ name: 'Incidents', href: '/admin/incidents', icon: AlertTriangle })
    }

    baseNavigation.push({ name: 'Reports', href: '/dashboard/reports', icon: FileText })
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
      await Promise.all([
        fetchProfile(user.id),
        fetchSites(user.id),
        checkAdminStatus()
      ])
    } catch (err) {
      console.error('Error:', err)
      window.location.href = '/login'
    } finally {
      setLoading(false)
    }
  }

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/user/is-admin', {
        credentials: 'include'
      })

      if (response.ok) {
        const { isAdmin: adminStatus } = await response.json()
        setIsAdmin(adminStatus)
      }
    } catch (err) {
      console.error('Admin check failed:', err)
      setIsAdmin(false)
    }
  }

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(profileData)
  }

  const fetchSites = async (userId: string) => {
    const { data: sitesData } = await supabase
      .from('sites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setSites(sitesData || [])
    
    // Fetch all stats for each site
    if (sitesData) {
      for (const site of sitesData) {
        fetchUptimeStats(site.id)
        fetchPageSpeedStats(site.id)
        fetchDeadLinksStats(site.id)
      }
    }
  }

  const fetchUptimeStats = async (siteId: string) => {
    setUptimeLoading(prev => ({ ...prev, [siteId]: true }))

    try {
      const stats = await getSiteUptimeStats(siteId, 30) // Last 30 days
      setUptimeStats(prev => ({ ...prev, [siteId]: stats }))
    } catch (error) {
      console.error('Error fetching uptime stats:', error)
    } finally {
      setUptimeLoading(prev => ({ ...prev, [siteId]: false }))
    }
  }

  const fetchPageSpeedStats = async (siteId: string) => {
    try {
      const stats = await getSiteLatestPageSpeed(siteId)
      setPageSpeedStats(prev => ({ ...prev, [siteId]: stats }))
    } catch (error) {
      console.error('Error fetching page speed stats:', error)
    }
  }

  const fetchDeadLinksStats = async (siteId: string) => {
    try {
      const stats = await getSiteLatestDeadLinks(siteId)
      setDeadLinksStats(prev => ({ ...prev, [siteId]: stats }))
    } catch (error) {
      console.error('Error fetching dead links stats:', error)
    }
  }

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !siteForm.name.trim() || !siteForm.url.trim()) return

    setAddSiteLoading(true)
    try {
      // Validate URL format
      let url = siteForm.url.trim()
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url
      }

      const { data, error } = await supabase
        .from('sites')
        .insert([{
          user_id: user.id,
          name: siteForm.name.trim(),
          url: url,
          status: 'unknown',
          is_active: true,
          public_status: true  // Default to public for status page access
        }])
        .select()

      if (error) throw error

      if (data) {
        setSites(prev => [data[0], ...prev])
        setSiteForm({ name: '', url: '' })
        setShowAddSite(false)
        // Fetch all stats for the new site
        fetchUptimeStats(data[0].id)
        fetchPageSpeedStats(data[0].id)
        fetchDeadLinksStats(data[0].id)
      }
    } catch (error) {
      console.error('Error adding site:', error)
    } finally {
      setAddSiteLoading(false)
    }
  }

  const handleDeleteSite = async (siteId: string) => {
    if (!confirm('Are you sure you want to delete this site?')) return
    if (!user) return

    try {
      const { error } = await supabase
        .from('sites')
        .delete()
        .eq('id', siteId)
        .eq('user_id', user.id)

      if (error) throw error

      setSites(prev => prev.filter(site => site.id !== siteId))
    } catch (error) {
      console.error('Error deleting site:', error)
    }
  }

  const handleEditSite = (site: any) => {
    setEditingSite(site)
    setSiteForm({ name: site.name, url: site.url })
    setShowEditSite(true)
  }

  const handleUpdateSite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !editingSite) return
    
    setEditSiteLoading(true)

    try {
      let url = siteForm.url.trim()
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url
      }

      const { error } = await supabase
        .from('sites')
        .update({
          name: siteForm.name.trim(),
          url: url
        })
        .eq('id', editingSite.id)
        .eq('user_id', user.id)

      if (error) throw error

      setSites(prev => prev.map(site => 
        site.id === editingSite.id 
          ? { ...site, name: siteForm.name.trim(), url: url }
          : site
      ))
      setSiteForm({ name: '', url: '' })
      setShowEditSite(false)
      setEditingSite(null)
    } catch (error) {
      console.error('Error updating site:', error)
    } finally {
      setEditSiteLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const handleManualCheck = async (siteId: string) => {
    setCheckingSites(prev => ({ ...prev, [siteId]: true }))

    try {
      const response = await fetch(`/api/sites/${siteId}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Manual check result:', result)

        // Update the site in local state immediately
        setSites(prev => prev.map(site =>
          site.id === siteId
            ? { ...site, status: result.site.status, last_checked: result.site.last_checked }
            : site
        ))

        // Refresh stats after a brief delay
        setTimeout(() => {
          fetchUptimeStats(siteId)
        }, 1000)
      } else {
        const errorText = await response.text()
        console.error('Manual check failed:', response.status, errorText)
      }

    } catch (error) {
      console.error('Manual check error:', error)
    } finally {
      setCheckingSites(prev => ({ ...prev, [siteId]: false }))
    }
  }

  const handleCheckAllSites = async () => {
    setCheckingAll(true)

    try {
      // Run comprehensive checks for all sites
      const checkPromises = sites.map(site =>
        handleManualCheck(site.id)
      )

      await Promise.all(checkPromises)

      // Refresh all site data after comprehensive checks
      if (user?.id) {
        await fetchSites(user.id)
      }

      // Refresh all stats for all sites
      sites.forEach(site => {
        fetchUptimeStats(site.id)
        fetchPageSpeedStats(site.id)
        fetchDeadLinksStats(site.id)
      })

    } catch (error) {
      console.error('Error checking all sites:', error)
    } finally {
      setCheckingAll(false)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    )
  }

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || user?.email?.split('@')[0] || 'User'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <Link href="/dashboard">
              <Image src="/ping-buoy-header-logo.png" alt="PingBuoy" width={132} height={35} className="h-9 w-auto cursor-pointer" />
            </Link>
            <button onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`${
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-48 lg:flex-col lg:fixed lg:inset-y-0 bg-white">
        <div className="flex h-16 items-center px-4">
          <Link href="/dashboard">
            <Image src="/ping-buoy-header-logo.png" alt="PingBuoy" width={132} height={35} className="h-9 w-auto cursor-pointer" />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`${
                pathname === item.href
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="p-4">
          <button
            onClick={handleLogout}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-48">
        {/* Top bar */}
        <div className="flex h-16 items-center justify-between bg-white px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">Welcome back, {displayName}</span>
            {profile && (
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                profile.plan === 'founder' ? 'bg-purple-100 text-purple-800' :
                profile.plan === 'pro' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)}
              </span>
            )}
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600">Monitor your websites and track their performance</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowAddSite(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Website
                </button>
              </div>
            </div>
          </div>



          {/* Sites List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                Your Sites ({sites.filter(s => s.type === 'website').length} {sites.filter(s => s.type === 'website').length === 1 ? 'website' : 'websites'}, {sites.filter(s => s.type === 'api_endpoint').length} API {sites.filter(s => s.type === 'api_endpoint').length === 1 ? 'endpoint' : 'endpoints'})
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Click on a website's status page URL to view its detailed monitoring status and share it with others. Last Check times are displayed in UTC.
              </p>
              
              {sites.length === 0 ? (
                <div className="text-center py-12">
                  <Globe className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No websites</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by adding your first website to monitor.</p>
                  <div className="mt-6">
                    <button
                      onClick={() => setShowAddSite(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center mx-auto hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Website
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {sites.map((site) => {
                    const stats = uptimeStats[site.id]
                    const statsLoading = uptimeLoading[site.id]
                    const speedStats = pageSpeedStats[site.id]
                    const deadLinksData = deadLinksStats[site.id]

                    return (
                      <div key={site.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          {/* Left: Site info with status */}
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                              site.status === 'up' ? 'bg-green-500' :
                              site.status === 'down' ? 'bg-red-500' : 'bg-gray-500'
                            }`} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-gray-900 truncate">{site.name}</h4>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${
                                  site.status === 'up' ? 'bg-green-100 text-green-700' :
                                  site.status === 'down' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {site.status.charAt(0).toUpperCase() + site.status.slice(1)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 truncate">{site.url}</p>
                              <a
                                href={`/status/${site.url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center mt-1"
                              >
                                <span className="truncate">{typeof window !== 'undefined' ? window.location.origin : ''}/status/{site.url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]}</span>
                                <svg className="w-3 h-3 ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            </div>
                          </div>

                          {/* Center: Last Check */}
                          <div className="hidden md:flex items-center mx-6">
                            <div className="text-center">
                              <div className="text-xs text-gray-500 mb-1">Last Check</div>
                              <div className="text-sm font-semibold text-gray-900">
                                <LiveTimestamp timestamp={site.last_checked} />
                              </div>
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <Link
                              href={`/dashboard/sites/${site.id}`}
                              className="text-blue-600 hover:text-blue-800 text-sm px-3 py-1 rounded hover:bg-blue-50 border border-blue-600 font-medium"
                            >
                              View Details
                            </Link>
                            <button
                              onClick={() => handleEditSite(site)}
                              className="text-gray-600 hover:text-gray-800 text-sm px-2 py-1 rounded hover:bg-gray-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSite(site.id)}
                              className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {/* Mobile stats - show on small screens */}
                        <div className="md:hidden mt-3 text-center">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Last Check</div>
                            <div className="text-sm font-semibold text-gray-900">
                              <LiveTimestamp timestamp={site.last_checked} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Pro Features Upsell for Free Users */}
          {profile?.plan === 'free' && (
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-sm p-6 text-white mt-8">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Puzzle className="h-8 w-8 text-white" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-xl font-bold mb-2">Upgrade to Pro Monitoring</h3>
                  <p className="text-blue-100 mb-4">
                    Get 3-minute monitoring checks, SSL certificate monitoring, API monitoring, and advanced integrations. Monitor up to 15 websites with Pro features.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                      <span className="text-sm">3-minute monitoring checks</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                      <span className="text-sm">SSL certificate monitoring</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                      <span className="text-sm">API monitoring (3 endpoints)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                      <span className="text-sm">Slack/Discord/Webhook alerts</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                      <span className="text-sm">15 websites</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                      <span className="text-sm">60-day history</span>
                    </div>
                  </div>
                  <Link href="/pricing">
                    <button className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors">
                      Upgrade to Pro - $59/mo
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Site Modal */}
      {showAddSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Website</h3>
            <form onSubmit={handleAddSite}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website Name
                </label>
                <input
                  type="text"
                  value={siteForm.name}
                  onChange={(e) => setSiteForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="My Website"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website URL
                </label>
                <input
                  type="url"
                  value={siteForm.url}
                  onChange={(e) => setSiteForm(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddSite(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSiteLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {addSiteLoading ? 'Adding...' : 'Add Website'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Site Modal */}
      {showEditSite && editingSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Website</h3>
            <form onSubmit={handleUpdateSite}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website Name
                </label>
                <input
                  type="text"
                  value={siteForm.name}
                  onChange={(e) => setSiteForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="My Website"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website URL
                </label>
                <input
                  type="url"
                  value={siteForm.url}
                  onChange={(e) => setSiteForm(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditSite(false)
                    setEditingSite(null)
                    setSiteForm({ name: '', url: '' })
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSiteLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {editSiteLoading ? 'Updating...' : 'Update Website'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}