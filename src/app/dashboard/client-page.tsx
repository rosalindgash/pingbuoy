'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
// Removed server-side import that was causing build error
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import SitesList from '@/components/dashboard/SitesList'
import AddSiteForm from '@/components/dashboard/AddSiteForm'
import { Plus, Globe } from 'lucide-react'

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

export default function ClientDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          window.location.href = '/login'
          return
        }

        setUser(user)

        // Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('Profile error:', profileError)
        } else {
          setProfile(profileData)
        }

        // Get user sites - using client-side approach
        const { data: sitesData, error: sitesError } = await supabase
          .from('sites')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (sitesError) {
          console.error('Sites error:', sitesError)
        } else {
          setSites(sitesData || [])
        }

      } catch (err) {
        console.error('Dashboard error:', err)
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    )
  }

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || user?.email?.split('@')[0] || 'User'

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome, {displayName}!
            </h1>
            <p className="text-gray-600">Manage your websites and monitoring settings</p>
          </div>
          <AddSiteForm />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Globe className="w-8 h-8 text-blue-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Sites
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {sites.length}
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
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {sites.filter(site => site.status === 'up').length}
                    </span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Online
                    </dt>
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
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Offline
                    </dt>
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
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    profile?.plan === 'founder' ? 'bg-purple-500' : 
                    profile?.plan === 'pro' ? 'bg-blue-500' : 'bg-gray-500'
                  }`}>
                    <span className="text-white text-sm font-semibold">
                      {profile?.plan?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Plan
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {profile?.plan ? profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1) : 'Free'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sites Management */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Your Websites</h2>
            {sites.length > 0 && (
              <div className="text-sm text-gray-500">
                <a href="/dashboard/uptime" className="text-blue-600 hover:text-blue-500">
                  View detailed uptime stats →
                </a>
              </div>
            )}
          </div>
          
          {sites.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Plus className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No websites yet
              </h3>
              <p className="text-gray-600 mb-6">
                Start monitoring your first website by adding it above.
              </p>
            </div>
          ) : (
            <SitesList sites={sites} />
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}