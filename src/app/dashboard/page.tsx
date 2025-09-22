'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Globe, TrendingUp, AlertTriangle, Settings, LogOut, Menu, X, Puzzle, Activity } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import UptimeChartClient from '@/components/dashboard/UptimeChartClient'
import BasicMonitor from '@/components/dashboard/BasicMonitor'
import { getSiteUptimeStats } from '@/lib/uptime-client'

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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showAddSite, setShowAddSite] = useState(false)
  const [showEditSite, setShowEditSite] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [addSiteLoading, setAddSiteLoading] = useState(false)
  const [editSiteLoading, setEditSiteLoading] = useState(false)
  const [siteForm, setSiteForm] = useState({ name: '', url: '' })
  const [checkingAll, setCheckingAll] = useState(false)
  const [checkingSites, setCheckingSites] = useState<Record<string, boolean>>({})
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
      await Promise.all([fetchProfile(user.id), fetchSites(user.id)])
    } catch (err) {
      console.error('Error:', err)
      window.location.href = '/login'
    } finally {
      setLoading(false)
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
    
    // Fetch uptime stats for each site
    if (sitesData) {
      for (const site of sitesData) {
        fetchUptimeStats(site.id)
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
          is_active: true
        }])
        .select()

      if (error) throw error

      if (data) {
        setSites(prev => [data[0], ...prev])
        setSiteForm({ name: '', url: '' })
        setShowAddSite(false)
        // Fetch uptime stats for the new site
        fetchUptimeStats(data[0].id)
      }
    } catch (error) {
      console.error('Error adding site:', error)
    } finally {
      setAddSiteLoading(false)
    }
  }

  const handleDeleteSite = async (siteId: string) => {
    if (!confirm('Are you sure you want to delete this site?')) return

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
      const response = await fetch(`/api/sites/${siteId}/ping`, {
        method: 'POST'
      })

      if (response.ok) {
        const result = await response.json()
        // Update the site status in our local state
        setSites(prev => prev.map(site =>
          site.id === siteId
            ? { ...site, status: result.status, last_checked: result.checkedAt }
            : site
        ))
        // Refresh uptime stats for this site
        fetchUptimeStats(siteId)
      }
    } catch (error) {
      console.error('Error checking site:', error)
    } finally {
      setCheckingSites(prev => ({ ...prev, [siteId]: false }))
    }
  }

  const handleCheckAllSites = async () => {
    setCheckingAll(true)

    try {
      // Check all sites in parallel
      const checkPromises = sites.map(site =>
        fetch(`/api/sites/${site.id}/ping`, { method: 'POST' })
          .then(response => response.ok ? response.json() : null)
          .then(result => ({ siteId: site.id, result }))
          .catch(() => ({ siteId: site.id, result: null }))
      )

      const results = await Promise.all(checkPromises)

      // Update all site statuses
      setSites(prev => prev.map(site => {
        const checkResult = results.find(r => r.siteId === site.id)
        if (checkResult?.result) {
          return {
            ...site,
            status: checkResult.result.status,
            last_checked: checkResult.result.checkedAt
          }
        }
        return site
      }))

      // Refresh uptime stats for all sites
      sites.forEach(site => fetchUptimeStats(site.id))

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
                {sites.length > 0 && (
                  <button
                    onClick={handleCheckAllSites}
                    disabled={checkingAll}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-700 disabled:opacity-50"
                  >
                    <Activity className="w-4 h-4 mr-2" />
                    {checkingAll ? 'Checking...' : 'Check All Sites'}
                  </button>
                )}
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

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Globe className="w-8 h-8 text-blue-500" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Sites</dt>
                      <dd className="text-lg font-medium text-gray-900">{sites.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {sites.filter(site => site.status === 'up').length}
                      </span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Online</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {sites.filter(site => site.status === 'up').length}
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
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {sites.filter(site => site.status === 'down').length}
                      </span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Offline</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {sites.filter(site => site.status === 'down').length}
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
                    <Activity className="w-8 h-8 text-blue-500" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Sites</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {sites.filter(site => site.is_active).length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sites List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Your Websites</h3>
              
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
                            </div>
                          </div>

                          {/* Center: Compact stats */}
                          <div className="hidden md:flex items-center space-x-6 mx-6">
                            <div className="text-center">
                              <div className="text-xs text-gray-500 mb-1">Uptime</div>
                              <div className="text-sm font-semibold text-gray-900">
                                {statsLoading ? '...' : stats ? `${stats.uptime}%` : 'N/A'}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-gray-500 mb-1">Checks</div>
                              <div className="text-sm font-semibold text-gray-900">
                                {statsLoading ? '...' : stats ? stats.total : 'N/A'}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-gray-500 mb-1">Last Check</div>
                              <div className="text-sm font-semibold text-gray-900">
                                {site.last_checked
                                  ? new Date(site.last_checked).toLocaleDateString('en-US', {
                                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                    })
                                  : 'Never'
                                }
                              </div>
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <button
                              onClick={() => handleManualCheck(site.id)}
                              disabled={checkingSites[site.id]}
                              className="text-green-600 hover:text-green-800 text-sm px-2 py-1 rounded hover:bg-green-50 disabled:opacity-50 flex items-center"
                              title="Run manual check"
                            >
                              <Activity className="w-3 h-3 mr-1" />
                              {checkingSites[site.id] ? 'Checking...' : 'Check'}
                            </button>
                            <button
                              onClick={() => handleEditSite(site)}
                              className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded hover:bg-blue-50"
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
                        <div className="md:hidden mt-3 grid grid-cols-3 gap-3 text-center">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Uptime</div>
                            <div className="text-sm font-semibold text-gray-900">
                              {statsLoading ? '...' : stats ? `${stats.uptime}%` : 'N/A'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Checks</div>
                            <div className="text-sm font-semibold text-gray-900">
                              {statsLoading ? '...' : stats ? stats.total : 'N/A'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Last Check</div>
                            <div className="text-sm font-semibold text-gray-900">
                              {site.last_checked
                                ? new Date(site.last_checked).toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric'
                                  })
                                : 'Never'
                              }
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
                  <h3 className="text-xl font-bold mb-2">Unlock Pro Integrations</h3>
                  <p className="text-blue-100 mb-4">
                    Get instant alerts through Slack, Discord, and custom webhooks. Monitor up to 25 websites with advanced features.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                      <span className="text-sm">Slack notifications</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                      <span className="text-sm">Discord alerts</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                      <span className="text-sm">Custom webhooks</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                      <span className="text-sm">25 websites</span>
                    </div>
                  </div>
                  <Link href="/pricing">
                    <button className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors">
                      Upgrade to Pro - $29/mo
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