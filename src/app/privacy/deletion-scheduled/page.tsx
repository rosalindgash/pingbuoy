'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Calendar, Mail, Shield, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

interface DeletionInfo {
  scheduledDeletionAt: string
  gracePeriodDays: number
  cancelUrl: string
  daysUntilDeletion: number
}

export default function DeletionScheduledPage() {
  const router = useRouter()
  const sessionResult = useSession()
  const session = sessionResult?.data
  const status = sessionResult?.status || 'loading'
  const [deletionInfo, setDeletionInfo] = useState<DeletionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeUntilDeletion, setTimeUntilDeletion] = useState<string>('')

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
      return
    }

    fetchDeletionInfo()
  }, [session, status])

  useEffect(() => {
    if (deletionInfo) {
      const updateCountdown = () => {
        const now = new Date().getTime()
        const deletionTime = new Date(deletionInfo.scheduledDeletionAt).getTime()
        const timeDiff = deletionTime - now

        if (timeDiff > 0) {
          const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
          const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
          const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))

          if (days > 0) {
            setTimeUntilDeletion(`${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours > 1 ? 's' : ''}`)
          } else if (hours > 0) {
            setTimeUntilDeletion(`${hours} hour${hours > 1 ? 's' : ''}, ${minutes} minute${minutes > 1 ? 's' : ''}`)
          } else {
            setTimeUntilDeletion(`${minutes} minute${minutes > 1 ? 's' : ''}`)
          }
        } else {
          setTimeUntilDeletion('Deletion in progress')
        }
      }

      updateCountdown()
      const interval = setInterval(updateCountdown, 60000) // Update every minute

      return () => clearInterval(interval)
    }
  }, [deletionInfo])

  const fetchDeletionInfo = async () => {
    try {
      const response = await fetch('/api/privacy/delete')
      const data = await response.json()

      if (response.ok && data.hasPendingDeletion && data.status === 'confirmed') {
        setDeletionInfo({
          scheduledDeletionAt: data.scheduledDeletionAt,
          gracePeriodDays: 7, // Default from the system
          cancelUrl: `/privacy/cancel-deletion?token=`, // Token would be in email
          daysUntilDeletion: data.daysUntilDeletion
        })
      } else {
        // If no pending deletion, redirect to privacy page
        router.push('/dashboard/privacy')
      }
    } catch (error) {
      console.error('Failed to fetch deletion info:', error)
      router.push('/dashboard/privacy')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded mx-auto w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded mx-auto w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!deletionInfo) {
    return null // Will redirect to privacy page
  }

  const deletionDate = new Date(deletionInfo.scheduledDeletionAt)
  const isUrgent = deletionInfo.daysUntilDeletion <= 2

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Clock className={`h-6 w-6 ${isUrgent ? 'text-red-500' : 'text-orange-500'}`} />
            <CardTitle className={isUrgent ? 'text-red-600' : 'text-orange-600'}>
              Account Deletion Scheduled
            </CardTitle>
          </div>
          <CardDescription>
            Your account deletion has been confirmed and scheduled
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Badge */}
          <div className="flex justify-center">
            <Badge 
              variant={isUrgent ? "destructive" : "secondary"}
              className="text-sm px-3 py-1 flex items-center space-x-1"
            >
              <AlertTriangle className="h-3 w-3" />
              <span>
                {isUrgent ? 'Urgent: ' : ''}Deletion in {timeUntilDeletion}
              </span>
            </Badge>
          </div>

          {/* Deletion Details */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <h3 className="font-medium text-blue-900">Scheduled Deletion</h3>
              </div>
              <p className="text-sm text-blue-800">
                <strong>Date:</strong> {deletionDate.toLocaleDateString()}
              </p>
              <p className="text-sm text-blue-800">
                <strong>Time:</strong> {deletionDate.toLocaleTimeString()}
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="h-4 w-4 text-green-600" />
                <h3 className="font-medium text-green-900">Grace Period</h3>
              </div>
              <p className="text-sm text-green-800">
                <strong>Days Remaining:</strong> {deletionInfo.daysUntilDeletion}
              </p>
              <p className="text-sm text-green-800">
                You can still cancel this deletion
              </p>
            </div>
          </div>

          {/* Important Information */}
          <Alert variant={isUrgent ? "destructive" : "default"}>
            <Mail className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p className="font-medium">
                {isUrgent ? 'Final Warning:' : 'Important:'} Check your email for cancellation instructions.
              </p>
              <p>
                We've sent a cancellation link to <strong>{session?.user?.email}</strong>. 
                You can use this link to cancel your account deletion at any time before the scheduled date.
              </p>
            </AlertDescription>
          </Alert>

          <Separator />

          {/* What Happens Next */}
          <div>
            <h3 className="font-medium mb-3">What happens next:</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Confirmation Email Sent</p>
                  <p className="text-sm text-muted-foreground">
                    Check your inbox for the cancellation link
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Grace Period Active</p>
                  <p className="text-sm text-muted-foreground">
                    You have {deletionInfo.daysUntilDeletion} days to cancel the deletion
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Automatic Deletion</p>
                  <p className="text-sm text-muted-foreground">
                    On {deletionDate.toLocaleDateString()}, your account and all data will be permanently deleted
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Data That Will Be Deleted */}
          <div>
            <h3 className="font-medium mb-3">Data that will be permanently deleted:</h3>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <span>•</span>
                <span>Account profile and settings</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>•</span>
                <span>Website monitoring configurations</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>•</span>
                <span>Alert history and notifications</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>•</span>
                <span>Integration settings</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>•</span>
                <span>Usage analytics and reports</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>•</span>
                <span>Subscription and billing information</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="flex-1"
            >
              Continue Using Account
            </Button>
            <Button
              variant="secondary"
              onClick={handleSignOut}
              className="flex-1"
            >
              Sign Out
            </Button>
          </div>

          {/* Footer Note */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Questions? Contact our support team at{' '}
              <Link href="/contact" className="text-blue-600 hover:underline">
                support@pingbuoy.com
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}