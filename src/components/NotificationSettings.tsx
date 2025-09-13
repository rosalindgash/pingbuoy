'use client'

import { useState, useEffect } from 'react'
import { 
  Mail, 
  MessageSquare, 
  Webhook, 
  Slack, 
  Clock, 
  Shield, 
  Settings, 
  Phone,
  AlertTriangle,
  CheckCircle,
  Save,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { 
  NotificationSettings as NotificationSettingsType,
  validateNotificationUpdate,
  validateProFeatureAccess,
  defaultNotificationSettings
} from '@/lib/notification-validation'

interface NotificationSettingsProps {
  userId: string
  userPlan?: 'free' | 'pro'
  initialSettings?: Partial<NotificationSettingsType>
  onSave?: (settings: NotificationSettingsType) => Promise<void>
}

export function NotificationSettings({ 
  userId, 
  userPlan = 'free', 
  initialSettings = {},
  onSave 
}: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettingsType>({
    ...defaultNotificationSettings,
    ...initialSettings
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [success, setSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<'email' | 'sms' | 'integrations' | 'advanced'>('email')

  const isPro = userPlan === 'pro'

  const updateSetting = <K extends keyof NotificationSettingsType>(
    key: K, 
    value: NotificationSettingsType[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setErrors([])
    setSuccess(false)
  }

  const handleSave = async () => {
    if (!onSave) return

    setSaving(true)
    setErrors([])

    try {
      // Validate settings
      const validation = validateNotificationUpdate(settings)
      if (!validation.success) {
        setErrors(validation.errors || ['Invalid settings'])
        return
      }

      // Check Pro feature access
      const proValidation = validateProFeatureAccess(settings, userPlan)
      if (!proValidation.success) {
        setErrors(proValidation.errors || ['Pro features not available'])
        return
      }

      await onSave(settings)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      setErrors(['Failed to save notification settings'])
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  const renderProBadge = () => (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      Pro
    </span>
  )

  const renderEmailSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-4">
        <Mail className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-medium text-gray-900">Email Notifications</h3>
      </div>

      <div className="space-y-4">
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={settings.email_enabled}
            onChange={(e) => updateSetting('email_enabled', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="text-sm font-medium text-gray-900">Enable email notifications</span>
        </label>

        {settings.email_enabled && (
          <div className="ml-7 space-y-3 border-l-2 border-gray-200 pl-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.email_downtime_alerts}
                onChange={(e) => updateSetting('email_downtime_alerts', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Downtime alerts</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.email_recovery_alerts}
                onChange={(e) => updateSetting('email_recovery_alerts', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Recovery alerts</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.email_maintenance_alerts}
                onChange={(e) => updateSetting('email_maintenance_alerts', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Maintenance alerts</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.email_weekly_reports}
                onChange={(e) => updateSetting('email_weekly_reports', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Weekly reports</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.email_monthly_reports}
                onChange={(e) => updateSetting('email_monthly_reports', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Monthly reports</span>
            </label>
          </div>
        )}
      </div>
    </div>
  )

  const renderSMSSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-4">
        <Phone className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-medium text-gray-900">SMS Notifications</h3>
        {!isPro && renderProBadge()}
      </div>

      {!isPro && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            SMS notifications are available with Pro plans. 
            <button className="font-medium underline hover:no-underline ml-1">
              Upgrade to Pro
            </button>
          </p>
        </div>
      )}

      <div className="space-y-4">
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={settings.sms_enabled}
            onChange={(e) => updateSetting('sms_enabled', e.target.checked)}
            disabled={!isPro}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
          />
          <span className="text-sm font-medium text-gray-900">Enable SMS notifications</span>
        </label>

        {settings.sms_enabled && isPro && (
          <div className="ml-7 space-y-3 border-l-2 border-gray-200 pl-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={settings.sms_phone_number || ''}
                onChange={(e) => updateSetting('sms_phone_number', e.target.value || null)}
                placeholder="+1234567890"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {settings.sms_phone_number && !settings.sms_phone_verified && (
                <p className="text-sm text-amber-600 mt-1">
                  Phone number not verified. <button className="font-medium underline">Verify now</button>
                </p>
              )}
            </div>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.sms_downtime_alerts}
                onChange={(e) => updateSetting('sms_downtime_alerts', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Downtime alerts</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.sms_recovery_alerts}
                onChange={(e) => updateSetting('sms_recovery_alerts', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Recovery alerts</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.sms_critical_alerts_only}
                onChange={(e) => updateSetting('sms_critical_alerts_only', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Critical alerts only</span>
            </label>
          </div>
        )}
      </div>
    </div>
  )

  const renderIntegrationSettings = () => (
    <div className="space-y-8">
      {/* Webhook Integration */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <Webhook className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">Webhook Integration</h3>
          {!isPro && renderProBadge()}
        </div>

        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={settings.webhook_enabled}
            onChange={(e) => updateSetting('webhook_enabled', e.target.checked)}
            disabled={!isPro}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
          />
          <span className="text-sm font-medium text-gray-900">Enable webhook notifications</span>
        </label>

        {settings.webhook_enabled && isPro && (
          <div className="ml-7 space-y-3 border-l-2 border-gray-200 pl-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webhook URL
              </label>
              <input
                type="url"
                value={settings.webhook_url || ''}
                onChange={(e) => updateSetting('webhook_url', e.target.value || null)}
                placeholder="https://your-server.com/webhook"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webhook Secret (Optional)
              </label>
              <input
                type="password"
                value={settings.webhook_secret || ''}
                onChange={(e) => updateSetting('webhook_secret', e.target.value || null)}
                placeholder="Enter secret for webhook verification"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Slack Integration */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <Slack className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">Slack Integration</h3>
          {!isPro && renderProBadge()}
        </div>

        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={settings.slack_enabled}
            onChange={(e) => updateSetting('slack_enabled', e.target.checked)}
            disabled={!isPro}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
          />
          <span className="text-sm font-medium text-gray-900">Enable Slack notifications</span>
        </label>

        {settings.slack_enabled && isPro && (
          <div className="ml-7 space-y-3 border-l-2 border-gray-200 pl-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slack Webhook URL
              </label>
              <input
                type="url"
                value={settings.slack_webhook_url || ''}
                onChange={(e) => updateSetting('slack_webhook_url', e.target.value || null)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Channel (Optional)
              </label>
              <input
                type="text"
                value={settings.slack_channel || ''}
                onChange={(e) => updateSetting('slack_channel', e.target.value || null)}
                placeholder="#monitoring"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderAdvancedSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-4">
        <Settings className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-medium text-gray-900">Advanced Settings</h3>
      </div>

      {/* Alert Frequency */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Alert Frequency
        </label>
        <select
          value={settings.alert_frequency}
          onChange={(e) => updateSetting('alert_frequency', e.target.value as any)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="immediate">Immediate</option>
          <option value="every_5min">Every 5 minutes</option>
          <option value="every_15min">Every 15 minutes</option>
          <option value="every_hour">Every hour</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          How often to send repeat alerts for ongoing issues
        </p>
      </div>

      {/* Minimum Downtime Duration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Minimum Downtime Duration (seconds)
        </label>
        <input
          type="number"
          min="30"
          max="1800"
          value={settings.min_downtime_duration_seconds}
          onChange={(e) => updateSetting('min_downtime_duration_seconds', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Wait this long before sending alerts to reduce false positives
        </p>
      </div>

      {/* Quiet Hours */}
      <div className="space-y-3">
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={settings.quiet_hours_enabled}
            onChange={(e) => updateSetting('quiet_hours_enabled', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="text-sm font-medium text-gray-900">Enable quiet hours</span>
        </label>

        {settings.quiet_hours_enabled && (
          <div className="ml-7 grid grid-cols-2 gap-4 border-l-2 border-gray-200 pl-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={settings.quiet_hours_start || ''}
                onChange={(e) => updateSetting('quiet_hours_start', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={settings.quiet_hours_end || ''}
                onChange={(e) => updateSetting('quiet_hours_end', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Error Filtering */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900">Error Filtering</h4>
        
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={settings.ignore_ssl_warnings}
            onChange={(e) => updateSetting('ignore_ssl_warnings', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="text-sm text-gray-700">Ignore SSL warnings</span>
        </label>

        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={settings.ignore_minor_errors}
            onChange={(e) => updateSetting('ignore_minor_errors', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="text-sm text-gray-700">Ignore minor errors (4xx responses)</span>
        </label>
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
        <p className="text-sm text-gray-600 mt-1">
          Configure how and when you receive alerts about your websites
        </p>
      </div>

      {/* Error Display */}
      {errors.length > 0 && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Please fix the following errors:
              </h3>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="p-4 bg-green-50 border-b border-green-200">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <p className="ml-3 text-sm font-medium text-green-800">
              Notification settings saved successfully!
            </p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6">
          {[
            { id: 'email', label: 'Email', icon: Mail },
            { id: 'sms', label: 'SMS', icon: Phone },
            { id: 'integrations', label: 'Integrations', icon: Webhook },
            { id: 'advanced', label: 'Advanced', icon: Settings }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'email' && renderEmailSettings()}
        {activeTab === 'sms' && renderSMSSettings()}
        {activeTab === 'integrations' && renderIntegrationSettings()}
        {activeTab === 'advanced' && renderAdvancedSettings()}
      </div>

      {/* Save Button */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </Button>
      </div>
    </div>
  )
}