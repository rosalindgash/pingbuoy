/**
 * Startup Validator
 *
 * Automatically validates critical configurations on application startup
 * and provides helpful error messages for developers
 */

import { redisValidator } from './redis-config-validator'

export class StartupValidator {
  private static hasValidated = false

  /**
   * Validate all critical configurations on startup
   */
  public static async validateOnStartup(): Promise<void> {
    if (StartupValidator.hasValidated) {
      return
    }

    console.log('🚀 PingBuoy Startup Validation\n')

    try {
      // Validate Redis configuration
      await StartupValidator.validateRedis()

      // Add other validations here as needed
      // await StartupValidator.validateDatabase()
      // await StartupValidator.validateEmailConfig()

      StartupValidator.hasValidated = true
      console.log('✅ All startup validations passed!\n')

    } catch (error) {
      console.error('❌ Startup validation failed:', error instanceof Error ? error.message : error)

      if (process.env.NODE_ENV === 'production') {
        console.error('🚨 Stopping application due to critical configuration errors')
        process.exit(1)
      } else {
        console.warn('⚠️  Continuing in development mode with degraded functionality')
        StartupValidator.hasValidated = true
      }
    }
  }

  /**
   * Validate Redis configuration
   */
  private static async validateRedis(): Promise<void> {
    console.log('🔍 Validating Redis Rate Limiting Configuration...')

    const validation = redisValidator.validateConfig()

    if (!validation.isValid) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Redis configuration is required for production')
      } else {
        console.warn('⚠️  Redis not configured - rate limiting will be disabled')
        console.warn('🔗 Quick setup: https://upstash.com (5 minutes, free tier available)')
        console.warn('📖 See REDIS_RATE_LIMITING.md for detailed instructions\n')
        return
      }
    }

    // Show warnings but don't fail
    if (validation.warnings.length > 0) {
      console.warn('⚠️  Redis Configuration Warnings:')
      validation.warnings.forEach(warning => console.warn(`  • ${warning}`))
    }

    // Test connection in development
    if (process.env.NODE_ENV === 'development') {
      try {
        console.log('🔌 Testing Redis connection...')
        const health = await redisValidator.healthCheck()

        if (health.connected) {
          console.log(`✅ Redis connected successfully (${health.latency}ms latency)`)
        } else {
          console.warn(`⚠️  Redis connection failed: ${health.error}`)
          console.warn('🔧 Rate limiting will fail open in development')
        }
      } catch (error) {
        console.warn('⚠️  Redis health check failed:', error instanceof Error ? error.message : error)
        console.warn('🔧 Rate limiting will fail open in development')
      }
    }

    console.log('📊 Redis validation complete\n')
  }

  /**
   * Validate environment-specific configurations
   */
  public static validateEnvironment(): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Check Node environment
    const nodeEnv = process.env.NODE_ENV
    if (!nodeEnv) {
      warnings.push('NODE_ENV not set - defaulting to development')
    } else if (!['development', 'test', 'production'].includes(nodeEnv)) {
      warnings.push(`Unknown NODE_ENV: ${nodeEnv}`)
    }

    // Production-specific checks
    if (nodeEnv === 'production') {
      // Redis is required in production
      const redisValidation = redisValidator.validateConfig()
      if (!redisValidation.isValid) {
        errors.push('Redis configuration is required for production rate limiting')
      }

      // Other production checks can go here
      if (!process.env.DATABASE_URL && !process.env.SUPABASE_URL) {
        errors.push('Database configuration is required for production')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Print startup banner with helpful information
   */
  public static printStartupBanner(): void {
    const env = process.env.NODE_ENV || 'development'
    const version = process.env.npm_package_version || 'unknown'

    console.log(`
  ╔═══════════════════════════════════════════╗
  ║              🏓 PingBuoy                  ║
  ║         Website Monitoring Service        ║
  ╠═══════════════════════════════════════════╣
  ║  Environment: ${env.padEnd(23)} ║
  ║  Version: ${version.padEnd(27)} ║
  ║  Node: ${process.version.padEnd(30)} ║
  ╚═══════════════════════════════════════════╝
    `)
  }

  /**
   * Get configuration status for dashboard/admin
   */
  public static async getConfigurationStatus(): Promise<{
    redis: { status: 'ok' | 'warning' | 'error'; message: string; latency?: number }
    environment: { status: 'ok' | 'warning' | 'error'; message: string }
    overall: 'healthy' | 'degraded' | 'error'
  }> {
    // Check Redis
    let redisStatus: 'ok' | 'warning' | 'error' = 'error'
    let redisMessage = 'Not configured'
    let redisLatency: number | undefined

    const redisValidation = redisValidator.validateConfig()
    if (redisValidation.isValid) {
      try {
        const health = await redisValidator.healthCheck()
        if (health.connected) {
          redisStatus = health.latency && health.latency > 1000 ? 'warning' : 'ok'
          redisMessage = `Connected (${health.latency}ms)`
          redisLatency = health.latency
        } else {
          redisStatus = 'error'
          redisMessage = health.error || 'Connection failed'
        }
      } catch (error) {
        redisStatus = 'error'
        redisMessage = error instanceof Error ? error.message : 'Health check failed'
      }
    } else if (redisValidation.warnings.length > 0) {
      redisStatus = 'warning'
      redisMessage = redisValidation.warnings[0]
    }

    // Check environment
    const envValidation = StartupValidator.validateEnvironment()
    const envStatus: 'ok' | 'warning' | 'error' = envValidation.errors.length > 0 ? 'error' :
      envValidation.warnings.length > 0 ? 'warning' : 'ok'

    const envMessage = envValidation.errors.length > 0 ? envValidation.errors[0] :
      envValidation.warnings.length > 0 ? envValidation.warnings[0] : 'Configuration valid'

    // Overall status
    let overall: 'healthy' | 'degraded' | 'error' = 'healthy'
    if (redisStatus === 'error' || envStatus === 'error') {
      overall = 'error'
    } else if (redisStatus === 'warning' || envStatus === 'warning') {
      overall = 'degraded'
    }

    return {
      redis: { status: redisStatus, message: redisMessage, latency: redisLatency },
      environment: { status: envStatus, message: envMessage },
      overall
    }
  }
}

/**
 * Auto-run startup validation in development
 */
if (process.env.NODE_ENV !== 'test' && typeof window === 'undefined') {
  // Only run on server-side, not in browser
  StartupValidator.printStartupBanner()

  // Run validation after a short delay to allow environment to initialize
  setTimeout(async () => {
    try {
      await StartupValidator.validateOnStartup()
    } catch (error) {
      // Error handling is done in validateOnStartup
    }
  }, 100)
}

export default StartupValidator