import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const verified = requestUrl.searchParams.get('verified')

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      return NextResponse.redirect(`${requestUrl.origin}/login?error=Invalid verification link`)
    }
    
    // If this is from email verification, sign out and redirect to login
    if (verified === 'true') {
      await supabase.auth.signOut()
      return NextResponse.redirect(`${requestUrl.origin}/login?message=Email verified successfully! Please sign in with your password.`)
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}${next}`)
}