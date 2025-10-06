import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/user/is-admin
 *
 * Check if the authenticated user is an admin (founder).
 *
 * Security: Uses server-side FOUNDER_EMAIL check only.
 * No sensitive data exposed to client.
 *
 * @returns { isAdmin: boolean }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with plan and email
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('email, plan')
      .eq('id', user.id)
      .single() as { data: { email: string, plan: string } | null, error: any }

    if (profileError || !userProfile) {
      return NextResponse.json({ isAdmin: false })
    }

    // Check if user is founder (admin) - SERVER-SIDE ONLY
    const FOUNDER_EMAIL = process.env.FOUNDER_EMAIL

    const isAdmin = userProfile.plan === 'founder' &&
                    FOUNDER_EMAIL &&
                    userProfile.email === FOUNDER_EMAIL

    return NextResponse.json({ isAdmin })
  } catch (error) {
    console.error('Error checking admin status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
