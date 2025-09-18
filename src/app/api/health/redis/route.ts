import { NextRequest, NextResponse } from 'next/server'
import { redisValidator } from '@/lib/redis-config-validator'
import StartupValidator from '@/lib/startup-validator'

/**
 * Redis Health Check API
 *
 * GET /api/health/redis
 *
 * Returns detailed Redis configuration and connection status
 * Useful for monitoring and debugging
 */

export async function GET(request: NextRequest) {
  try {
    // Check if this is an authenticated request (basic security)
    const authHeader = request.headers.get('Authorization')
    const isLocalRequest = request.headers.get('host')?.includes('localhost') ||
                          request.headers.get('host')?.includes('127.0.0.1')

    // Allow local requests in development, require auth in production
    if (process.env.NODE_ENV === 'production' && !isLocalRequest && !authHeader) {
      return NextResponse.json(
        { error: 'Authentication required for health checks' },
        { status: 401 }
      )
    }

    // Get comprehensive status
    const status = await StartupValidator.getConfigurationStatus()
    const validation = redisValidator.validateConfig()

    // Perform health check
    let healthCheck
    try {
      healthCheck = await redisValidator.healthCheck()
    } catch (error) {
      healthCheck = {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    const response = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      status: status.overall,

      redis: {
        configured: validation.isValid,
        connected: healthCheck.connected,
        provider: validation.provider,
        latency: healthCheck.latency,
        version: healthCheck.version,
        memory: healthCheck.memory
      },

      configuration: {
        validation: {
          valid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings,
          suggestions: process.env.NODE_ENV === 'development' ? validation.suggestions : undefined
        }
      },

      connection: {
        status: healthCheck.connected ? 'connected' : 'disconnected',
        error: healthCheck.error,
        latency_ms: healthCheck.latency,
        test_performed_at: new Date().toISOString()
      },

      rate_limiting: {
        status: validation.isValid && healthCheck.connected ? 'active' : 'disabled',
        fallback_mode: !validation.isValid || !healthCheck.connected ? 'fail_open' : 'enforced'
      }
    }

    // Return appropriate status code
    const statusCode = status.overall === 'healthy' ? 200 :
                      status.overall === 'degraded' ? 200 : 503

    return NextResponse.json(response, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('Redis health check API error:', error)

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      redis: {
        configured: false,
        connected: false
      },
      rate_limiting: {
        status: 'disabled',
        fallback_mode: 'fail_open'
      }
    }, { status: 500 })
  }
}

/**
 * Redis Configuration Test API
 *
 * POST /api/health/redis
 *
 * Performs a comprehensive test of Redis functionality
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication for POST requests
    const authHeader = request.headers.get('Authorization')
    const isLocalRequest = request.headers.get('host')?.includes('localhost')

    if (process.env.NODE_ENV === 'production' && !isLocalRequest && !authHeader) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('🔍 Running comprehensive Redis test...')

    const results = {
      timestamp: new Date().toISOString(),
      tests: [] as Array<{
        name: string
        status: 'pass' | 'fail' | 'skip'
        message: string
        duration_ms?: number
        details?: any
      }>
    }

    // Test 1: Configuration validation
    const startTime = Date.now()
    const validation = redisValidator.validateConfig()
    results.tests.push({
      name: 'Configuration Validation',
      status: validation.isValid ? 'pass' : 'fail',
      message: validation.isValid ? 'Configuration is valid' : validation.errors.join(', '),
      duration_ms: Date.now() - startTime,
      details: validation
    })

    if (!validation.isValid) {
      return NextResponse.json({
        ...results,
        overall: 'failed',
        message: 'Configuration validation failed'
      }, { status: 400 })
    }

    // Test 2: Basic connectivity
    const connectStart = Date.now()
    const healthCheck = await redisValidator.healthCheck()
    results.tests.push({
      name: 'Basic Connectivity',
      status: healthCheck.connected ? 'pass' : 'fail',
      message: healthCheck.connected ?
        `Connected successfully (${healthCheck.latency}ms)` :
        healthCheck.error || 'Connection failed',
      duration_ms: Date.now() - connectStart,
      details: healthCheck
    })

    if (!healthCheck.connected) {
      return NextResponse.json({
        ...results,
        overall: 'failed',
        message: 'Redis connection failed'
      }, { status: 503 })
    }

    // Test 3: Rate limiting functionality
    try {
      const rateLimitStart = Date.now()
      const { getRateLimiter } = require('@/lib/redis-rate-limit')
      const rateLimiter = getRateLimiter()

      const testConfig = {
        windowMs: 60000, // 1 minute
        maxRequests: 10
      }

      const testKey = `health-test:${Date.now()}`
      const rateLimitResult = await rateLimiter.checkLimit(testKey, testConfig, 'health-test')

      results.tests.push({
        name: 'Rate Limiting Functionality',
        status: rateLimitResult.success ? 'pass' : 'fail',
        message: `Rate limiting ${rateLimitResult.success ? 'working' : 'failed'} - ${rateLimitResult.remaining} remaining`,
        duration_ms: Date.now() - rateLimitStart,
        details: {
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          resetTime: new Date(rateLimitResult.resetTime).toISOString()
        }
      })

      // Clean up test key
      await rateLimiter.reset(testKey, 'health-test')

    } catch (error) {
      results.tests.push({
        name: 'Rate Limiting Functionality',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Rate limiting test failed',
        duration_ms: 0
      })
    }

    const overallStatus = results.tests.every(test => test.status === 'pass') ? 'passed' : 'failed'
    const totalDuration = results.tests.reduce((sum, test) => sum + (test.duration_ms || 0), 0)

    return NextResponse.json({
      ...results,
      overall: overallStatus,
      total_duration_ms: totalDuration,
      summary: {
        total_tests: results.tests.length,
        passed: results.tests.filter(t => t.status === 'pass').length,
        failed: results.tests.filter(t => t.status === 'fail').length,
        skipped: results.tests.filter(t => t.status === 'skip').length
      }
    })

  } catch (error) {
    console.error('Redis test API error:', error)

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      overall: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      tests: [{
        name: 'Test Execution',
        status: 'fail' as const,
        message: error instanceof Error ? error.message : 'Test execution failed'
      }]
    }, { status: 500 })
  }
}