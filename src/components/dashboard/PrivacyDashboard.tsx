'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface User {
  id: string
  email?: string
}

interface Profile {
  id: string
  email: string
  full_name: string | null
  plan: 'free' | 'pro'
}

interface PrivacyDashboardProps {
  user: User
  profile: Profile
}

export default function PrivacyDashboard({ user, profile }: PrivacyDashboardProps) {
  const [loading, setLoading] = useState(false)
  
  // Export state
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json')
  const [isExporting, setIsExporting] = useState(false)
  
  // Deletion state
  const [deletionReason, setDeletionReason] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    document.title = 'Privacy & Data Management - PingBuoy'
  }, [])

  const handleExportData = async () => {
    try {
      setIsExporting(true)
      
      // Mock export - in a real app this would call an API
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Create mock data
      const data = {
        profile: {
          email: profile.email,
          full_name: profile.full_name,
          plan: profile.plan
        },
        export_date: new Date().toISOString()
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pingbuoy-data-export-${new Date().toISOString().split('T')[0]}.${exportFormat}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      alert('Data export completed successfully')
      
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export data')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirmEmail || confirmEmail !== profile.email) {
      alert('Please confirm your email address')
      return
    }

    if (!deletionReason.trim()) {
      alert('Please provide a reason for account deletion')
      return
    }

    try {
      setIsDeletingAccount(true)
      
      // Mock deletion request - in a real app this would call an API
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      alert('Deletion request submitted. Please check your email for confirmation.')
      setShowDeleteConfirm(false)
      setDeletionReason('')
      setConfirmEmail('')
      
    } catch (error) {
      console.error('Deletion request error:', error)
      alert('Failed to submit deletion request')
    } finally {
      setIsDeletingAccount(false)
    }
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Data Export */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Download className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-medium text-gray-900">Export Your Data</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Download a copy of your personal data in compliance with GDPR
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Available
              </span>
            </div>

            <div>
              <label htmlFor="export-format" className="block text-sm font-medium text-gray-700 mb-1">
                Export Format
              </label>
              <select
                id="export-format"
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="json">JSON (structured data)</option>
                <option value="csv">CSV (spreadsheet)</option>
              </select>
            </div>

            <Button
              onClick={handleExportData}
              disabled={isExporting}
              className="w-full"
            >
              {isExporting ? 'Exporting...' : 'Export Data'}
            </Button>
          </div>
        </div>

        {/* Account Deletion */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Trash2 className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-medium text-red-600">Delete Account</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Permanently delete your account and associated data
          </p>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="deletion-reason" className="block text-sm font-medium text-gray-700 mb-1">
                Reason for deletion *
              </label>
              <textarea
                id="deletion-reason"
                placeholder="Please tell us why you're deleting your account (required for our records)"
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                maxLength={500}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {deletionReason.length}/500 characters
              </p>
            </div>

            <div>
              <label htmlFor="confirm-email" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm your email *
              </label>
              <input
                id="confirm-email"
                type="email"
                placeholder={profile.email}
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-700">
                  <strong>Warning:</strong> Account deletion is permanent and cannot be undone. 
                  You will have 7 days to cancel after email confirmation.
                </div>
              </div>
            </div>

            <Button
              variant="destructive"
              className="w-full"
              disabled={!deletionReason.trim() || !confirmEmail || confirmEmail !== profile.email}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Request Account Deletion
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-red-600 mb-4">
              Confirm Account Deletion Request
            </h3>
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">This action will:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Send a confirmation email to {profile.email}</li>
                <li>Schedule your account for deletion in 7 days after confirmation</li>
                <li>Allow you to cancel within the 7-day grace period</li>
                <li>Delete all your personal data</li>
              </ul>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="flex-1"
              >
                {isDeletingAccount ? 'Processing...' : 'Yes, Request Deletion'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Data Retention Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Data Retention Policy</h2>
          <p className="text-sm text-gray-500">
            Information about how long we keep your data
          </p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="font-medium mb-2">Active Data</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Profile information: Until account deletion</li>
              <li>• Monitor configurations: Until deleted or account closure</li>
              <li>• Alert history: 2 years</li>
              <li>• Analytics data: 90 days</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Legal Basis</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Billing records: 7 years</li>
              <li>• Security logs: 1 year</li>
              <li>• Compliance data: As required by law</li>
              <li>• Anonymized analytics: Indefinitely</li>
            </ul>
          </div>
        </div>
        
        <hr className="my-4" />
        <p className="text-sm text-gray-600">
          For more information about our data practices, please review our{' '}
          <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>.
        </p>
      </div>
    </>
  )
}