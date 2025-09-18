import { Metadata } from 'next'
import { Suspense } from 'react'
import { NotificationSettings } from '@/components/NotificationSettings'
import { Bell, History, Settings, Shield } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Notification Settings - PingBuoy Dashboard',
  description: 'Configure your alert preferences and notification settings for website monitoring.',
}

// Loading component
function SettingsLoading() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  )
}

// Notification History Component
function NotificationHistory() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <History className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Recent Notifications</h2>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          View your recent alert history and delivery status
        </p>
      </div>
      
      <div className="p-6">
        <div className="text-center py-8">
          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications yet</h3>
          <p className="text-gray-600">
            Once you add websites and configure monitoring, your notifications will appear here.
          </p>
        </div>
      </div>
    </div>
  )
}

// Statistics Component
function NotificationStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Bell className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Alerts Sent</p>
            <p className="text-2xl font-bold text-gray-900">0</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="p-3 bg-green-100 rounded-lg">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Delivered</p>
            <p className="text-2xl font-bold text-gray-900">0</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="p-3 bg-red-100 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Failed</p>
            <p className="text-2xl font-bold text-gray-900">0</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Mock function to simulate API calls (replace with actual API integration)
async function saveNotificationSettings(settings: any) {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // In production, this would make an API call to save settings
  console.log('Saving notification settings:', settings)
  
  // Mock success response
  return Promise.resolve()
}

export default function NotificationSettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-3">
            <Settings className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
              <p className="text-gray-600">
                Configure how and when you receive alerts about your websites
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics */}
        <NotificationStats />

        {/* Settings Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="lg:col-span-1">
            <Suspense fallback={<SettingsLoading />}>
              <NotificationSettings
                userId="mock-user-id" // This would come from authentication context
                userPlan="free" // This would come from user subscription data
                initialSettings={{
                  // Mock initial settings - would come from API
                  email_enabled: true,
                  email_downtime_alerts: true,
                  email_recovery_alerts: true,
                  email_maintenance_alerts: false,
                  email_weekly_reports: true,
                  email_monthly_reports: false,
                  sms_enabled: false,
                  sms_phone_number: null,
                  alert_frequency: 'immediate',
                  min_downtime_duration_seconds: 60,
                  quiet_hours_enabled: false
                }}
                onSave={saveNotificationSettings}
              />
            </Suspense>
          </div>
          
          <div className="lg:col-span-1">
            <NotificationHistory />
            
            {/* Pro Features Upsell */}
            <div className="mt-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-sm p-6 text-white">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold mb-2">Upgrade to Pro</h3>
                  <p className="text-blue-100 mb-4">
                    Unlock advanced notification features including SMS alerts, Slack integration, 
                    webhooks, and escalation policies.
                  </p>
                  <ul className="text-sm text-blue-100 space-y-1 mb-4">
                    <li>• SMS notifications to your phone</li>
                    <li>• Slack and Discord integrations</li>
                    <li>• Custom webhook endpoints</li>
                    <li>• Escalation alerts</li>
                    <li>• Advanced filtering options</li>
                  </ul>
                  <button className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors">
                    Upgrade Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Import missing icons
import { CheckCircle, AlertTriangle } from 'lucide-react'