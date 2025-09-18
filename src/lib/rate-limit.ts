/**
 * Rate limiting implementation for API routes
 * Uses in-memory store for simplicity - can be upgraded to Redis for production scale
 */

interface RateLimitEntry {
  count: number
  resetTime: number
  plan: 'free' | 'pro' | 'founder'
}

// In-memory rate limit store
const rateLimitStore = new Map<string, RateLimitEntry>()

// Rate limit configuration
const RATE_LIMITS = {
  free: {
    requests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  pro: {
    requests: 1000,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  founder: {
    requests: 10000,
    windowMs: 60 * 60 * 1000, // 1 hour
  }
}

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
  retryAfter?: number
}

/**
 * Check if a user is within their rate limit
 * @param userId - The user's ID
 * @param userPlan - The user's subscription plan
 * @param endpoint - Optional endpoint identifier for per-endpoint limits
 * @returns Rate limit result with remaining requests and reset time
 */
export function checkRateLimit(
  userId: string,
  userPlan: 'free' | 'pro' | 'founder',
  endpoint?: string
): RateLimitResult {
  const key = endpoint ? `${userId}:${endpoint}` : userId
  const now = Date.now()
  const config = RATE_LIMITS[userPlan]

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired one
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
      plan: userPlan
    }
    rateLimitStore.set(key, entry)
  }

  // Update plan if it changed
  entry.plan = userPlan

  // Check if limit exceeded
  if (entry.count >= config.requests) {
    return {
      success: false,
      limit: config.requests,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000)
    }
  }

  // Increment counter
  entry.count++

  return {
    success: true,
    limit: config.requests,
    remaining: config.requests - entry.count,
    resetTime: entry.resetTime
  }
}

/**
 * Get rate limit headers for HTTP response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString()
  }

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString()
  }

  return headers
}

/**
 * Rate limiting middleware for Next.js API routes
 * Usage in API route:
 *
 * ```typescript
 * import { withRateLimit } from '@/lib/rate-limit'
 *
 * export const POST = withRateLimit(async function handler(request: NextRequest) {
 *   // Your API logic here
 * })
 * ```
 */
export function withRateLimit<T extends any[]>(
  handler: (request: Request, ...args: T) => Promise<Response>,
  endpoint?: string
) {
  return async function rateLimitedHandler(request: Request, ...args: T): Promise<Response> {
    try {
      // For now, we'll implement rate limiting in each route individually
      // This wrapper is prepared for future use
      return await handler(request, ...args)
    } catch (error) {
      console.error('Rate limit middleware error:', error)
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}

/**
 * Get client IP address for rate limiting
 * Note: In production behind a proxy, check X-Forwarded-For header
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  if (realIp) {
    return realIp
  }

  // Fallback - this won't work in production
  return 'unknown'
}

/**
 * Simple IP-based rate limiting (for unauthenticated endpoints)
 */
export function checkIPRateLimit(ip: string, requestsPerHour: number = 60): RateLimitResult {
  const key = `ip:${ip}`
  const now = Date.now()
  const windowMs = 60 * 60 * 1000 // 1 hour

  let entry = rateLimitStore.get(key) as RateLimitEntry | undefined

  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
      plan: 'free' // Default for IP-based limiting
    }
    rateLimitStore.set(key, entry)
  }

  if (entry.count >= requestsPerHour) {
    return {
      success: false,
      limit: requestsPerHour,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000)
    }
  }

  entry.count++

  return {
    success: true,
    limit: requestsPerHour,
    remaining: requestsPerHour - entry.count,
    resetTime: entry.resetTime
  }
}