/**
 * Redis Configuration Validator
 *
 * Provides comprehensive validation and helpful error messages
 * for Redis rate limiting configuration
 */

import { Redis } from '@upstash/redis'

export interface RedisConfigValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
  provider?: 'upstash' | 'redis-cloud' | 'aws' | 'local' | 'unknown'
}

export interface RedisHealthCheck {
  connected: boolean
  latency?: number
  error?: string
  version?: string
  memory?: {
    used: string
    peak: string
  }
}

export class RedisConfigValidator {
  private static instance: RedisConfigValidator | null = null

  public static getInstance(): RedisConfigValidator {
    if (!RedisConfigValidator.instance) {
      RedisConfigValidator.instance = new RedisConfigValidator()
    }
    return RedisConfigValidator.instance
  }

  /**
   * Validate Redis configuration environment variables
   */
  public validateConfig(): RedisConfigValidation {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    const redisUrl = process.env.UPSTASH_REDIS_REST_URL
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

    // Check if Redis is configured at all
    if (!redisUrl && !redisToken) {
      errors.push('Redis rate limiting is not configured')
      suggestions.push('Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to your environment variables')
      suggestions.push('🔗 Get free Redis: https://upstash.com (10,000 requests/day free)')
      suggestions.push('📖 See setup guide: REDIS_RATE_LIMITING.md in your project')

      return {
        isValid: false,
        errors,
        warnings,
        suggestions,
        provider: 'unknown'
      }
    }

    // Check individual variables
    if (!redisUrl) {
      errors.push('Missing UPSTASH_REDIS_REST_URL environment variable')
      suggestions.push('Copy the REST URL from your Upstash Redis dashboard')
      suggestions.push('Format: https://your-database.upstash.io')
    }

    if (!redisToken) {
      errors.push('Missing UPSTASH_REDIS_REST_TOKEN environment variable')
      suggestions.push('Copy the REST TOKEN from your Upstash Redis dashboard')
      suggestions.push('Format: Starts with "A" followed by alphanumeric characters')
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        errors,
        warnings,
        suggestions,
        provider: 'unknown'
      }
    }

    // Validate URL format
    const provider = this.detectProvider(redisUrl!)
    const urlValidation = this.validateUrl(redisUrl!, provider)
    errors.push(...urlValidation.errors)
    warnings.push(...urlValidation.warnings)
    suggestions.push(...urlValidation.suggestions)

    // Validate token format
    const tokenValidation = this.validateToken(redisToken!, provider)
    errors.push(...tokenValidation.errors)
    warnings.push(...tokenValidation.warnings)
    suggestions.push(...tokenValidation.suggestions)

    // Environment-specific warnings
    if (process.env.NODE_ENV === 'production') {
      if (redisUrl!.includes('localhost') || redisUrl!.includes('127.0.0.1')) {
        errors.push('Using localhost Redis URL in production environment')
        suggestions.push('Use a production Redis service like Upstash, Redis Cloud, or AWS ElastiCache')
      }

      if (redisToken!.length < 20) {
        warnings.push('Redis token appears to be too short for production use')
        suggestions.push('Ensure you\'re using a production-grade Redis token')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      provider
    }
  }

  /**
   * Test Redis connection and performance
   */
  public async healthCheck(): Promise<RedisHealthCheck> {
    const validation = this.validateConfig()
    if (!validation.isValid) {
      return {
        connected: false,
        error: validation.errors.join(', ')
      }
    }

    try {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })

      const startTime = Date.now()

      // Test basic operations
      const testKey = `health-check:${Date.now()}`
      await redis.set(testKey, 'test-value', { ex: 60 }) // Expires in 60 seconds
      const value = await redis.get(testKey)
      await redis.del(testKey)

      const latency = Date.now() - startTime

      if (value !== 'test-value') {
        return {
          connected: false,
          error: 'Redis test operation failed - value mismatch'
        }
      }

      // Try to get Redis info (if available)
      let version: string | undefined
      let memory: { used: string; peak: string } | undefined

      try {
        const info = await redis.info() as any
        if (typeof info === 'string') {
          const versionMatch = info.match(/redis_version:([^\r\n]+)/)
          if (versionMatch) {
            version = versionMatch[1]
          }

          const usedMemoryMatch = info.match(/used_memory_human:([^\r\n]+)/)
          const peakMemoryMatch = info.match(/used_memory_peak_human:([^\r\n]+)/)

          if (usedMemoryMatch && peakMemoryMatch) {
            memory = {
              used: usedMemoryMatch[1],
              peak: peakMemoryMatch[1]
            }
          }
        }
      } catch {
        // INFO command might not be available (e.g., in Upstash)
        // This is not a failure, just limited info
      }

      return {
        connected: true,
        latency,
        version,
        memory
      }

    } catch (error) {
      let errorMessage = 'Unknown Redis connection error'

      if (error instanceof Error) {
        errorMessage = error.message

        // Provide specific error guidance
        if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
          errorMessage = 'Cannot resolve Redis hostname. Check your UPSTASH_REDIS_REST_URL'
        } else if (errorMessage.includes('ECONNREFUSED')) {
          errorMessage = 'Connection refused. Redis server may be down or URL incorrect'
        } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          errorMessage = 'Authentication failed. Check your UPSTASH_REDIS_REST_TOKEN'
        } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
          errorMessage = 'Access forbidden. Token may be invalid or expired'
        } else if (errorMessage.includes('timeout')) {
          errorMessage = 'Connection timeout. Redis server may be overloaded'
        }
      }

      return {
        connected: false,
        error: errorMessage
      }
    }
  }

  /**
   * Get helpful setup instructions based on current configuration
   */
  public getSetupInstructions(): {
    title: string
    steps: string[]
    troubleshooting: string[]
  } {
    const validation = this.validateConfig()

    if (validation.isValid) {
      return {
        title: '✅ Redis Configuration Valid',
        steps: [
          'Your Redis configuration is properly set up',
          'Run a health check to test the connection',
          'Monitor Redis performance in production'
        ],
        troubleshooting: [
          'If you encounter issues, check the Redis dashboard',
          'Monitor rate limiting logs for any errors',
          'Ensure your Redis plan has sufficient capacity'
        ]
      }
    }

    if (!process.env.UPSTASH_REDIS_REST_URL && !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return {
        title: '🚀 Set Up Redis for Rate Limiting',
        steps: [
          '1. Go to https://upstash.com and create a free account',
          '2. Click "Create Database" in the dashboard',
          '3. Choose a database name (e.g., "pingbuoy-rate-limiting")',
          '4. Select a region closest to your users',
          '5. Choose "Global" for multi-region replication (recommended)',
          '6. Click "Create"',
          '7. Copy the "UPSTASH_REDIS_REST_URL" from the dashboard',
          '8. Copy the "UPSTASH_REDIS_REST_TOKEN" from the dashboard',
          '9. Add both to your .env.local file:',
          '   UPSTASH_REDIS_REST_URL=https://your-db.upstash.io',
          '   UPSTASH_REDIS_REST_TOKEN=your_token_here',
          '10. Restart your development server'
        ],
        troubleshooting: [
          'Free tier includes 10,000 requests per day',
          'No credit card required for the free tier',
          'Database creation takes about 30 seconds',
          'Make sure to use the REST API credentials, not the Redis CLI ones'
        ]
      }
    }

    return {
      title: '🔧 Fix Redis Configuration',
      steps: [
        'Check your environment variables:',
        `  UPSTASH_REDIS_REST_URL: ${process.env.UPSTASH_REDIS_REST_URL ? '✅ Set' : '❌ Missing'}`,
        `  UPSTASH_REDIS_REST_TOKEN: ${process.env.UPSTASH_REDIS_REST_TOKEN ? '✅ Set' : '❌ Missing'}`,
        '',
        'If missing variables:',
        '1. Check your .env.local file',
        '2. Restart your development server after adding variables',
        '3. Verify the credentials in your Upstash dashboard'
      ],
      troubleshooting: validation.suggestions
    }
  }

  /**
   * Detect Redis provider from URL
   */
  private detectProvider(url: string): RedisConfigValidation['provider'] {
    if (url.includes('upstash.io')) return 'upstash'
    if (url.includes('redislabs.com') || url.includes('redis.com')) return 'redis-cloud'
    if (url.includes('amazonaws.com') || url.includes('cache.amazonaws.com')) return 'aws'
    if (url.includes('localhost') || url.includes('127.0.0.1')) return 'local'
    return 'unknown'
  }

  /**
   * Validate Redis URL format
   */
  private validateUrl(url: string, provider: RedisConfigValidation['provider']): Pick<RedisConfigValidation, 'errors' | 'warnings' | 'suggestions'> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    try {
      const parsedUrl = new URL(url)

      // Check protocol
      if (!['http:', 'https:', 'redis:', 'rediss:'].includes(parsedUrl.protocol)) {
        errors.push(`Invalid Redis URL protocol: ${parsedUrl.protocol}`)
        suggestions.push('URL should start with https:// for Upstash or redis:// for traditional Redis')
      }

      // Provider-specific validation
      if (provider === 'upstash') {
        if (!parsedUrl.protocol.startsWith('http')) {
          errors.push('Upstash Redis requires HTTP/HTTPS protocol')
          suggestions.push('Use the REST API URL from Upstash dashboard (starts with https://)')
        }

        if (!url.includes('.upstash.io')) {
          warnings.push('URL does not appear to be from Upstash')
          suggestions.push('Ensure you copied the correct URL from your Upstash dashboard')
        }
      }

      // Development vs Production checks
      if (process.env.NODE_ENV === 'production' && parsedUrl.protocol === 'http:') {
        warnings.push('Using HTTP (not HTTPS) for Redis in production')
        suggestions.push('Consider using HTTPS for better security in production')
      }

    } catch (error) {
      errors.push(`Invalid Redis URL format: ${error instanceof Error ? error.message : 'Unknown error'}`)
      suggestions.push('URL should be in format: https://your-database.upstash.io')
    }

    return { errors, warnings, suggestions }
  }

  /**
   * Validate Redis token format
   */
  private validateToken(token: string, provider: RedisConfigValidation['provider']): Pick<RedisConfigValidation, 'errors' | 'warnings' | 'suggestions'> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    if (token.length < 10) {
      errors.push('Redis token appears to be too short')
      suggestions.push('Ensure you copied the complete token from your Redis dashboard')
    }

    if (provider === 'upstash') {
      if (!token.startsWith('A')) {
        warnings.push('Upstash tokens typically start with "A"')
        suggestions.push('Double-check you copied the REST TOKEN (not password) from Upstash')
      }

      if (token.includes(' ') || token.includes('\n') || token.includes('\t')) {
        errors.push('Token contains whitespace characters')
        suggestions.push('Remove any spaces, tabs, or newlines from the token')
      }
    }

    // Check for common copy-paste errors
    if (token.startsWith('redis://') || token.startsWith('http')) {
      errors.push('Token appears to be a URL, not a token')
      suggestions.push('Use the TOKEN field from your dashboard, not the URL')
    }

    return { errors, warnings, suggestions }
  }

  /**
   * Print colored console output for better readability
   */
  public printValidationResults(validation: RedisConfigValidation): void {
    console.log('\n🔍 Redis Configuration Validation\n')

    if (validation.isValid) {
      console.log('✅ Configuration is valid!')
      if (validation.provider) {
        console.log(`📡 Provider: ${validation.provider}`)
      }
    } else {
      console.log('❌ Configuration has issues:')
    }

    if (validation.errors.length > 0) {
      console.log('\n🚨 Errors:')
      validation.errors.forEach(error => console.log(`  • ${error}`))
    }

    if (validation.warnings.length > 0) {
      console.log('\n⚠️  Warnings:')
      validation.warnings.forEach(warning => console.log(`  • ${warning}`))
    }

    if (validation.suggestions.length > 0) {
      console.log('\n💡 Suggestions:')
      validation.suggestions.forEach(suggestion => console.log(`  • ${suggestion}`))
    }

    console.log()
  }

  /**
   * Print health check results
   */
  public printHealthCheck(health: RedisHealthCheck): void {
    console.log('\n❤️  Redis Health Check\n')

    if (health.connected) {
      console.log('✅ Connected successfully!')
      if (health.latency) {
        console.log(`⚡ Latency: ${health.latency}ms`)
      }
      if (health.version) {
        console.log(`📊 Version: Redis ${health.version}`)
      }
      if (health.memory) {
        console.log(`💾 Memory: ${health.memory.used} used, ${health.memory.peak} peak`)
      }
    } else {
      console.log('❌ Connection failed!')
      if (health.error) {
        console.log(`🔍 Error: ${health.error}`)
      }
    }

    console.log()
  }
}

// Export singleton instance
export const redisValidator = RedisConfigValidator.getInstance()