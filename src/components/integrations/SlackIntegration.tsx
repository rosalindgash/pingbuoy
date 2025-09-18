'use client'

import { useState, useEffect } from 'react'
import { 
  Slack, 
  CheckCircle, 
  AlertTriangle, 
  Settings, 
  Test, 
  Trash2,
  ExternalLink,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SlackIntegrationProps {
  userId: string
  onSave?: (config: SlackConfig) => Promise<void>
  onTest?: (config: SlackConfig) => Promise<{ success: boolean; error?: string }>
  onDelete?: () => Promise<void>
  initialConfig?: Partial<SlackConfig>
  isProUser?: boolean
}

interface SlackConfig {
  name: string
  webhook_url: string
  channel?: string
  enabled_events: string[]
  event_filters: {
    min_downtime_seconds?: number
    include_recovery?: boolean
    include_maintenance?: boolean
  }
}

export function SlackIntegration({
  userId,
  onSave,
  onTest,
  onDelete,
  initialConfig,
  isProUser = false
}: SlackIntegrationProps) {
  const [config, setConfig] = useState<SlackConfig>({
    name: initialConfig?.name || 'Slack Integration',
    webhook_url: initialConfig?.webhook_url || '',
    channel: initialConfig?.channel || '',
    enabled_events: initialConfig?.enabled_events || ['downtime', 'recovery'],
    event_filters: initialConfig?.event_filters || {
      min_downtime_seconds: 60,
      include_recovery: true,
      include_maintenance: false
    }
  })

  const [showWebhookUrl, setShowWebhookUrl] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  // Validation
  const validateConfig = (): string[] => {
    const validationErrors: string[] = []

    if (!config.name.trim()) {
      validationErrors.push('Integration name is required')
    }

    if (!config.webhook_url.trim()) {
      validationErrors.push('Slack webhook URL is required')
    } else if (!config.webhook_url.match(/^https:\/\/hooks\.slack\.com\/services\/[A-Z0-9/]+$/)) {
      validationErrors.push('Invalid Slack webhook URL format')
    }

    if (config.channel && !config.channel.startsWith('#')) {
      validationErrors.push('Channel name must start with #')
    }

    if (config.enabled_events.length === 0) {
      validationErrors.push('At least one event type must be selected')
    }

    if (config.event_filters.min_downtime_seconds && config.event_filters.min_downtime_seconds < 30) {
      validationErrors.push('Minimum downtime must be at least 30 seconds')
    }

    return validationErrors
  }

  const handleSave = async () => {
    if (!onSave) return

    setSaving(true)
    setErrors([])

    try {
      const validationErrors = validateConfig()
      if (validationErrors.length > 0) {
        setErrors(validationErrors)
        return
      }

      await onSave(config)
      setTestResult(null) // Clear any previous test results
    } catch (error) {
      setErrors(['Failed to save Slack integration'])
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!onTest) return

    setTesting(true)
    setErrors([])

    try {
      const validationErrors = validateConfig()
      if (validationErrors.length > 0) {
        setErrors(validationErrors)
        return
      }

      const result = await onTest(config)
      setTestResult(result)
      
      if (!result.success) {
        setErrors([result.error || 'Test failed'])
      }
    } catch (error) {
      setTestResult({ success: false, error: 'Test request failed' })
      setErrors(['Test request failed'])
    } finally {
      setTesting(false)
    }
  }

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(config.webhook_url)
  }

  const updateConfig = <K extends keyof SlackConfig>(key: K, value: SlackConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }))
    setErrors([])
    setTestResult(null)
  }

  const toggleEvent = (event: string) => {
    const updatedEvents = config.enabled_events.includes(event)
      ? config.enabled_events.filter(e => e !== event)
      : [...config.enabled_events, event]
    
    updateConfig('enabled_events', updatedEvents)
  }

  if (!isProUser) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Slack className="h-6 w-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900">Slack Integration</h3>
            <p className="text-sm text-gray-600">Send alerts to your Slack channels</p>
          </div>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Pro
          </span>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">Pro Feature</h4>
              <p className="text-sm text-blue-700 mt-1">
                Slack integration is available with Pro plans. Upgrade to send monitoring alerts 
                directly to your Slack channels.
              </p>
              <button className="mt-3 text-sm font-medium text-blue-800 hover:text-blue-900">
                Upgrade to Pro →
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Slack className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Slack Integration</h3>
              <p className="text-sm text-gray-600">Send alerts to your Slack channels</p>
            </div>
          </div>
          {onDelete && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onDelete}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-red-800">Please fix the following errors:</h4>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Test Result */}
      {testResult && (
        <div className={`p-4 border-b ${
          testResult.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center">
            {testResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-400" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-400" />
            )}
            <p className={`ml-3 text-sm font-medium ${
              testResult.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {testResult.success 
                ? 'Test message sent successfully!' 
                : `Test failed: ${testResult.error}`
              }
            </p>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <div className="p-6 space-y-6">
        {/* Integration Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Integration Name
          </label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => updateConfig('name', e.target.value)}
            placeholder="e.g., Production Alerts"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            A descriptive name for this integration
          </p>
        </div>

        {/* Slack Webhook URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Slack Webhook URL *
          </label>
          <div className="relative">
            <input
              type={showWebhookUrl ? 'text' : 'password'}
              value={config.webhook_url}
              onChange={(e) => updateConfig('webhook_url', e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
              <button
                type="button"
                onClick={() => setShowWebhookUrl(!showWebhookUrl)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                {showWebhookUrl ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              {config.webhook_url && (
                <button
                  type="button"
                  onClick={copyWebhookUrl}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <Copy className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center mt-2 text-xs text-gray-500">
            <ExternalLink className="h-3 w-3 mr-1" />
            <a 
              href="https://api.slack.com/messaging/webhooks" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-blue-600"
            >
              Learn how to create a Slack webhook
            </a>
          </div>
        </div>

        {/* Channel Override */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Channel Override (Optional)
          </label>
          <input
            type="text"
            value={config.channel || ''}
            onChange={(e) => updateConfig('channel', e.target.value)}
            placeholder="#monitoring"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Override the default channel configured in your webhook
          </p>
        </div>

        {/* Event Types */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Event Types *
          </label>
          <div className="space-y-2">
            {[
              { id: 'downtime', label: 'Website Down', description: 'When a website goes offline' },
              { id: 'recovery', label: 'Website Recovery', description: 'When a website comes back online' },
              { id: 'maintenance', label: 'Maintenance Alerts', description: 'Scheduled maintenance notifications' },
              { id: 'report', label: 'Reports', description: 'Weekly and monthly reports' }
            ].map((event) => (
              <label key={event.id} className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={config.enabled_events.includes(event.id)}
                  onChange={() => toggleEvent(event.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{event.label}</p>
                  <p className="text-xs text-gray-500">{event.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Event Filters */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Event Filters
          </label>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Minimum Downtime (seconds)
              </label>
              <input
                type="number"
                min="30"
                max="3600"
                value={config.event_filters.min_downtime_seconds || 60}
                onChange={(e) => updateConfig('event_filters', {
                  ...config.event_filters,
                  min_downtime_seconds: parseInt(e.target.value)
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Only send alerts for outages longer than this duration
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
        <Button
          onClick={handleTest}
          disabled={testing || !config.webhook_url}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <Test className="h-4 w-4" />
          <span>{testing ? 'Testing...' : 'Test Integration'}</span>
        </Button>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2"
        >
          <Settings className="h-4 w-4" />
          <span>{saving ? 'Saving...' : 'Save Integration'}</span>
        </Button>
      </div>
    </div>
  )
}