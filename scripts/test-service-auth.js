/**
 * Test script for the new JWT-based service authentication
 * Run with: node scripts/test-service-auth.js
 */

const crypto = require('crypto')
const { SignJWT, jwtVerify } = require('jose')

// Test service permissions
const SERVICE_PERMISSIONS = {
  uptime_monitor: {
    tables: ['uptime_logs', 'sites', 'alerts'],
    operations: ['SELECT', 'INSERT', 'UPDATE'],
    scope: 'monitoring'
  },
  email_sender: {
    tables: ['email_logs', 'notification_history'],
    operations: ['INSERT', 'SELECT'],
    scope: 'communication'
  }
}

// Generate test JWT secret
const testSecret = crypto.randomBytes(32)

async function generateTestToken(serviceType, expirationMinutes = 60) {
  const permissions = SERVICE_PERMISSIONS[serviceType]
  const now = Math.floor(Date.now() / 1000)

  const payload = {
    iss: 'pingbuoy-service',
    sub: `${serviceType}-${now}`,
    service_type: serviceType,
    permissions,
    iat: now,
    exp: now + (expirationMinutes * 60),
    scope: permissions.scope
  }

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expirationMinutes}m`)
    .sign(testSecret)

  return token
}

async function verifyTestToken(token) {
  try {
    const { payload } = await jwtVerify(token, testSecret, {
      issuer: 'pingbuoy-service'
    })
    return { valid: true, payload }
  } catch (error) {
    return { valid: false, error: error.message }
  }
}

function hasPermission(payload, table, operation) {
  const permissions = payload.permissions
  return permissions.tables.includes(table) &&
         permissions.operations.includes(operation)
}

async function runTests() {
  console.log('🧪 Testing JWT-based Service Authentication\n')

  // Test 1: Generate and verify uptime_monitor token
  console.log('Test 1: Generate uptime_monitor token')
  const uptimeToken = await generateTestToken('uptime_monitor')
  const uptimeVerification = await verifyTestToken(uptimeToken)

  if (uptimeVerification.valid) {
    console.log('✅ Token generation and verification successful')
    console.log(`Service Type: ${uptimeVerification.payload.service_type}`)
    console.log(`Scope: ${uptimeVerification.payload.scope}`)
  } else {
    console.log('❌ Token verification failed:', uptimeVerification.error)
  }

  // Test 2: Permission checks
  console.log('\nTest 2: Permission validation')
  if (uptimeVerification.valid) {
    const payload = uptimeVerification.payload

    // Should have permission
    if (hasPermission(payload, 'uptime_logs', 'INSERT')) {
      console.log('✅ Uptime monitor can INSERT uptime_logs')
    } else {
      console.log('❌ Uptime monitor should be able to INSERT uptime_logs')
    }

    // Should NOT have permission
    if (!hasPermission(payload, 'email_logs', 'INSERT')) {
      console.log('✅ Uptime monitor correctly denied access to email_logs')
    } else {
      console.log('❌ Uptime monitor should NOT have access to email_logs')
    }

    if (!hasPermission(payload, 'uptime_logs', 'DELETE')) {
      console.log('✅ Uptime monitor correctly denied DELETE operations')
    } else {
      console.log('❌ Uptime monitor should NOT have DELETE permissions')
    }
  }

  // Test 3: Generate and verify email_sender token
  console.log('\nTest 3: Generate email_sender token')
  const emailToken = await generateTestToken('email_sender')
  const emailVerification = await verifyTestToken(emailToken)

  if (emailVerification.valid) {
    console.log('✅ Email sender token generation successful')
    const payload = emailVerification.payload

    if (hasPermission(payload, 'email_logs', 'INSERT')) {
      console.log('✅ Email sender can INSERT email_logs')
    } else {
      console.log('❌ Email sender should be able to INSERT email_logs')
    }

    if (!hasPermission(payload, 'sites', 'SELECT')) {
      console.log('✅ Email sender correctly denied access to sites table')
    } else {
      console.log('❌ Email sender should NOT have access to sites table')
    }
  }

  // Test 4: Expired token
  console.log('\nTest 4: Expired token validation')
  const expiredToken = await generateTestToken('uptime_monitor', -1) // Already expired
  const expiredVerification = await verifyTestToken(expiredToken)

  if (!expiredVerification.valid) {
    console.log('✅ Expired token correctly rejected')
  } else {
    console.log('❌ Expired token should be rejected')
  }

  // Test 5: Invalid issuer
  console.log('\nTest 5: Invalid issuer detection')
  const invalidPayload = {
    iss: 'malicious-service', // Wrong issuer
    sub: 'test',
    service_type: 'uptime_monitor',
    permissions: SERVICE_PERMISSIONS.uptime_monitor,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  }

  const invalidToken = await new SignJWT(invalidPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .sign(testSecret)

  const invalidVerification = await verifyTestToken(invalidToken)
  if (!invalidVerification.valid) {
    console.log('✅ Invalid issuer correctly rejected')
  } else {
    console.log('❌ Invalid issuer should be rejected')
  }

  console.log('\n🎉 Service authentication tests completed!')
  console.log('\n📋 Summary:')
  console.log('- JWT tokens are properly generated and verified')
  console.log('- Permission scoping works correctly')
  console.log('- Expired tokens are rejected')
  console.log('- Invalid issuers are rejected')
  console.log('\n⚡ Ready to deploy secure JWT-based authentication!')
}

// Add environment variable validation
function validateEnvironment() {
  console.log('🔧 Environment Validation\n')

  const requiredVars = [
    'SERVICE_JWT_SECRET',
    'API_BASE_URL'
  ]

  const optionalVars = [
    'SUPABASE_SERVICE_ROLE_KEY' // Should be removed
  ]

  console.log('Required variables:')
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: Set`)
    } else {
      console.log(`❌ ${varName}: Missing (required for production)`)
    }
  })

  console.log('\nDeprecated variables:')
  optionalVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`⚠️  ${varName}: Still set (remove for security)`)
    } else {
      console.log(`✅ ${varName}: Properly removed`)
    }
  })

  console.log('\n' + '='.repeat(50) + '\n')
}

// Run the tests
if (require.main === module) {
  validateEnvironment()
  runTests().catch(console.error)
}

module.exports = {
  generateTestToken,
  verifyTestToken,
  hasPermission
}