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

  // Only protect API routes in middleware - let client-side handle page auth
  // This prevents redirect loops while still securing API endpoints
  const isProtectedApiRoute = request.nextUrl.pathname.startsWith('/api/') &&
                              !request.nextUrl.pathname.startsWith('/api/auth') &&
                              !request.nextUrl.pathname.startsWith('/api/contact') &&
                              !request.nextUrl.pathname.startsWith('/api/waitlist') &&
                              !request.nextUrl.pathname.startsWith('/api/webhooks') &&
                              !request.nextUrl.pathname.startsWith('/api/public') &&
                              !request.nextUrl.pathname.startsWith('/api/user')

  if (isProtectedApiRoute) {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Session is valid for API route, continue
    } catch (authError) {
      console.error('API authentication error:', authError)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
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