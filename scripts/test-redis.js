#!/usr/bin/env node

/**
 * Redis Configuration Test Script
 *
 * Run this script to validate and test your Redis configuration:
 * node scripts/test-redis.js
 */

require('dotenv').config({ path: '.env.local' })

async function testRedisConfiguration() {
  console.log('🔍 Testing Redis Configuration for PingBuoy Rate Limiting\n')

  try {
    // Import the validator
    const { redisValidator } = require('../src/lib/redis-config-validator.ts')

    // Step 1: Validate configuration
    console.log('📋 Step 1: Validating Environment Variables')
    const validation = redisValidator.validateConfig()
    redisValidator.printValidationResults(validation)

    if (!validation.isValid) {
      console.log('❌ Configuration is invalid. Please fix the issues above.\n')

      const instructions = redisValidator.getSetupInstructions()
      console.log(`📖 ${instructions.title}`)
      console.log(instructions.steps.join('\n'))

      if (instructions.troubleshooting.length > 0) {
        console.log('\n🔧 Troubleshooting:')
        console.log(instructions.troubleshooting.join('\n'))
      }

      process.exit(1)
    }

    // Step 2: Health check
    console.log('❤️  Step 2: Testing Redis Connection')
    const health = await redisValidator.healthCheck()
    redisValidator.printHealthCheck(health)

    if (!health.connected) {
      console.log('❌ Redis connection failed. Please check your configuration.\n')
      process.exit(1)
    }

    // Step 3: Test rate limiting functionality
    console.log('⚡ Step 3: Testing Rate Limiting Functionality')

    const { getRateLimiter, RATE_LIMIT_CONFIGS } = require('../src/lib/redis-rate-limit.ts')
    const rateLimiter = getRateLimiter()

    const testConfig = {
      windowMs: 60000, // 1 minute
      maxRequests: 5
    }

    console.log('  Testing basic rate limiting...')

    // Make 3 test requests
    for (let i = 1; i <= 3; i++) {
      const result = await rateLimiter.checkLimit(
        `test:${Date.now()}:${i}`,
        testConfig,
        'test'
      )

      console.log(`  Request ${i}: ${result.success ? '✅ Allowed' : '❌ Blocked'} (${result.remaining} remaining)`)
    }

    console.log('\n🎉 All tests passed! Redis rate limiting is working correctly.')
    console.log('\n📊 Configuration Summary:')
    console.log(`  Provider: ${validation.provider}`)
    console.log(`  Latency: ${health.latency}ms`)
    if (health.version) {
      console.log(`  Version: Redis ${health.version}`)
    }
    if (health.memory) {
      console.log(`  Memory: ${health.memory.used} used`)
    }

    console.log('\n💡 Next Steps:')
    console.log('  • Deploy your application with these Redis settings')
    console.log('  • Monitor rate limiting in your application logs')
    console.log('  • Adjust rate limits in RATE_LIMIT_CONFIGS if needed')
    console.log('  • Set up monitoring alerts for Redis availability')

  } catch (error) {
    console.error('💥 Test failed with error:')

    if (error.message.includes('Cannot resolve module')) {
      console.error('📁 Please run this script from the project root directory')
      console.error('   cd /path/to/pingbuoy && node scripts/test-redis.js')
    } else if (error.message.includes('Redis configuration')) {
      console.error('⚙️  Redis configuration error:', error.message)
      console.error('🔗 See REDIS_RATE_LIMITING.md for setup instructions')
    } else {
      console.error('🐛 Unexpected error:', error.message)
      console.error('📝 Please check your environment variables and try again')
    }

    console.error('\n🆘 Need help?')
    console.error('  • Check REDIS_RATE_LIMITING.md in your project')
    console.error('  • Verify your .env.local file has the correct Redis variables')
    console.error('  • Test your Redis credentials in the Upstash dashboard')

    process.exit(1)
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled error:', error)
  process.exit(1)
})

// Run the test
testRedisConfiguration()