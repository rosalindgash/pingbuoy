import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  checkDualLimit,
  getClientIP,
  createRateLimitResponse,
  getRateLimitHeaders,
  RATE_LIMIT_CONFIGS
} from '@/lib/redis-rate-limit'

const loginSchema = z.object({
  email: z.string().email('Invalid email format').max(254),
  password: z.string().min(1, 'Password is required').max(1000)
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request)

    // Check rate limits before processing request
    const rateLimitResult = await checkDualLimit(
      ip,
      null, // We don't have user ID yet for login
      RATE_LIMIT_CONFIGS.auth.login.ip,
      RATE_LIMIT_CONFIGS.auth.login.user,
      'auth_login'
    )

    if (!rateLimitResult.success) {
      return createRateLimitResponse(
        rateLimitResult.ip.success ? rateLimitResult.user! : rateLimitResult.ip,
        'Too many login attempts. Please try again later.'
      )
    }

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

    // Successful login - add rate limit headers
    return NextResponse.json({
      success: true,
      user: data.user,
      redirectTo: '/dashboard'
    }, {
      headers: getRateLimitHeaders(rateLimitResult.ip)
    })
    
  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}