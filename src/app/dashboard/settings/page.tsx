'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AccountInformation from '@/components/dashboard/AccountInformation'
import BillingSection from '@/components/dashboard/BillingSection'
import MFASettings from '@/components/auth/MFASettings'
import PrivacyDataSection from '@/components/dashboard/PrivacyDataSection'
import { Bell, ArrowLeft, Shield } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  plan: 'free' | 'pro' | 'founder'
  created_at: string
  stripe_customer_id: string | null
}


export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notificationSettings, setNotificationSettings] = useState({
    uptime_alerts: true,
    dead_link_reports: true,
    recovery_notifications: true
  })

  const loadNotificationSettings = async () => {
    try {
      if (!user) return

      const { data, error } = await supabase
        .from('users')
        .select('notification_preferences')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error loading notification settings:', error)
        return
      }

      if (data?.notification_preferences) {
        setNotificationSettings(data.notification_preferences)
      }
    } catch (error) {
      console.error('Unexpected error loading notification settings:', error)
    }
  }

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUser(user)
      await fetchProfile(user.id)
      setLoading(false)
    }

    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadNotificationSettings()
    }
  }, [user])

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      setProfile(profileData)
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }


  const handleNotificationChange = (setting: string, enabled: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: enabled
    }))
  }

  const saveNotificationSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('You must be logged in to save settings')
        return
      }

      // Simple approach: Save to users table with notification preferences
      const { error } = await supabase
        .from('users')
        .update({
          notification_preferences: notificationSettings
        })
        .eq('id', user.id)

      if (error) {
        console.error('Error saving notification settings:', error)
        alert('Failed to save notification settings')
      } else {
        alert('Notification settings saved successfully!')
      }
    } catch (error) {
      console.error('Unexpected error saving notification settings:', error)
      alert('An unexpected error occurred')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center py-8">
          <p className="text-red-600">Error loading user profile</p>
          <button 
            onClick={() => fetchProfile(user.id)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-4 sm:p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2">Settings</h1>
              <p className="text-sm sm:text-base text-gray-600">Manage your account and preferences</p>
            </div>
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button variant="outline" className="flex items-center justify-center space-x-2 w-full sm:w-auto">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Account Information */}
          <AccountInformation profile={profile} />

          {/* Billing Information */}
          <BillingSection profile={profile} />

          {/* Notification Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Bell className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-medium text-gray-900">Notifications</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Uptime Alerts</p>
                  <p className="text-sm text-gray-500">Get notified when sites go down</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={notificationSettings.uptime_alerts}
                    onChange={(e) => handleNotificationChange('uptime_alerts', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Dead Link Reports</p>
                  <p className="text-sm text-gray-500">Email summaries after scans</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={notificationSettings.dead_link_reports}
                    onChange={(e) => handleNotificationChange('dead_link_reports', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Recovery Notifications</p>
                  <p className="text-sm text-gray-500">Get notified when sites come back online</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={notificationSettings.recovery_notifications}
                    onChange={(e) => handleNotificationChange('recovery_notifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="pt-4 border-t">
                <button
                  onClick={saveNotificationSettings}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>

          {/* Security Settings - MFA */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Shield className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-medium text-gray-900">Security</h2>
            </div>
            <MFASettings />
          </div>

          {/* Privacy & Data Section */}
          <PrivacyDataSection />

        </div>
      </div>
    </div>
  )
}