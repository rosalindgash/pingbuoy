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

    // Prepare update object (only include fields that are provided)
    const updateData: { full_name?: string; email?: string } = {}
    if (full_name !== undefined) updateData.full_name = full_name
    if (email !== undefined) updateData.email = email

    // Update user profile in database if there are fields to update
    if (Object.keys(updateData).length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('users')
        .update(updateData)
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating user profile:', updateError)
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
      }
    }

    // If email is being updated, also update in Supabase Auth
    if (email && email !== user.email) {
      const { error: authUpdateError } = await supabase.auth.updateUser({
        email: email
      })

      if (authUpdateError) {
        console.error('Error updating auth email:', authUpdateError)
        return NextResponse.json({
          error: 'Profile updated but email change requires verification. Please check your email.'
        }, { status: 200 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Profile update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}