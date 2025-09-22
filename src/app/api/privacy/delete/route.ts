import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { headers } from 'next/headers'
import { randomBytes } from 'crypto'
import { sendEmail } from '@/lib/email'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'

const deleteRequestSchema = z.object({
  reason: z.string().min(1).max(500),
  confirmEmail: z.string().min(1, 'Email is required').refine((email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }, 'Invalid email address'),
  deleteData: z.boolean().default(true),
  retainLegalBasis: z.boolean().default(false) // For compliance/legal requirements
})

const confirmDeleteSchema = z.object({
  token: z.string().min(32),
  finalConfirmation: z.boolean()
})

type DeleteRequestData = z.infer<typeof deleteRequestSchema>
type ConfirmDeleteData = z.infer<typeof confirmDeleteSchema>

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const headersList = headers()
    const forwarded = headersList.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : headersList.get('x-real-ip') || 'unknown'
    
    const supabase = createClient()
    const body = await req.json()
    
    // Check if this is a confirmation request
    if ('token' in body) {
      return handleDeleteConfirmation(body, supabase, session.user.email, ip, req.headers.get('user-agent') || 'unknown')
    }

    // Otherwise, it's an initial deletion request
    const { reason, confirmEmail, deleteData, retainLegalBasis } = deleteRequestSchema.parse(body)

    // Verify email matches session
    if (confirmEmail !== session.user.email) {
      return NextResponse.json(
        { error: 'Email confirmation does not match account email' },
        { status: 400 }
      )
    }

    // Check for existing pending deletion request
    const { data: existingRequest } = await supabase
      .from('privacy_requests')
      .select('id, status, created_at')
      .eq('user_email', session.user.email)
      .eq('request_type', 'deletion')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending deletion request' },
        { status: 409 }
      )
    }

    // Generate confirmation token
    const confirmationToken = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Create deletion request
    const { data: deleteRequest, error: insertError } = await supabase
      .from('privacy_requests')
      .insert({
        user_email: session.user.email,
        request_type: 'deletion',
        status: 'pending',
        request_data: {
          reason,
          deleteData,
          retainLegalBasis,
          confirmationToken,
          expiresAt: expiresAt.toISOString()
        },
        ip_address: ip,
        user_agent: req.headers.get('user-agent') || 'unknown'
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    // Send confirmation email
    try {
      await sendEmail({
        to: session.user.email,
        subject: '🚨 Confirm Account Deletion - PingBuoy',
        template: 'account-deletion-confirmation',
        data: {
          userName: session.user.name || session.user.email,
          confirmationUrl: `${process.env.NEXTAUTH_URL}/privacy/delete-confirm?token=${confirmationToken}`,
          expiresAt: expiresAt.toLocaleString(),
          reason: reason,
          deleteData: deleteData,
          retainLegalBasis: retainLegalBasis
        }
      })
    } catch (emailError) {
      console.error('Failed to send deletion confirmation email:', emailError)
      // Don't fail the request if email fails - user can still access via dashboard
    }

    return NextResponse.json({
      message: 'Deletion request submitted successfully',
      requestId: deleteRequest.id,
      confirmationRequired: true,
      expiresAt: expiresAt.toISOString(),
      steps: [
        'Check your email for a confirmation link',
        'Click the confirmation link within 24 hours',
        'Your account and data will be scheduled for deletion',
        'You have 7 days to cancel the deletion if needed'
      ]
    })

  } catch (error) {
    console.error('Account deletion request error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process deletion request' },
      { status: 500 }
    )
  }
}

async function handleDeleteConfirmation(
  body: unknown,
  supabase: SupabaseClient<Database>,
  userEmail: string,
  ip: string,
  userAgent: string
): Promise<NextResponse> {
  const { token, finalConfirmation } = confirmDeleteSchema.parse(body)

  if (!finalConfirmation) {
    return NextResponse.json(
      { error: 'Final confirmation required' },
      { status: 400 }
    )
  }

  // Find and validate deletion request
  const { data: deleteRequest } = await supabase
    .from('privacy_requests')
    .select('*')
    .eq('user_email', userEmail)
    .eq('request_type', 'deletion')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!deleteRequest) {
    return NextResponse.json(
      { error: 'No pending deletion request found' },
      { status: 404 }
    )
  }

  const requestData = deleteRequest.request_data
  if (requestData.confirmationToken !== token) {
    return NextResponse.json(
      { error: 'Invalid confirmation token' },
      { status: 401 }
    )
  }

  if (new Date(requestData.expiresAt) < new Date()) {
    return NextResponse.json(
      { error: 'Confirmation token has expired' },
      { status: 410 }
    )
  }

  // Schedule account deletion (7 days grace period)
  const deletionDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  // Update deletion request
  const { error: updateError } = await supabase
    .from('privacy_requests')
    .update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      scheduled_deletion_at: deletionDate.toISOString(),
      request_data: {
        ...requestData,
        confirmationIp: ip,
        confirmationUserAgent: userAgent,
        gracePeriodEnd: deletionDate.toISOString()
      }
    })
    .eq('id', deleteRequest.id)

  if (updateError) {
    throw updateError
  }

  // Mark user account for deletion
  const { error: userUpdateError } = await supabase
    .from('users')
    .update({
      deletion_scheduled_at: deletionDate.toISOString(),
      account_status: 'deletion_pending',
      updated_at: new Date().toISOString()
    })
    .eq('email', userEmail)

  if (userUpdateError) {
    throw userUpdateError
  }

  // Send confirmation email
  try {
    await sendEmail({
      to: userEmail,
      subject: '✅ Account Deletion Confirmed - PingBuoy',
      template: 'account-deletion-scheduled',
      data: {
        userName: userEmail,
        deletionDate: deletionDate.toLocaleString(),
        cancelUrl: `${process.env.NEXTAUTH_URL}/privacy/cancel-deletion?token=${token}`,
        gracePeriodDays: 7
      }
    })
  } catch (emailError) {
    console.error('Failed to send deletion scheduled email:', emailError)
  }

  return NextResponse.json({
    message: 'Account deletion confirmed and scheduled',
    scheduledDeletionAt: deletionDate.toISOString(),
    gracePeriodDays: 7,
    cancelUrl: `/privacy/cancel-deletion?token=${token}`,
    warning: 'This action cannot be undone after the grace period expires'
  })
}

// GET endpoint to check deletion status
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabase = createClient()
    
    // Check for active deletion requests
    const { data: deletionRequest } = await supabase
      .from('privacy_requests')
      .select('*')
      .eq('user_email', session.user.email)
      .eq('request_type', 'deletion')
      .in('status', ['pending', 'confirmed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!deletionRequest) {
      return NextResponse.json({
        hasPendingDeletion: false,
        canRequestDeletion: true
      })
    }

    const requestData = deletionRequest.request_data || {}
    const now = new Date()

    if (deletionRequest.status === 'pending') {
      const expiresAt = new Date(requestData.expiresAt)
      const isExpired = now > expiresAt

      return NextResponse.json({
        hasPendingDeletion: true,
        status: 'pending',
        isExpired,
        expiresAt: requestData.expiresAt,
        canRequestDeletion: isExpired
      })
    }

    if (deletionRequest.status === 'confirmed') {
      const scheduledAt = new Date(deletionRequest.scheduled_deletion_at)
      const canCancel = now < scheduledAt

      return NextResponse.json({
        hasPendingDeletion: true,
        status: 'confirmed',
        scheduledDeletionAt: deletionRequest.scheduled_deletion_at,
        canCancel,
        gracePeriodEnds: scheduledAt.toISOString(),
        daysUntilDeletion: Math.ceil((scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      })
    }

    return NextResponse.json({
      hasPendingDeletion: false,
      canRequestDeletion: true
    })

  } catch (error) {
    console.error('Deletion status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check deletion status' },
      { status: 500 }
    )
  }
}

// DELETE endpoint to cancel deletion request
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Cancellation token required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Find and validate deletion request
    const { data: deleteRequest } = await supabase
      .from('privacy_requests')
      .select('*')
      .eq('user_email', session.user.email)
      .eq('request_type', 'deletion')
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!deleteRequest) {
      return NextResponse.json(
        { error: 'No confirmed deletion request found' },
        { status: 404 }
      )
    }

    const requestData = deleteRequest.request_data
    if (requestData.confirmationToken !== token) {
      return NextResponse.json(
        { error: 'Invalid cancellation token' },
        { status: 401 }
      )
    }

    // Check if still within grace period
    const scheduledDeletion = new Date(deleteRequest.scheduled_deletion_at)
    if (new Date() >= scheduledDeletion) {
      return NextResponse.json(
        { error: 'Grace period has expired, cannot cancel deletion' },
        { status: 410 }
      )
    }

    // Cancel the deletion
    const { error: updateError } = await supabase
      .from('privacy_requests')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', deleteRequest.id)

    if (updateError) {
      throw updateError
    }

    // Restore user account status
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        deletion_scheduled_at: null,
        account_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('email', session.user.email)

    if (userUpdateError) {
      throw userUpdateError
    }

    // Send cancellation confirmation email
    try {
      await sendEmail({
        to: session.user.email,
        subject: '🛡️ Account Deletion Cancelled - PingBuoy',
        template: 'account-deletion-cancelled',
        data: {
          userName: session.user.name || session.user.email,
          cancelledAt: new Date().toLocaleString()
        }
      })
    } catch (emailError) {
      console.error('Failed to send cancellation email:', emailError)
    }

    return NextResponse.json({
      message: 'Account deletion successfully cancelled',
      status: 'cancelled',
      cancelledAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Deletion cancellation error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel deletion request' },
      { status: 500 }
    )
  }
}