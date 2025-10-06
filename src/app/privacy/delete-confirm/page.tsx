'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Shield, Trash2, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function DeleteConfirmationPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  
  const token = searchParams.get('token')
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [requestInfo, setRequestInfo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [finalConfirmation, setFinalConfirmation] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  useEffect(() => {
    if (status === 'loading') return

    if (!token) {
      setError('Invalid confirmation link - missing token')
      setLoading(false)
      return
    }

    if (!session) {
      // Redirect to login with return URL
      const returnUrl = encodeURIComponent(window.location.href)
      router.push(`/login?callbackUrl=${returnUrl}`)
      return
    }

    fetchRequestInfo()
  }, [token, session, status])

  const fetchRequestInfo = async () => {
    try {
      setLoading(true)
      
      // Get deletion request status to validate token and show info
      const response = await fetch('/api/privacy/delete')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch request information')
      }

      if (!data.hasPendingDeletion || data.status !== 'pending') {
        setError('No pending deletion request found or request has expired')
        return
      }

      setRequestInfo(data)
    } catch (err) {
      console.error('Failed to fetch request info:', err)
      setError(err instanceof Error ? err.message : 'Failed to load request information')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDeletion = async () => {
    if (!finalConfirmation) {
      toast.error('Please confirm that you understand this action is permanent')
      return
    }

    try {
      setConfirming(true)
      
      const response = await fetch('/api/privacy/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          finalConfirmation: true
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Confirmation failed')
      }

      toast.success('Account deletion confirmed successfully')
      
      // Redirect to confirmation page
      router.push('/privacy/deletion-scheduled')
      
    } catch (err) {
      console.error('Confirmation error:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to confirm deletion')
    } finally {
      setConfirming(false)
      setShowConfirmDialog(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading confirmation details...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <XCircle className="h-6 w-6 text-red-500" />
              <CardTitle className="text-red-600">Confirmation Error</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Button
                onClick={() => router.push('/dashboard/settings')}
                className="w-full"
              >
                Go to Settings
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
                className="w-full"
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-orange-500" />
            <CardTitle className="text-orange-600">Confirm Account Deletion</CardTitle>
          </div>
          <CardDescription>
            Please review the details below and confirm your account deletion request
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Account Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Account Information</h3>
            <p className="text-sm text-blue-800">
              <strong>Email:</strong> {session?.user?.email}
            </p>
          </div>

          {/* Warning Alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p className="font-medium">This action is permanent and cannot be undone.</p>
              <p>By confirming, you agree to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Permanently delete your PingBuoy account</li>
                <li>Remove all your personal data and monitoring configurations</li>
                <li>Cancel any active subscriptions</li>
                <li>Lose access to all historical data and reports</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Grace Period Information */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-green-900 mb-1">7-Day Grace Period</h3>
                <p className="text-sm text-green-800">
                  After confirmation, you will have 7 days to change your mind and cancel the deletion. 
                  You will receive an email with cancellation instructions.
                </p>
              </div>
            </div>
          </div>

          {/* Final Confirmation */}
          <div className="space-y-4">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="final-confirmation"
                checked={finalConfirmation}
                onCheckedChange={(checked) => setFinalConfirmation(checked === true)}
              />
              <Label htmlFor="final-confirmation" className="text-sm leading-relaxed">
                I understand that this action is permanent and will result in the deletion of my account 
                and all associated data after the 7-day grace period. I confirm that I want to proceed 
                with account deletion.
              </Label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/settings')}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowConfirmDialog(true)}
              disabled={!finalConfirmation || confirming}
              className="flex-1 flex items-center space-x-2"
            >
              {confirming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Confirming...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Confirm Deletion</span>
                </>
              )}
            </Button>
          </div>

          {/* Confirmation Dialog */}
          <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span>Final Confirmation Required</span>
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>This is your last chance to reconsider.</p>
                  
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-red-800 font-medium text-sm">
                      After clicking "Confirm", your account will be scheduled for permanent deletion in 7 days.
                    </p>
                  </div>

                  <p>Are you absolutely sure you want to continue?</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>No, Keep My Account</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmDeletion}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={confirming}
                >
                  {confirming ? 'Processing...' : 'Yes, Delete My Account'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}