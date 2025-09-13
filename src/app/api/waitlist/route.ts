import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { email, plan } = await request.json()
    
    if (!email || !plan) {
      return NextResponse.json(
        { error: 'Email and plan are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    
    // Insert into waitlist (will handle duplicates via unique constraint)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('waitlist')
      .insert({
        email: email.toLowerCase().trim(),
        plan
      })

    if (error) {
      if (error.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: 'Email already on waitlist' },
          { status: 409 }
        )
      }
      throw error
    }

    // TODO: Send confirmation email
    console.log(`New waitlist signup: ${email} for ${plan} plan`)
    
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error adding to waitlist:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}