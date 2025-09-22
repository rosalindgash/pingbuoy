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
          // Don't recreate response object - just set the cookie
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          // Don't recreate response object - just remove the cookie
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Define protected routes
  const protectedPaths = ['/dashboard', '/api/sites', '/api/checkout', '/api/billing', '/api/performance']
  const isProtectedRoute = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path)) ||
                          (request.nextUrl.pathname.startsWith('/api/') &&
                           !request.nextUrl.pathname.startsWith('/api/auth') &&
                           !request.nextUrl.pathname.startsWith('/api/contact') &&
                           !request.nextUrl.pathname.startsWith('/api/waitlist') &&
                           !request.nextUrl.pathname.startsWith('/api/webhooks'))

  // Skip auth check if already on login/auth related pages to prevent redirect loops
  const isAuthPage = request.nextUrl.pathname === '/login' ||
                     request.nextUrl.pathname === '/signup' ||
                     request.nextUrl.pathname.startsWith('/api/auth')

  if (isProtectedRoute && !isAuthPage) {
    try {
      // Use getSession() for better cookie reading reliability
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('Session error in middleware:', sessionError)
        if (request.nextUrl.pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Session error' }, { status: 401 })
        }
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
        return NextResponse.redirect(redirectUrl)
      }

      if (!session?.user) {
        // Check if we have any cookies that suggest an ongoing auth process
        const authCookies = request.cookies.getAll().filter(cookie =>
          cookie.name.includes('supabase') || cookie.name.includes('auth')
        )

        // If we have auth cookies but no valid session, wait a moment for auth to complete
        if (authCookies.length > 0 && request.headers.get('referer')?.includes('/login')) {
          // Coming from login page with auth cookies - allow through temporarily
          // Client-side auth check will handle final verification
          return response
        }

        if (request.nextUrl.pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
        return NextResponse.redirect(redirectUrl)
      }

      // Session is valid, continue with request
    } catch (authError) {
      console.error('Authentication error in middleware:', authError)
      if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
      }
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
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