'use client'

import { useState, useEffect } from 'react'
import {
  Webhook,
  CheckCircle,
  AlertTriangle,
  Settings,
  TestTube,
  Trash2,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  Plus,
  X,
  Code
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WebhookIntegrationProps {
  userId: string
  onSave?: (config: WebhookConfig) => Promise<void>
  onTest?: (config: WebhookConfig) => Promise<{ success: boolean; error?: string; responseTime?: number }>
  onDelete?: () => Promise<void>
  initialConfig?: Partial<WebhookConfig>
  isProUser?: boolean
}

interface WebhookConfig {
  name: string
  webhook_url: string
  webhook_method: 'POST' | 'PUT' | 'PATCH'
  webhook_headers: Record<string, string>
  webhook_secret?: string
  auth_type: 'none' | 'bearer' | 'basic' | 'api_key'
  auth_credentials: Record<string, string>
  enabled_events: string[]
  event_filters: {
    min_downtime_seconds?: number
    include_recovery?: boolean
    include_maintenance?: boolean
  }
  timeout_seconds: number
  retry_attempts: number
}

export function WebhookIntegration({
  userId,
  onSave,
  onTest,
  onDelete,
  initialConfig,
  isProUser = false
}: WebhookIntegrationProps) {
  const [config, setConfig] = useState<WebhookConfig>({
    name: initialConfig?.name || 'Webhook Integration',
    webhook_url: initialConfig?.webhook_url || '',
    webhook_method: initialConfig?.webhook_method || 'POST',
    webhook_headers: initialConfig?.webhook_headers || { 'Content-Type': 'application/json' },
    webhook_secret: initialConfig?.webhook_secret || '',
    auth_type: initialConfig?.auth_type || 'none',
    auth_credentials: initialConfig?.auth_credentials || {},
    enabled_events: initialConfig?.enabled_events || ['downtime', 'recovery'],
    event_filters: initialConfig?.event_filters || {
      min_downtime_seconds: 60,
      include_recovery: true,
      include_maintenance: false
    },
    timeout_seconds: initialConfig?.timeout_seconds || 30,
    retry_attempts: initialConfig?.retry_attempts || 3
  })

  const [showSecrets, setShowSecrets] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string; responseTime?: number } | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [newHeaderKey, setNewHeaderKey] = useState('')
  const [newHeaderValue, setNewHeaderValue] = useState('')

  // Validation
  const validateConfig = (): string[] => {
    const validationErrors: string[] = []

    if (!config.name.trim()) {
      validationErrors.push('Integration name is required')
    }

    if (!config.webhook_url.trim()) {
      validationErrors.push('Webhook URL is required')
    } else {
      try {
        const url = new URL(config.webhook_url)
        if (!['http:', 'https:'].includes(url.protocol)) {
          validationErrors.push('Webhook URL must use HTTP or HTTPS')
        }
        if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
          validationErrors.push('Webhook URL must use HTTPS in production')
        }
      } catch {
        validationErrors.push('Invalid webhook URL format')
      }
    }

    if (config.enabled_events.length === 0) {
      validationErrors.push('At least one event type must be selected')
    }

    if (config.timeout_seconds < 5 || config.timeout_seconds > 120) {
      validationErrors.push('Timeout must be between 5 and 120 seconds')
    }

    if (config.retry_attempts < 0 || config.retry_attempts > 10) {
      validationErrors.push('Retry attempts must be between 0 and 10')
    }

    // Auth validation
    if (config.auth_type === 'bearer' && !config.auth_credentials.token) {
      validationErrors.push('Bearer token is required for Bearer authentication')
    }
    
    if (config.auth_type === 'basic' && (!config.auth_credentials.username || !config.auth_credentials.password)) {
      validationErrors.push('Username and password are required for Basic authentication')
    }
    
    if (config.auth_type === 'api_key' && (!config.auth_credentials.key || !config.auth_credentials.value)) {
      validationErrors.push('API key name and value are required for API Key authentication')
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
      setTestResult(null)
    } catch (error) {
      setErrors(['Failed to save webhook integration'])
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

  const updateConfig = <K extends keyof WebhookConfig>(key: K, value: WebhookConfig[K]) => {
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

  const addHeader = () => {
    if (newHeaderKey && newHeaderValue) {
      updateConfig('webhook_headers', {
        ...config.webhook_headers,
        [newHeaderKey]: newHeaderValue
      })
      setNewHeaderKey('')
      setNewHeaderValue('')
    }
  }

  const removeHeader = (key: string) => {
    const newHeaders = { ...config.webhook_headers }
    delete newHeaders[key]
    updateConfig('webhook_headers', newHeaders)
  }

  if (!isProUser) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Webhook className="h-6 w-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900">Webhook Integration</h3>
            <p className="text-sm text-gray-600">Send alerts to custom HTTP endpoints</p>
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
                Webhook integrations are available with Pro plans. Send monitoring alerts 
                to any HTTP endpoint with custom payloads and authentication.
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
            <div className="p-2 bg-purple-100 rounded-lg">
              <Webhook className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Webhook Integration</h3>
              <p className="text-sm text-gray-600">Send alerts to custom HTTP endpoints</p>
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
          <div className="flex items-center justify-between">
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
                  ? 'Test request sent successfully!' 
                  : `Test failed: ${testResult.error}`
                }
              </p>
            </div>
            {testResult.responseTime && (
              <span className="text-sm text-gray-600">
                {testResult.responseTime}ms
              </span>
            )}
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
            placeholder="e.g., Production Alert Webhook"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Webhook URL and Method */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Webhook URL *
            </label>
            <input
              type="url"
              value={config.webhook_url}
              onChange={(e) => updateConfig('webhook_url', e.target.value)}
              placeholder="https://your-server.com/webhook"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Method
            </label>
            <select
              value={config.webhook_method}
              onChange={(e) => updateConfig('webhook_method', e.target.value as WebhookConfig['webhook_method'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>
        </div>

        {/* Authentication */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Authentication
          </label>
          <select
            value={config.auth_type}
            onChange={(e) => updateConfig('auth_type', e.target.value as WebhookConfig['auth_type'])}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="none">None</option>
            <option value="bearer">Bearer Token</option>
            <option value="basic">Basic Authentication</option>
            <option value="api_key">API Key</option>
          </select>

          {/* Auth Credentials */}
          {config.auth_type === 'bearer' && (
            <div className="mt-3">
              <label className="block text-sm text-gray-700 mb-1">Bearer Token</label>
              <div className="relative">
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={config.auth_credentials.token || ''}
                  onChange={(e) => updateConfig('auth_credentials', {
                    ...config.auth_credentials,
                    token: e.target.value
                  })}
                  placeholder="your-bearer-token"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSecrets(!showSecrets)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {config.auth_type === 'basic' && (
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={config.auth_credentials.username || ''}
                  onChange={(e) => updateConfig('auth_credentials', {
                    ...config.auth_credentials,
                    username: e.target.value
                  })}
                  placeholder="username"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showSecrets ? 'text' : 'password'}
                    value={config.auth_credentials.password || ''}
                    onChange={(e) => updateConfig('auth_credentials', {
                      ...config.auth_credentials,
                      password: e.target.value
                    })}
                    placeholder="password"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecrets(!showSecrets)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {config.auth_type === 'api_key' && (
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Header Name</label>
                <input
                  type="text"
                  value={config.auth_credentials.key || ''}
                  onChange={(e) => updateConfig('auth_credentials', {
                    ...config.auth_credentials,
                    key: e.target.value
                  })}
                  placeholder="X-API-Key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">API Key Value</label>
                <div className="relative">
                  <input
                    type={showSecrets ? 'text' : 'password'}
                    value={config.auth_credentials.value || ''}
                    onChange={(e) => updateConfig('auth_credentials', {
                      ...config.auth_credentials,
                      value: e.target.value
                    })}
                    placeholder="your-api-key"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecrets(!showSecrets)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Custom Headers */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Custom Headers
          </label>
          <div className="space-y-2">
            {Object.entries(config.webhook_headers).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={key}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
                <span className="text-gray-400">:</span>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => updateConfig('webhook_headers', {
                    ...config.webhook_headers,
                    [key]: e.target.value
                  })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeHeader(key)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {/* Add new header */}
            <div className="flex items-center space-x-2 pt-2 border-t border-gray-200">
              <input
                type="text"
                value={newHeaderKey}
                onChange={(e) => setNewHeaderKey(e.target.value)}
                placeholder="Header name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400">:</span>
              <input
                type="text"
                value={newHeaderValue}
                onChange={(e) => setNewHeaderValue(e.target.value)}
                placeholder="Header value"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={addHeader}
                disabled={!newHeaderKey || !newHeaderValue}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Webhook Secret */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Webhook Secret (Optional)
          </label>
          <div className="relative">
            <input
              type={showSecrets ? 'text' : 'password'}
              value={config.webhook_secret || ''}
              onChange={(e) => updateConfig('webhook_secret', e.target.value)}
              placeholder="Secret for webhook signature verification"
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowSecrets(!showSecrets)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Used to generate HMAC-SHA256 signature in X-Webhook-Signature header
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

        {/* Advanced Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timeout (seconds)
            </label>
            <input
              type="number"
              min="5"
              max="120"
              value={config.timeout_seconds}
              onChange={(e) => updateConfig('timeout_seconds', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Retry Attempts
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={config.retry_attempts}
              onChange={(e) => updateConfig('retry_attempts', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Payload Preview */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payload Preview
          </label>
          <div className="bg-gray-100 rounded-md p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Sample Downtime Alert</span>
              <Code className="h-4 w-4 text-gray-500" />
            </div>
            <pre className="text-xs text-gray-600 overflow-x-auto">
{`{
  "event": "downtime",
  "website": {
    "id": "uuid",
    "name": "My Website",
    "url": "https://example.com"
  },
  "alert": {
    "timestamp": "2025-01-12T10:30:00Z",
    "status_code": 503,
    "response_time": null,
    "error": "Service Unavailable"
  },
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}`}
            </pre>
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
          <TestTube className="h-4 w-4" />
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