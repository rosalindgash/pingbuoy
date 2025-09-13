import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Invalid email format').max(254),
  password: z.string().min(1, 'Password is required').max(1000)
})

export async function POST(request: NextRequest) {
  try {
    const rawData = await request.json()
    
    // Validate input data
    const validationResult = loginSchema.safeParse(rawData)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid input data',
        details: validationResult.error.errors 
      }, { status: 400 })
    }
    
    const { email, password } = validationResult.data
    
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data.user) {
      return NextResponse.json({ error: 'Login failed' }, { status: 400 })
    }

    // Successful login
    return NextResponse.json({ 
      success: true, 
      user: data.user,
      redirectTo: '/dashboard' 
    })
    
  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}