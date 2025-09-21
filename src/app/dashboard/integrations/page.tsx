'use client'

export const dynamic = 'force-dynamic'

import { Suspense } from 'react'

// ... rest of your imports
import { Suspense } from 'react'
import {
  Puzzle,
  Plus,
  Slack,
  Webhook,
  MessageSquare,
  Key,
  Settings,
  Activity,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  ExternalLink,
  Zap,
  Shield,
  ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReliableButton } from '@/components/ui/reliable-button'
import Link from 'next/link'

// Mock data - in production, this would come from API
const mockIntegrations = []

const mockApiKeys = []

// Loading components
function IntegrationsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-full"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Integration card component
function IntegrationCard({ integration }: { integration: typeof mockIntegrations[0] }) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'slack': return <Slack className="h-6 w-6 text-green-600" />
      case 'webhook': return <Webhook className="h-6 w-6 text-purple-600" />
      case 'discord': return <MessageSquare className="h-6 w-6 text-indigo-600" />
      default: return <Settings className="h-6 w-6 text-gray-600" />
    }
  }

  const getStatusIcon = (status: string, testStatus?: string | null) => {
    if (status === 'active' && testStatus === 'success') {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    } else if (status === 'error' || testStatus === 'failed') {
      return <XCircle className="h-4 w-4 text-red-500" />
    } else if (status === 'inactive') {
      return <Clock className="h-4 w-4 text-gray-400" />
    }
    return <AlertCircle className="h-4 w-4 text-yellow-500" />
  }

  const getStatusText = (status: string, testStatus?: string | null) => {
    if (status === 'active' && testStatus === 'success') return 'Active'
    if (status === 'error' || testStatus === 'failed') return 'Error'
    if (status === 'inactive') return 'Inactive'
    return 'Warning'
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-50 rounded-lg">
              {getIcon(integration.type)}
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{integration.name}</h3>
              <p className="text-sm text-gray-500 capitalize">{integration.type} Integration</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(integration.status, integration.lastTestStatus)}
            <span className="text-sm font-medium text-gray-700">
              {getStatusText(integration.status, integration.lastTestStatus)}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Last Test:</span>
            <span className="text-gray-900">{formatDate(integration.lastTest)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Notifications Sent:</span>
            <span className="text-gray-900">{integration.totalNotifications.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Events:</span>
            <span className="text-gray-900">
              {integration.config.events.join(', ')}
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between">
        <Button size="sm" variant="outline">
          Test
        </Button>
        <Button size="sm" variant="outline">
          Configure
        </Button>
      </div>
    </div>
  )
}

// API Key card component
function ApiKeyCard({ apiKey }: { apiKey: typeof mockApiKeys[0] }) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Key className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">{apiKey.name}</h3>
            <p className="text-sm text-gray-500 font-mono">{apiKey.prefix}••••••••</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-gray-700 capitalize">{apiKey.status}</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Permissions:</span>
          <div className="flex space-x-1">
            {apiKey.permissions.map((permission) => (
              <span 
                key={permission}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {permission}
              </span>
            ))}
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Last Used:</span>
          <span className="text-gray-900">{formatDate(apiKey.lastUsed)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Requests:</span>
          <span className="text-gray-900">{apiKey.totalRequests.toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
        <Button size="sm" variant="outline">
          Regenerate
        </Button>
        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
          Revoke
        </Button>
      </div>
    </div>
  )
}

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Puzzle className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
                <p className="text-gray-600">
                  Connect PingBuoy with your favorite tools and services
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Link href="/dashboard">
                <Button variant="outline" className="flex items-center space-x-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Dashboard</span>
                </Button>
              </Link>
              <Link href="/dashboard/api">
                <Button variant="outline" className="flex items-center space-x-2">
                  <ExternalLink className="h-4 w-4" />
                  <span>API Docs</span>
                </Button>
              </Link>
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add Integration</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Integrations</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Notifications Sent</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Key className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">API Keys</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Zap className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">API Requests</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Available Integrations */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Available Integrations</h2>
            <Link href="/dashboard/integrations/browse">
              <Button variant="outline" size="sm">
                Browse All
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Slack */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Slack className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Slack</h3>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Pro
                  </span>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Send monitoring alerts directly to your Slack channels with rich formatting and customizable notifications.
              </p>
              <Button size="sm" variant="outline" className="w-full">
                Set Up Slack
              </Button>
            </div>

            {/* Webhooks */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Webhook className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Webhooks</h3>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Pro
                  </span>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Send HTTP requests to any endpoint when incidents occur. Perfect for custom integrations and automation.
              </p>
              <Button size="sm" variant="outline" className="w-full">
                Configure Webhook
              </Button>
            </div>

            {/* Discord */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Discord</h3>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Pro
                  </span>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Get notified in your Discord server when your websites experience downtime or recover from incidents.
              </p>
              <Button size="sm" variant="outline" className="w-full">
                Connect Discord
              </Button>
            </div>
          </div>
        </section>

        {/* Active Integrations */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Your Integrations</h2>
          </div>

          <Suspense fallback={<IntegrationsLoading />}>
            {mockIntegrations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockIntegrations.map((integration) => (
                  <IntegrationCard key={integration.id} integration={integration} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="p-3 bg-gray-100 rounded-lg w-fit mx-auto mb-4">
                  <Puzzle className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No integrations yet</h3>
                <p className="text-gray-600 mb-6">
                  Connect your favorite tools to receive notifications when your sites go down or recover.
                </p>
                <Button className="flex items-center space-x-2 mx-auto">
                  <Plus className="h-4 w-4" />
                  <span>Add Your First Integration</span>
                </Button>
              </div>
            )}
          </Suspense>
        </section>

        {/* API Keys Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">API Keys</h2>
              <p className="text-sm text-gray-600">
                Manage API keys for programmatic access to PingBuoy
              </p>
            </div>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Generate API Key</span>
            </Button>
          </div>

          {mockApiKeys.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mockApiKeys.map((apiKey) => (
                <ApiKeyCard key={apiKey.id} apiKey={apiKey} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="p-3 bg-gray-100 rounded-lg w-fit mx-auto mb-4">
                <Key className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No API keys yet</h3>
              <p className="text-gray-600 mb-6">
                Generate API keys to access PingBuoy data programmatically from your applications.
              </p>
              <Button className="flex items-center space-x-2 mx-auto">
                <Plus className="h-4 w-4" />
                <span>Generate Your First API Key</span>
              </Button>
            </div>
          )}
        </section>

        {/* Pro Features Upsell */}
        <section>
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-sm p-8 text-white">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Shield className="h-10 w-10 text-white" />
              </div>
              <div className="ml-4 flex-1">
                <h2 className="text-2xl font-bold mb-2">Unlock Advanced Integrations</h2>
                <p className="text-blue-100 mb-6">
                  Upgrade to Pro to access Slack, Discord, webhooks, and advanced API features. 
                  Get more flexibility in how you receive and process monitoring alerts.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-300" />
                    <span className="text-sm">Unlimited webhook integrations</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-300" />
                    <span className="text-sm">Slack & Discord notifications</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-300" />
                    <span className="text-sm">Advanced API access</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-300" />
                    <span className="text-sm">Custom event filtering</span>
                  </div>
                </div>
                <ReliableButton variant="outline-on-blue">
                  Upgrade to Pro
                </ReliableButton>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}