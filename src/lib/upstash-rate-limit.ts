import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

// Initialize Redis client for rate limiting
function getRedisClient() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('Upstash Redis not configured - rate limiting disabled')
    return null
  }

  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
  })
}

const redis = getRedisClient()

// Rate limit configurations for expensive operations
export const RATE_LIMITS = {
  // Site operations (creation, deletion) - 10 per hour
  SITE_OPERATIONS: {
    limit: 10,
    window: '1 h' as const,
    description: 'Site creation/deletion'
  },

  // Integration operations (write operations) - 20 per hour
  INTEGRATION_OPERATIONS: {
    limit: 20,
    window: '1 h' as const,
    description: 'Integration write operations'
  },

  // Monitoring triggers (manual checks) - 10 per hour
  MONITORING_TRIGGER: {
    limit: 10,
    window: '1 h' as const,
    description: 'Manual monitoring triggers'
  },

  // Data exports (CSV, JSON exports) - 3 per hour
  DATA_EXPORT: {
    limit: 3,
    window: '1 h' as const,
    description: 'Data exports'
  },

  // Admin operations - 100 per hour
  ADMIN_OPERATIONS: {
    limit: 100,
    window: '1 h' as const,
    description: 'Admin operations'
  },

  // General expensive operations - 100 per minute
  EXPENSIVE_OPERATIONS: {
    limit: 100,
    window: '1 m' as const,
    description: 'General expensive operations'
  }
} as const

// Create rate limiters with sliding window algorithm
function createRateLimiters() {
  if (!redis) {
    return null
  }

  return {
    siteOperations: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        RATE_LIMITS.SITE_OPERATIONS.limit,
        RATE_LIMITS.SITE_OPERATIONS.window
      ),
      analytics: true,
      prefix: 'ratelimit:site-ops'
    }),

    integrationOperations: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        RATE_LIMITS.INTEGRATION_OPERATIONS.limit,
        RATE_LIMITS.INTEGRATION_OPERATIONS.window
      ),
      analytics: true,
      prefix: 'ratelimit:integration-ops'
    }),

    monitoringTrigger: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        RATE_LIMITS.MONITORING_TRIGGER.limit,
        RATE_LIMITS.MONITORING_TRIGGER.window
      ),
      analytics: true,
      prefix: 'ratelimit:monitoring-trigger'
    }),

    dataExport: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        RATE_LIMITS.DATA_EXPORT.limit,
        RATE_LIMITS.DATA_EXPORT.window
      ),
      analytics: true,
      prefix: 'ratelimit:data-export'
    }),

    adminOperations: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        RATE_LIMITS.ADMIN_OPERATIONS.limit,
        RATE_LIMITS.ADMIN_OPERATIONS.window
      ),
      analytics: true,
      prefix: 'ratelimit:admin-ops'
    }),

    expensiveOperations: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        RATE_LIMITS.EXPENSIVE_OPERATIONS.limit,
        RATE_LIMITS.EXPENSIVE_OPERATIONS.window
      ),
      analytics: true,
      prefix: 'ratelimit:expensive-ops'
    })
  }
}

export const rateLimiters = createRateLimiters()

/**
 * Apply rate limiting to a request
 *
 * @param identifier - User ID or unique identifier for rate limiting
 * @param limiter - The rate limiter to use
 * @param operationName - Name of the operation for logging
 * @returns NextResponse with 429 if rate limited, null if allowed
 */
export async function applyRateLimit(
  identifier: string,
  limiter: Ratelimit,
  operationName: string
): Promise<NextResponse | null> {
  try {
    const { success, limit, reset, remaining } = await limiter.limit(identifier)

    // Add rate limit headers to response
    const headers = {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(reset).toISOString()
    }

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000)

      console.warn(`Rate limit exceeded for ${operationName}`, {
        identifier,
        limit,
        remaining,
        resetAt: new Date(reset).toISOString()
      })

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many ${operationName} requests. Please try again later.`,
          retryAfter,
          limit,
          remaining: 0,
          resetAt: new Date(reset).toISOString()
        },
        {
          status: 429,
          headers: {
            ...headers,
            'Retry-After': retryAfter.toString()
          }
        }
      )
    }

    return null // Rate limit not exceeded
  } catch (error) {
    console.error(`Rate limit check failed for ${operationName}:`, error)
    // Fail open - allow request if rate limiting fails
    return null
  }
}

/**
 * Check rate limit without consuming a request
 *
 * @param identifier - User ID or unique identifier
 * @param limiter - The rate limiter to check
 * @returns Rate limit status
 */
export async function getRateLimitStatus(
  identifier: string,
  limiter: Ratelimit
): Promise<{
  limit: number
  remaining: number
  reset: number
  resetAt: string
}> {
  const { limit, reset, remaining } = await limiter.limit(identifier)

  return {
    limit,
    remaining,
    reset,
    resetAt: new Date(reset).toISOString()
  }
}

/**
 * Reset rate limit for a user (admin function)
 *
 * @param identifier - User ID or unique identifier
 * @param prefix - The rate limit prefix (e.g., 'ratelimit:site-ops')
 */
export async function resetRateLimit(
  identifier: string,
  prefix: string
): Promise<void> {
  if (!redis) return

  // Reset by deleting the key
  await redis.del(`${prefix}:${identifier}`)
}

/**
 * Convenience function to apply rate limiting with fail-open behavior
 * If Redis is not configured, requests are allowed
 *
 * @param userId - User ID for rate limiting
 * @param limiterKey - Which rate limiter to use
 * @param operationName - Name of operation for error messages
 * @returns NextResponse with 429 if rate limited, null if allowed
 */
export async function checkRateLimit(
  userId: string,
  limiterKey: keyof NonNullable<typeof rateLimiters>,
  operationName: string
): Promise<NextResponse | null> {
  // If rate limiters not initialized (Redis not configured), fail open
  if (!rateLimiters) {
    return null
  }

  const limiter = rateLimiters[limiterKey]
  return applyRateLimit(userId, limiter, operationName)
}
