'use client'

import { useState, useEffect } from 'react'
import { Copy, ExternalLink, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

interface StatusPageSettingsProps {
  userEmail: string
}

interface UserStatusPage {
  status_page_slug: string | null
  status_page_enabled: boolean
}

export default function StatusPageSettings({ userEmail }: StatusPageSettingsProps) {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusPage, setStatusPage] = useState<UserStatusPage | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchStatusPageData()
  }, [])

  const fetchStatusPageData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('users')
        .select('status_page_slug, status_page_enabled')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching status page data:', error)
        setMessage('Error loading status page settings')
        return
      }

      setStatusPage(data)
    } catch (error) {
      console.error('Error in fetchStatusPageData:', error)
      setMessage('Error loading status page settings')
    } finally {
      setLoading(false)
    }
  }

  const toggleStatusPageEnabled = async () => {
    if (!statusPage) return

    setSaving(true)
    setMessage('')

    try {
      // Security: verify authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setMessage('Authentication required. Please log in again.')
        return
      }

      // Security: validate current state
      if (typeof statusPage.status_page_enabled !== 'boolean') {
        setMessage('Invalid status page state')
        return
      }

      const newState = !statusPage.status_page_enabled

      // Security: use RLS-protected update with explicit user check
      const { error } = await supabase
        .from('users')
        .update({
          status_page_enabled: newState,
          updated_at: new Date().toISOString() // Security: update timestamp
        })
        .eq('id', user.id)
        .eq('email', user.email) // Security: double-check ownership

      if (error) {
        // Security: don't expose database errors
        if (process.env.NODE_ENV === 'development') {
          console.error('Database error:', error)
        }
        setMessage('Error updating status page settings. Please try again.')
        return
      }

      // Update local state only after successful database update
      setStatusPage(prev => prev ? {
        ...prev,
        status_page_enabled: newState
      } : null)

      setMessage(
        newState
          ? 'Status page enabled successfully'
          : 'Status page disabled successfully'
      )

      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000)

    } catch (error) {
      // Security: don't expose internal errors
      if (process.env.NODE_ENV === 'development') {
        console.error('Error toggling status page:', error)
      }
      setMessage('An unexpected error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!statusPage?.status_page_slug) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-4">
          <p className="text-gray-600">Status page is being set up...</p>
          <p className="text-sm text-gray-500 mt-2">
            Please refresh the page or contact support if this persists.
          </p>
        </div>
      </div>
    )
  }

  const statusPageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/status/${statusPage.status_page_slug}`

  const copyToClipboard = async () => {
    try {
      // Security: validate URL before copying
      if (!statusPageUrl || !statusPage?.status_page_enabled) {
        setMessage('Status page must be enabled to copy URL')
        return
      }

      await navigator.clipboard.writeText(statusPageUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Security: don't expose system errors
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to copy:', err)
      }
      setMessage('Failed to copy URL. Please try again.')
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Public Status Page</h3>
          <p className="text-sm text-gray-600">
            Share your website status with customers and users
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {statusPage.status_page_enabled ? (
            <Eye className="w-5 h-5 text-green-500" />
          ) : (
            <EyeOff className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {message && (
        <div className={`p-3 border rounded-lg text-sm mb-4 ${
          message.includes('Error')
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          {message}
        </div>
      )}

      <div className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {statusPage.status_page_enabled ? 'Status Page Enabled' : 'Status Page Disabled'}
            </p>
            <p className="text-sm text-gray-500">
              {statusPage.status_page_enabled
                ? 'Your status page is publicly accessible'
                : 'Your status page is hidden from public view'
              }
            </p>
          </div>
          <Button
            onClick={toggleStatusPageEnabled}
            disabled={saving}
            variant={statusPage.status_page_enabled ? 'outline' : 'default'}
            className={statusPage.status_page_enabled ? 'text-red-600 border-red-300 hover:bg-red-50' : ''}
          >
            {saving ? 'Saving...' : statusPage.status_page_enabled ? 'Disable' : 'Enable'}
          </Button>
        </div>

        {/* URL Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status Page URL
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={statusPageUrl}
              readOnly
              className={`flex-1 px-3 py-2 border rounded-md text-sm ${
                statusPage.status_page_enabled
                  ? 'border-gray-300 bg-gray-50 text-gray-700'
                  : 'border-gray-200 bg-gray-100 text-gray-500'
              }`}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              disabled={!statusPage.status_page_enabled}
              className="flex items-center space-x-1"
            >
              <Copy className="w-4 h-4" />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </Button>
            {statusPage.status_page_enabled && (
              <a
                href={statusPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Status Page Features
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Real-time service status</li>
            <li>• 30-day uptime statistics</li>
            <li>• Response time monitoring</li>
            <li>• Responsive design</li>
            <li>• Automatic updates</li>
            <li>• No login required for visitors</li>
          </ul>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h4 className="text-sm font-medium text-yellow-900 mb-2">
            🔒 Privacy & Security
          </h4>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• Only domain names are shown (no full URLs with paths)</li>
            <li>• You can hide specific sites from your status page</li>
            <li>• Status page URLs are randomly generated for privacy</li>
            <li>• You control when your status page is publicly accessible</li>
            <li>• No sensitive information is ever exposed</li>
          </ul>
        </div>

        <div className="text-xs text-gray-500">
          <p>
            <strong>Privacy Notice:</strong> When enabled, your status page will be publicly accessible and may be indexed by search engines.
            Only sites you choose to include will be visible, showing domain names and uptime statistics only.
          </p>
        </div>
      </div>
    </div>
  )
}