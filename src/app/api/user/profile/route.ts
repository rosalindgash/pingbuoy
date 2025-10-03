import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { userProfileUpdateSchema, validateAndSanitize } from '@/lib/validation'
import { validateCSRF } from '@/lib/csrf-protection'
import { randomBytes } from 'crypto'

export async function PUT(request: NextRequest) {
  const requestId = randomBytes(8).toString('hex')

  // CSRF Protection: Validate Origin/Referer for user profile update
  const csrfValidation = validateCSRF(request)
  if (!csrfValidation.isValid) {
    console.warn(`[${requestId}] CSRF protection blocked profile update`, {
      reason: csrfValidation.reason,
      origin: csrfValidation.origin,
      referer: csrfValidation.referer
    })
    return NextResponse.json(
      { error: 'Request blocked by security policy' },
      { status: 403 }
    )
  }

  try {
    const rawData = await request.json()

    // Validate and sanitize input
    const { full_name, email } = validateAndSanitize(userProfileUpdateSchema, rawData)

    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isEmailChange = email && email !== user.email

    // Update full name in database if provided
    if (full_name !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('users')
        .update({ full_name })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating user profile:', updateError)
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
      }
    }

    // If email is being updated, trigger confirmation flow
    if (isEmailChange) {
      const { error: authUpdateError } = await supabase.auth.updateUser({
        email: email
      })

      if (authUpdateError) {
        console.error('Error updating auth email:', authUpdateError)
        return NextResponse.json({ error: 'Failed to update email' }, { status: 500 })
      }

      // Return special response for email change requiring confirmation and logout
      return NextResponse.json({
        success: true,
        emailChangeRequested: true,
        message: 'Confirmation email sent! Please check your new email address and click the confirmation link. You will be logged out now.'
      })
    }

    return NextResponse.json({ success: true, message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Profile update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}