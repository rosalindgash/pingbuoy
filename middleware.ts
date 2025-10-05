import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { securityHeaders2025 } from '@/lib/security-2025'

/**
 * ROUTE SECURITY CONFIGURATION
 * =============================
 * Using an allowlist approach for clarity and safety.
 *
 * PRINCIPLES:
 * 1. All API routes require auth EXCEPT those explicitly listed as public
 * 2. Public routes are clearly documented with reason
 * 3. Adding new routes defaults to secure (requires auth)
 */

// PUBLIC API ROUTES - These DO NOT require authentication
const PUBLIC_API_ROUTES = [
  // Authentication endpoints (obviously must be public)
  '/api/auth',

  // Contact form (public-facing feature)
  '/api/contact',

  // Waitlist signup (marketing feature)
  '/api/waitlist',

  // Stripe webhooks (uses signature verification instead)
  '/api/webhooks/stripe',
  '/api/webhooks/stripe-analytics',

  // Public status pages (shareable uptime status)
  '/api/public/status',
  '/api/status',

  // Health checks (monitoring endpoints)
  '/api/health/redis',
  '/api/health/log-security',

  // User info endpoint (requires session but has own auth check)
  '/api/user/is-admin',
  '/api/user/profile',
] as const

// PUBLIC PAGE ROUTES - These DO NOT require authentication
const PUBLIC_PAGE_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/privacy',
  '/terms',
  '/cookies',
  '/pricing',
  '/status',
  '/privacy/delete-confirm',
] as const

/**
 * Check if a route is public (does not require authentication)
 */
function isPublicRoute(pathname: string): boolean {
  // Check exact matches for public API routes
  for (const publicRoute of PUBLIC_API_ROUTES) {
    if (pathname.startsWith(publicRoute)) {
      return true
    }
  }

  // Check exact matches for public page routes
  for (const publicRoute of PUBLIC_PAGE_ROUTES) {
    if (pathname === publicRoute || pathname.startsWith(publicRoute + '/')) {
      return true
    }
  }

  return false
}

/**
 * Check if route is an API route
 */
function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/')
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Apply enhanced 2025 security headers to all responses
  Object.entries(securityHeaders2025).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  const pathname = request.nextUrl.pathname

  // Skip auth for public routes
  if (isPublicRoute(pathname)) {
    // Add rate limiting indicator for sensitive public endpoints
    if (pathname.startsWith('/api/auth') ||
        pathname.startsWith('/api/contact') ||
        pathname === '/login' ||
        pathname === '/signup') {
      response.headers.set('X-RateLimit-Policy', 'active')
    }
    return response
  }

  // For API routes that are NOT public, require authentication
  if (isApiRoute(pathname)) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value
            },
            set(name: string, value: string, options: any) {
              response.cookies.set({
                name,
                value,
                ...options,
              })
            },
            remove(name: string, options: any) {
              response.cookies.set({
                name,
                value: '',
                ...options,
              })
            },
          },
        }
      )

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.user) {
        console.warn('Unauthorized API access attempt:', {
          path: pathname,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          timestamp: new Date().toISOString()
        })

        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      // Session is valid, continue
    } catch (authError) {
      console.error('API authentication error:', authError)
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    }
  }

  // For protected pages (like /dashboard), let client-side handle auth
  // This prevents redirect loops while still securing API endpoints

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt, sitemap.xml (SEO files)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
