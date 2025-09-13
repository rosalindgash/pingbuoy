'use client'

import { useState } from 'react'
import { Copy, ExternalLink, Eye } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface StatusPageSettingsProps {
  userEmail: string
}

export default function StatusPageSettings({ userEmail }: StatusPageSettingsProps) {
  const [copied, setCopied] = useState(false)
  
  // Create a simple username from email (first part before @)
  const username = userEmail.split('@')[0]
  const statusPageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/status/${username}`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(statusPageUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
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
        <Eye className="w-5 h-5 text-gray-400" />
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status Page URL
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={statusPageUrl}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-700"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="flex items-center space-x-1"
            >
              <Copy className="w-4 h-4" />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </Button>
            <a
              href={statusPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Status Page Features
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Real-time service status</li>
            <li>• 90-day uptime statistics</li>
            <li>• Responsive design</li>
            <li>• Automatic updates</li>
            <li>• No login required for visitors</li>
          </ul>
        </div>

        <div className="text-xs text-gray-500">
          <p>
            Your status page is automatically updated every time we check your websites. 
            All your monitored sites will be displayed publicly.
          </p>
        </div>
      </div>
    </div>
  )
}