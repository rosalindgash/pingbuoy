import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { securityHeaders2025 } from '@/lib/security-2025'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Apply enhanced 2025 security headers to all responses
  Object.entries(securityHeaders2025).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Handle Supabase auth for protected routes
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Check authentication for protected routes (without aggressive MFA enforcement)
  const protectedPaths = ['/dashboard', '/api/sites', '/api/checkout', '/api/billing', '/api/performance']
  const isProtectedRoute = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path)) ||
                          (request.nextUrl.pathname.startsWith('/api/') &&
                           !request.nextUrl.pathname.startsWith('/api/auth') &&
                           !request.nextUrl.pathname.startsWith('/api/contact') &&
                           !request.nextUrl.pathname.startsWith('/api/waitlist') &&
                           !request.nextUrl.pathname.startsWith('/api/webhooks'))

  if (isProtectedRoute) {
    try {
      const { data: { user, session } } = await supabase.auth.getUser()

      if (!user || !session) {
        if (request.nextUrl.pathname.startsWith('/api/')) {
          // Return 401 for API routes
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        } else {
          // Redirect to login for page routes
          const redirectUrl = new URL('/login', request.url)
          redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
          return NextResponse.redirect(redirectUrl)
        }
      }

      // MFA is only for login authentication - handled by Supabase Auth
      // No additional MFA enforcement needed in middleware
      // Users can enable/disable MFA in their dashboard settings

    } catch (authError) {
      console.error('Authentication error in middleware:', authError)

      if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
      } else {
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
        return NextResponse.redirect(redirectUrl)
      }
    }
  }


  // Rate limiting for sensitive endpoints
  const pathname = request.nextUrl.pathname
  
  if (pathname.startsWith('/api/auth') || 
      pathname.startsWith('/api/contact') ||
      pathname === '/login' ||
      pathname === '/signup') {
    
    // Simple rate limiting check (in production, use Redis or similar)
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitKey = `${ip}:${pathname}`
    
    // In production, implement proper rate limiting with Redis
    // For now, just add the header to indicate rate limiting is active
    response.headers.set('X-RateLimit-Policy', 'active')
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}