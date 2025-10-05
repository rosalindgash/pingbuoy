'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  Download,
  Trash2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Loader2,
  Info
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface PrivacyRequest {
  hasPendingDeletion: boolean
  status?: 'pending' | 'confirmed'
  scheduledDeletionAt?: string
  canCancel?: boolean
  daysUntilDeletion?: number
  expiresAt?: string
  isExpired?: boolean
}

export default function PrivacyDataSection() {
  const router = useRouter()
  const [exportLoading, setExportLoading] = useState(false)
  const [deletionRequest, setDeletionRequest] = useState<PrivacyRequest | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(true)

  useEffect(() => {
    checkDeletionStatus()
  }, [])

  const checkDeletionStatus = async () => {
    try {
      setCheckingStatus(true)
      const response = await fetch('/api/privacy/delete')

      if (response.ok) {
        const data = await response.json()
        setDeletionRequest(data)
      }
    } catch (error) {
      console.error('Error checking deletion status:', error)
    } finally {
      setCheckingStatus(false)
    }
  }

  const handleExportData = async () => {
    try {
      setExportLoading(true)

      const response = await fetch('/api/privacy/export')

      if (!response.ok) {
        const error = await response.json()

        // Check for rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          toast.error(`Rate limit exceeded. Please try again in ${retryAfter} seconds.`)
          return
        }

        throw new Error(error.error || 'Export failed')
      }

      // Get the CSV data
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pingbuoy-data-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Data exported successfully!')
    } catch (error) {
      console.error('Export error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to export data')
    } finally {
      setExportLoading(false)
    }
  }

  const handleRequestDeletion = () => {
    // Redirect to the deletion confirmation page
    router.push('/privacy/delete-confirm')
  }

  const handleViewDeletionStatus = () => {
    if (deletionRequest?.status === 'confirmed') {
      router.push('/privacy/deletion-scheduled')
    } else {
      router.push('/privacy/delete-confirm')
    }
  }

  const renderDeletionStatus = () => {
    if (checkingStatus) {
      return (
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking deletion status...</span>
        </div>
      )
    }

    if (!deletionRequest?.hasPendingDeletion) {
      return (
        <div>
          <p className="text-sm text-gray-500 mb-3">
            Permanently delete your account and all associated data
          </p>
          <Button
            variant="destructive"
            onClick={handleRequestDeletion}
            className="flex items-center space-x-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>Request Account Deletion</span>
          </Button>
        </div>
      )
    }

    // Has pending deletion request
    if (deletionRequest.status === 'pending') {
      return (
        <Alert variant="default" className="mb-4">
          <Clock className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Deletion Request Pending</p>
                <p className="text-sm text-gray-600">
                  Check your email to confirm deletion request
                </p>
                {deletionRequest.expiresAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    Expires: {new Date(deletionRequest.expiresAt).toLocaleString()}
                  </p>
                )}
              </div>
              <Badge variant="secondary">Pending Confirmation</Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewDeletionStatus}
              className="mt-2"
            >
              View Request
            </Button>
          </AlertDescription>
        </Alert>
      )
    }

    if (deletionRequest.status === 'confirmed') {
      const isUrgent = (deletionRequest.daysUntilDeletion || 0) <= 2

      return (
        <Alert variant={isUrgent ? "destructive" : "default"} className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Account Deletion Scheduled</p>
                <p className="text-sm">
                  {deletionRequest.daysUntilDeletion} days remaining
                </p>
                {deletionRequest.scheduledDeletionAt && (
                  <p className="text-xs text-gray-600 mt-1">
                    Deletion date: {new Date(deletionRequest.scheduledDeletionAt).toLocaleString()}
                  </p>
                )}
              </div>
              <Badge variant={isUrgent ? "destructive" : "secondary"}>
                {isUrgent ? 'Urgent' : 'Scheduled'}
              </Badge>
            </div>
            <div className="flex space-x-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewDeletionStatus}
              >
                View Details
              </Button>
              {deletionRequest.canCancel && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleViewDeletionStatus}
                >
                  Cancel Deletion
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )
    }

    return null
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Shield className="w-5 h-5 text-gray-400" />
        <h2 className="text-lg font-medium text-gray-900">Privacy & Data</h2>
      </div>
      <div className="space-y-6">
        {/* Data Export Section */}
        <div>
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-sm font-medium text-gray-900">Export Your Data</h3>
                <Badge variant="outline" className="text-xs">GDPR Compliant</Badge>
              </div>
              <p className="text-sm text-gray-500">
                Download all your personal data in CSV format
              </p>
            </div>
          </div>

          <Alert variant="default" className="mb-3">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Rate limit:</strong> 2 exports per hour. The export includes your account info,
              sites, monitoring logs, and settings.
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleExportData}
            disabled={exportLoading}
            variant="outline"
            className="flex items-center space-x-2"
          >
            {exportLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Export Data</span>
              </>
            )}
          </Button>
        </div>

        <div className="border-t pt-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-sm font-medium text-gray-900">Delete Account</h3>
                <Badge variant="destructive" className="text-xs">Permanent</Badge>
              </div>
            </div>
          </div>

          {renderDeletionStatus()}
        </div>

        {/* Privacy Information */}
        <div className="border-t pt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2 text-sm text-blue-900">
                <p className="font-medium">Your Privacy Rights</p>
                <ul className="space-y-1 text-xs text-blue-800">
                  <li>• Export your data at any time (GDPR Article 20)</li>
                  <li>• Request account deletion with 7-day grace period</li>
                  <li>• All data is encrypted at rest and in transit</li>
                  <li>• We never sell your data to third parties</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
