'use client'

import { useState } from 'react'
import { X, Slack, Webhook, MessageSquare, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface IntegrationModalProps {
  isOpen: boolean
  onClose: () => void
  integrationType: 'slack' | 'webhook' | 'discord' | null
  onSave: (data: any) => Promise<void>
}

export function IntegrationModal({ isOpen, onClose, integrationType, onSave }: IntegrationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    webhook_url: '',
    events: ['downtime', 'recovery'] as string[]
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !integrationType) return null

  const getIcon = () => {
    switch (integrationType) {
      case 'slack':
        return <Slack className="h-6 w-6 text-green-600" />
      case 'webhook':
        return <Webhook className="h-6 w-6 text-purple-600" />
      case 'discord':
        return <MessageSquare className="h-6 w-6 text-indigo-600" />
    }
  }

  const getTitle = () => {
    switch (integrationType) {
      case 'slack':
        return 'Set Up Slack Integration'
      case 'webhook':
        return 'Configure Webhook'
      case 'discord':
        return 'Connect Discord'
    }
  }

  const getPlaceholder = () => {
    switch (integrationType) {
      case 'slack':
        return 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX'
      case 'webhook':
        return 'https://your-server.com/webhooks/pingbuoy'
      case 'discord':
        return 'https://discord.com/api/webhooks/1234567890/abcdefghijklmnop'
    }
  }

  const getInstructions = () => {
    switch (integrationType) {
      case 'slack':
        return (
          <div className="text-sm text-gray-600 space-y-2">
            <p>To get your Slack webhook URL:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Go to your Slack workspace</li>
              <li>Click on your workspace name → Settings & administration → Manage apps</li>
              <li>Search for "Incoming Webhooks" and add to Slack</li>
              <li>Choose a channel and copy the webhook URL</li>
            </ol>
          </div>
        )
      case 'webhook':
        return (
          <div className="text-sm text-gray-600 space-y-2">
            <p>Enter your webhook endpoint URL. PingBuoy will send POST requests to this URL when events occur.</p>
            <p className="text-xs">Payload format: JSON with event type, site details, and timestamp.</p>
          </div>
        )
      case 'discord':
        return (
          <div className="text-sm text-gray-600 space-y-2">
            <p>To get your Discord webhook URL:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Go to your Discord server</li>
              <li>Right-click on the channel → Edit Channel</li>
              <li>Go to Integrations → Webhooks → New Webhook</li>
              <li>Copy the webhook URL</li>
            </ol>
          </div>
        )
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      await onSave({
        ...formData,
        integration_type: integrationType
      })
      onClose()
      setFormData({ name: '', webhook_url: '', events: ['downtime', 'recovery'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save integration')
    } finally {
      setSaving(false)
    }
  }

  const toggleEvent = (event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-50 rounded-lg">
              {getIcon()}
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{getTitle()}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Instructions */}
        <div className="p-6 bg-blue-50 border-b border-blue-100">
          {getInstructions()}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Integration Name
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={`My ${integrationType.charAt(0).toUpperCase() + integrationType.slice(1)} Integration`}
            />
          </div>

          <div>
            <label htmlFor="webhook_url" className="block text-sm font-medium text-gray-700 mb-2">
              Webhook URL
            </label>
            <input
              type="url"
              id="webhook_url"
              required
              value={formData.webhook_url}
              onChange={(e) => setFormData(prev => ({ ...prev, webhook_url: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder={getPlaceholder()}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Notification Events
            </label>
            <div className="space-y-2">
              {['downtime', 'recovery', 'maintenance', 'ssl_expiry'].map((event) => (
                <label key={event} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.events.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    {event === 'ssl_expiry' ? 'SSL Expiry' : event.charAt(0).toUpperCase() + event.slice(1)}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Select which events should trigger notifications to this integration
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Integration'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
