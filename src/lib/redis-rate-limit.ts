/**
 * Redis-based Rate Limiting System
 *
 * Centralized rate limiting using Redis for consistent limits across
 * all instances. Supports both per-IP and per-user rate limiting
 * with sliding window counters and different limits by service/plan.
 */

import { Redis } from '@upstash/redis'

// Redis client configuration
let redis: Redis | null = null
let redisConfigValidated = false

const initRedis = (): Redis => {
  if (!redis) {
    // Import validator here to avoid circular dependencies
    const { redisValidator } = require('./redis-config-validator')

    if (!redisConfigValidated) {
      const validation = redisValidator.validateConfig()

      if (!validation.isValid) {
        const errorMessage = [
          '❌ Redis Rate Limiting Configuration Error:',
          '',
          ...validation.errors.map((error: string) => `  • ${error}`),
          '',
          '💡 Quick Fix:',
          ...validation.suggestions.slice(0, 3).map((suggestion: string) => `  • ${suggestion}`),
          '',
          '📖 See REDIS_RATE_LIMITING.md for detailed setup instructions'
        ].join('\n')

        console.error(errorMessage)

        if (process.env.NODE_ENV === 'production') {
          throw new Error('Redis configuration required for production rate limiting')
        } else {
          console.warn('⚠️  Rate limiting will be disabled in development mode')
          console.warn('🔗 Get free Redis: https://upstash.com (5 minute setup)')
          return null as any // Will cause graceful fallback
        }
      }

      if (validation.warnings.length > 0) {
        console.warn('⚠️  Redis Configuration Warnings:')
        validation.warnings.forEach((warning: string) => console.warn(`  • ${warning}`))
      }

      redisConfigValidated = true
    }

    try {
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })

      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Redis rate limiting initialized successfully')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown Redis initialization error'
      console.error(`❌ Redis initialization failed: ${errorMessage}`)

      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Redis initialization failed: ${errorMessage}`)
      } else {
        console.warn('⚠️  Rate limiting will be disabled in development mode')
        return null as any // Will cause graceful fallback
      }
    }
  }
  return redis
}

export interface RateLimitConfig {
  windowMs: number        // Time window in milliseconds
  maxRequests: number     // Maximum requests in window
  skipIfDisabled?: boolean // Skip if rate limiting is disabled
  keyPrefix?: string      // Custom key prefix
  skipSuccessfulRequests?: boolean // Only count failed requests
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
  retryAfter?: number
  totalHits: number
  windowStart: number
}

export interface RateLimitEntry {
  count: number
  windowStart: number
  lastRequest: number
}

// Rate limit configurations for different services
export const RATE_LIMIT_CONFIGS = {
  // Authentication endpoints
  auth: {
    login: {
      ip: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 attempts per 15 min per IP
      user: { windowMs: 15 * 60 * 1000, maxRequests: 10 } // 10 attempts per 15 min per user
    },
    register: {
      ip: { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 registrations per hour per IP
      user: { windowMs: 60 * 60 * 1000, maxRequests: 1 } // 1 registration per hour per email
    },
    resetPassword: {
      ip: { windowMs: 60 * 60 * 1000, maxRequests: 5 }, // 5 reset attempts per hour per IP
      user: { windowMs: 60 * 60 * 1000, maxRequests: 3 } // 3 reset attempts per hour per user
    }
  },

  // Contact form
  contact: {
    ip: { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 contact forms per hour per IP
    user: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 10 } // 10 contact forms per day per user
  },

  // Analytics events
  analytics: {
    free: { windowMs: 60 * 60 * 1000, maxRequests: 1000 }, // 1k events/hour for free
    pro: { windowMs: 60 * 60 * 1000, maxRequests: 10000 }, // 10k events/hour for pro
    founder: { windowMs: 60 * 60 * 1000, maxRequests: 100000 }, // 100k events/hour for founder
    ip: { windowMs: 60 * 60 * 1000, maxRequests: 100 } // 100 events/hour per IP (unauthenticated)
  },

  // Email service
  email: {
    recipient: { windowMs: 60 * 60 * 1000, maxRequests: 10 }, // 10 emails per hour per recipient
    sender: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 100 }, // 100 emails per day per sender
    ip: { windowMs: 60 * 60 * 1000, maxRequests: 20 } // 20 emails per hour per IP
  },

  // Monitoring and scanning
  monitoring: {
    free: { windowMs: 60 * 60 * 1000, maxRequests: 100 }, // 100 checks/hour for free
    pro: { windowMs: 60 * 60 * 1000, maxRequests: 1000 }, // 1k checks/hour for pro
    founder: { windowMs: 60 * 60 * 1000, maxRequests: 10000 }, // 10k checks/hour for founder
    ip: { windowMs: 60 * 60 * 1000, maxRequests: 50 } // 50 checks/hour per IP
  },

  // Dead link scanning
  scanning: {
    free: { windowMs: 60 * 60 * 1000, maxRequests: 5 }, // 5 scans/hour for free
    pro: { windowMs: 60 * 60 * 1000, maxRequests: 50 }, // 50 scans/hour for pro
    founder: { windowMs: 60 * 60 * 1000, maxRequests: 500 }, // 500 scans/hour for founder
    ip: { windowMs: 60 * 60 * 1000, maxRequests: 2 } // 2 scans/hour per IP
  },

  // Performance monitoring
  performance: {
    free: { windowMs: 60 * 60 * 1000, maxRequests: 10 }, // 10 checks/hour for free
    pro: { windowMs: 60 * 60 * 1000, maxRequests: 100 }, // 100 checks/hour for pro
    founder: { windowMs: 60 * 60 * 1000, maxRequests: 1000 }, // 1k checks/hour for founder
    ip: { windowMs: 60 * 60 * 1000, maxRequests: 5 } // 5 checks/hour per IP
  },

  // General API endpoints
  api: {
    free: { windowMs: 60 * 60 * 1000, maxRequests: 1000 }, // 1k requests/hour for free
    pro: { windowMs: 60 * 60 * 1000, maxRequests: 10000 }, // 10k requests/hour for pro
    founder: { windowMs: 60 * 60 * 1000, maxRequests: 100000 }, // 100k requests/hour for founder
    ip: { windowMs: 60 * 60 * 1000, maxRequests: 200 } // 200 requests/hour per IP
  }
}

export class RedisRateLimiter {
  private redis: Redis
  private keyPrefix: string

  constructor(keyPrefix: string = 'ratelimit') {
    this.redis = initRedis()
    this.keyPrefix = keyPrefix
  }

  /**
   * Check rate limit using sliding window log approach
   */
  async checkLimit(
    identifier: string,
    config: RateLimitConfig,
    service?: string
  ): Promise<RateLimitResult> {
    try {
      const key = this.buildKey(identifier, service, config.keyPrefix)
      const now = Date.now()
      const windowStart = now - config.windowMs

      // Use Lua script for atomic operations
      const luaScript = `
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local windowStart = tonumber(ARGV[2])
        local maxRequests = tonumber(ARGV[3])
        local windowMs = tonumber(ARGV[4])

        -- Remove expired entries
        redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)

        -- Count current requests in window
        local currentCount = redis.call('ZCARD', key)

        -- Check if limit exceeded
        if currentCount >= maxRequests then
          -- Get the oldest entry to calculate retry after
          local oldestEntries = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
          local retryAfter = 0
          if #oldestEntries > 0 then
            retryAfter = math.ceil((tonumber(oldestEntries[2]) + windowMs - now) / 1000)
          end

          return {
            tostring(currentCount),    -- totalHits
            tostring(maxRequests),     -- limit
            '0',                       -- remaining
            tostring(now + windowMs),  -- resetTime
            tostring(retryAfter),      -- retryAfter
            tostring(windowStart),     -- windowStart
            '0'                        -- success (false)
          }
        end

        -- Add current request
        redis.call('ZADD', key, now, now .. ':' .. math.random())
        redis.call('EXPIRE', key, math.ceil(windowMs / 1000))

        local newCount = currentCount + 1
        local remaining = maxRequests - newCount

        return {
          tostring(newCount),        -- totalHits
          tostring(maxRequests),     -- limit
          tostring(remaining),       -- remaining
          tostring(now + windowMs),  -- resetTime
          '0',                       -- retryAfter
          tostring(windowStart),     -- windowStart
          '1'                        -- success (true)
        }
      `

      const result = await this.redis.eval(
        luaScript,
        [key],
        [now.toString(), windowStart.toString(), config.maxRequests.toString(), config.windowMs.toString()]
      ) as string[]

      const [totalHits, limit, remaining, resetTime, retryAfter, windowStartResult, success] = result

      return {
        success: success === '1',
        limit: parseInt(limit),
        remaining: parseInt(remaining),
        resetTime: parseInt(resetTime),
        retryAfter: parseInt(retryAfter) || undefined,
        totalHits: parseInt(totalHits),
        windowStart: parseInt(windowStartResult)
      }

    } catch (error) {
      let errorMessage = 'Redis rate limiting error'
      let shouldFailOpen = config.skipIfDisabled || process.env.NODE_ENV !== 'production'

      if (error instanceof Error) {
        errorMessage = error.message

        // Provide specific error guidance
        if (errorMessage.includes('ENOTFOUND')) {
          errorMessage = '🔍 Redis DNS resolution failed - check UPSTASH_REDIS_REST_URL'
          console.error('💡 Suggestion: Verify your Redis URL is correct and accessible')
        } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          errorMessage = '🔑 Redis authentication failed - check UPSTASH_REDIS_REST_TOKEN'
          console.error('💡 Suggestion: Verify your Redis token is correct and not expired')
        } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
          errorMessage = '🚫 Redis access forbidden - token may be invalid'
          console.error('💡 Suggestion: Generate a new token in your Redis dashboard')
        } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
          errorMessage = '⏱️ Redis connection timeout - server may be overloaded'
          console.error('💡 Suggestion: Check Redis server status and network connectivity')
        } else if (errorMessage.includes('ECONNREFUSED')) {
          errorMessage = '🔌 Redis connection refused - server may be down'
          console.error('💡 Suggestion: Check if Redis server is running and accessible')
        } else if (errorMessage.includes('Maximum call stack')) {
          errorMessage = '🔄 Redis client recursion error - possible configuration issue'
          shouldFailOpen = true // Always fail open for recursion errors
        }
      }

      console.error(`❌ ${errorMessage}`)

      if (shouldFailOpen) {
        console.warn('⚠️  Failing open: allowing request due to Redis error')
        console.warn('🔗 For production reliability, ensure Redis is properly configured')

        return {
          success: true,
          limit: config.maxRequests,
          remaining: config.maxRequests - 1,
          resetTime: Date.now() + config.windowMs,
          totalHits: 1,
          windowStart: Date.now() - config.windowMs
        }
      }

      throw new Error(`Rate limiting failed: ${errorMessage}`)
    }
  }

  /**
   * Check both IP and user rate limits
   */
  async checkDualLimit(
    ip: string,
    userId: string | null,
    ipConfig: RateLimitConfig,
    userConfig: RateLimitConfig,
    service: string
  ): Promise<{ ip: RateLimitResult; user: RateLimitResult | null; success: boolean }> {
    const results = await Promise.all([
      this.checkLimit(`ip:${ip}`, ipConfig, service),
      userId ? this.checkLimit(`user:${userId}`, userConfig, service) : null
    ])

    const ipResult = results[0]
    const userResult = results[1]

    return {
      ip: ipResult,
      user: userResult,
      success: ipResult.success && (userResult?.success ?? true)
    }
  }

  /**
   * Get rate limit status without incrementing counter
   */
  async getStatus(identifier: string, config: RateLimitConfig, service?: string): Promise<RateLimitResult> {
    try {
      const key = this.buildKey(identifier, service, config.keyPrefix)
      const now = Date.now()
      const windowStart = now - config.windowMs

      // Remove expired entries and count current
      await this.redis.zremrangebyscore(key, 0, windowStart)
      const currentCount = await this.redis.zcard(key)

      const remaining = Math.max(0, config.maxRequests - currentCount)
      const retryAfter = remaining === 0 ? Math.ceil(config.windowMs / 1000) : undefined

      return {
        success: currentCount < config.maxRequests,
        limit: config.maxRequests,
        remaining,
        resetTime: now + config.windowMs,
        retryAfter,
        totalHits: currentCount,
        windowStart
      }
    } catch (error) {
      console.error('Redis rate limit status error:', error)
      throw error
    }
  }

  /**
   * Reset rate limit for an identifier
   */
  async reset(identifier: string, service?: string, keyPrefix?: string): Promise<void> {
    try {
      const key = this.buildKey(identifier, service, keyPrefix)
      await this.redis.del(key)
    } catch (error) {
      console.error('Redis rate limit reset error:', error)
      throw error
    }
  }

  /**
   * Block an identifier for a specific duration
   */
  async block(identifier: string, durationMs: number, service?: string): Promise<void> {
    try {
      const blockKey = this.buildKey(`blocked:${identifier}`, service)
      await this.redis.setex(blockKey, Math.ceil(durationMs / 1000), '1')
    } catch (error) {
      console.error('Redis rate limit block error:', error)
      throw error
    }
  }

  /**
   * Check if an identifier is blocked
   */
  async isBlocked(identifier: string, service?: string): Promise<boolean> {
    try {
      const blockKey = this.buildKey(`blocked:${identifier}`, service)
      const blocked = await this.redis.get(blockKey)
      return blocked === '1'
    } catch (error) {
      console.error('Redis rate limit block check error:', error)
      return false // Fail open
    }
  }

  /**
   * Get rate limiting statistics
   */
  async getStats(timeRangeMs: number = 60 * 60 * 1000): Promise<{
    totalRequests: number
    uniqueIPs: number
    uniqueUsers: number
    blockedRequests: number
  }> {
    try {
      const now = Date.now()
      const windowStart = now - timeRangeMs

      // This is a simplified version - in practice you'd want more sophisticated analytics
      const keys = await this.redis.keys(`${this.keyPrefix}:*`)

      let totalRequests = 0
      const uniqueIPs = new Set<string>()
      const uniqueUsers = new Set<string>()

      for (const key of keys) {
        if (key.includes('blocked:')) continue

        const count = await this.redis.zcard(key)
        totalRequests += count

        if (key.includes('ip:')) {
          uniqueIPs.add(key.split('ip:')[1]?.split(':')[0] || '')
        } else if (key.includes('user:')) {
          uniqueUsers.add(key.split('user:')[1]?.split(':')[0] || '')
        }
      }

      const blockedKeys = await this.redis.keys(`${this.keyPrefix}:blocked:*`)

      return {
        totalRequests,
        uniqueIPs: uniqueIPs.size,
        uniqueUsers: uniqueUsers.size,
        blockedRequests: blockedKeys.length
      }
    } catch (error) {
      console.error('Redis rate limit stats error:', error)
      return { totalRequests: 0, uniqueIPs: 0, uniqueUsers: 0, blockedRequests: 0 }
    }
  }

  private buildKey(identifier: string, service?: string, customPrefix?: string): string {
    const prefix = customPrefix || this.keyPrefix
    const parts = [prefix]

    if (service) {
      parts.push(service)
    }

    parts.push(identifier)

    return parts.join(':')
  }
}

// Singleton instance
let rateLimiter: RedisRateLimiter | null = null

export const getRateLimiter = (): RedisRateLimiter => {
  if (!rateLimiter) {
    rateLimiter = new RedisRateLimiter()
  }
  return rateLimiter
}

/**
 * Utility functions for common rate limiting scenarios
 */
export const checkIPLimit = (ip: string, config: RateLimitConfig, service?: string) =>
  getRateLimiter().checkLimit(`ip:${ip}`, config, service)

export const checkUserLimit = (userId: string, config: RateLimitConfig, service?: string) =>
  getRateLimiter().checkLimit(`user:${userId}`, config, service)

export const checkDualLimit = (
  ip: string,
  userId: string | null,
  ipConfig: RateLimitConfig,
  userConfig: RateLimitConfig,
  service: string
) => getRateLimiter().checkDualLimit(ip, userId, ipConfig, userConfig, service)

/**
 * Get rate limit headers for HTTP responses
 */
export const getRateLimitHeaders = (result: RateLimitResult): Record<string, string> => {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
    'X-RateLimit-Window': Math.ceil((result.resetTime - result.windowStart) / 1000).toString()
  }

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString()
  }

  return headers
}

/**
 * Create rate limit response
 */
export const createRateLimitResponse = (
  result: RateLimitResult,
  message: string = 'Rate limit exceeded'
): Response => {
  return new Response(
    JSON.stringify({
      error: message,
      limit: result.limit,
      remaining: result.remaining,
      resetTime: result.resetTime,
      retryAfter: result.retryAfter
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...getRateLimitHeaders(result)
      }
    }
  )
}

/**
 * Extract client IP from request
 */
export const getClientIP = (request: Request): string => {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  // Priority: CF-Connecting-IP > X-Real-IP > X-Forwarded-For
  if (cfConnectingIp) return cfConnectingIp
  if (realIp) return realIp
  if (forwarded) return forwarded.split(',')[0].trim()

  return 'unknown'
}

/**
 * Middleware for rate limiting Next.js API routes
 */
export const withRateLimit = (
  configs: {
    ip?: RateLimitConfig
    user?: RateLimitConfig
  },
  service: string
) => {
  return function rateLimitMiddleware<T extends any[]>(
    handler: (request: Request, ...args: T) => Promise<Response>
  ) {
    return async function rateLimitedHandler(
      request: Request,
      ...args: T
    ): Promise<Response> {
      try {
        const ip = getClientIP(request)

        // Check if IP is blocked first
        const isBlocked = await getRateLimiter().isBlocked(ip, service)
        if (isBlocked) {
          return createRateLimitResponse(
            {
              success: false,
              limit: 0,
              remaining: 0,
              resetTime: Date.now() + 60 * 60 * 1000, // 1 hour
              retryAfter: 3600,
              totalHits: 0,
              windowStart: Date.now()
            },
            'IP temporarily blocked due to abuse'
          )
        }

        // Basic IP rate limiting if configured
        if (configs.ip) {
          const ipResult = await checkIPLimit(ip, configs.ip, service)
          if (!ipResult.success) {
            return createRateLimitResponse(ipResult, 'IP rate limit exceeded')
          }
        }

        // User-based rate limiting would be handled per-endpoint
        // since we need authentication context

        return await handler(request, ...args)
      } catch (error) {
        console.error('Rate limit middleware error:', error)
        // Continue with request if rate limiting fails (fail open)
        return await handler(request, ...args)
      }
    }
  }
}