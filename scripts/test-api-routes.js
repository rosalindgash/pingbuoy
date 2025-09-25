#!/usr/bin/env node

/**
 * Test script for Vercel API routes
 * Tests the core web vitals data fetching API
 */

async function testCoreWebVitalsAPI() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const apiUrl = `${baseUrl}/api/metrics/core-web-vitals`

  console.log('🧪 Testing Core Web Vitals API...')
  console.log(`URL: ${apiUrl}`)

  try {
    // Test basic fetch
    console.log('\n📊 Testing basic data fetch...')
    const response = await fetch(`${apiUrl}?limit=10&hours_back=24`)

    if (!response.ok) {
      console.error(`❌ API request failed: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error('Error response:', errorText)
      return
    }

    const result = await response.json()

    console.log('✅ API request successful')
    console.log(`📈 Summary:`)
    console.log(`   Total records: ${result.summary?.total_records || 0}`)
    console.log(`   Time range: ${result.summary?.time_range_hours || 0} hours`)
    console.log(`   Average metrics:`)
    console.log(`     LCP: ${result.summary?.avg_lcp || 0}ms`)
    console.log(`     INP: ${result.summary?.avg_fid || 0}ms`)
    console.log(`     CLS: ${result.summary?.avg_cls || 0}`)
    console.log(`     FCP: ${result.summary?.avg_fcp || 0}ms`)
    console.log(`     TTFB: ${result.summary?.avg_ttfb || 0}ms`)
    console.log(`   Records returned: ${result.data?.length || 0}`)
    console.log(`   Available sites: ${result.available_sites?.length || 0}`)

    if (result.available_sites && result.available_sites.length > 0) {
      console.log(`   Sites: ${result.available_sites.join(', ')}`)
    }

    // Test with different parameters
    console.log('\n📊 Testing with different parameters...')
    const response2 = await fetch(`${apiUrl}?limit=5&hours_back=168&offset=0`)

    if (response2.ok) {
      const result2 = await response2.json()
      console.log(`✅ Week-long query successful (${result2.data?.length || 0} records)`)
    } else {
      console.log(`⚠️  Week-long query failed: ${response2.status}`)
    }

    // Test site-specific query if sites are available
    if (result.available_sites && result.available_sites.length > 0) {
      const testSite = result.available_sites[0]
      console.log(`\n📊 Testing site-specific query for: ${testSite}`)

      const response3 = await fetch(`${apiUrl}?site_url=${encodeURIComponent(testSite)}&limit=10`)

      if (response3.ok) {
        const result3 = await response3.json()
        console.log(`✅ Site-specific query successful (${result3.data?.length || 0} records)`)
      } else {
        console.log(`⚠️  Site-specific query failed: ${response3.status}`)
      }
    }

    console.log('\n🎉 Core Web Vitals API test completed!')
    return true

  } catch (error) {
    console.error('❌ API test failed with error:', error.message)
    return false
  }
}

async function testPOSTMethod() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const apiUrl = `${baseUrl}/api/metrics/core-web-vitals`

  console.log('\n🚫 Testing POST method (should be disabled)...')

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        metric: 'LCP',
        value: 1000,
        url: 'https://test.com',
        timestamp: Date.now()
      })
    })

    if (response.status === 405) {
      console.log('✅ POST method correctly disabled (405 Method Not Allowed)')
      const result = await response.json()
      console.log(`   Message: ${result.error}`)
    } else {
      console.log(`⚠️  POST method returned unexpected status: ${response.status}`)
    }
  } catch (error) {
    console.log('⚠️  POST method test failed:', error.message)
  }
}

async function runTests() {
  console.log('🚀 Testing Vercel API Routes\n')

  const success = await testCoreWebVitalsAPI()
  await testPOSTMethod()

  if (success) {
    console.log('\n💡 Next steps:')
    console.log('   - Open your dashboard at /dashboard/core-vitals')
    console.log('   - Check that data loads from the API route')
    console.log('   - Verify that summary metrics are displayed')
    console.log('   - Test the refresh functionality')
  } else {
    console.log('\n🔧 Troubleshooting:')
    console.log('   - Ensure your Next.js app is running')
    console.log('   - Check that SUPABASE_SERVICE_ROLE_KEY is set in .env.local')
    console.log('   - Verify the core_web_vitals table exists and has data')
    console.log('   - Check the API route logs for errors')
  }
}

// Run the tests
runTests().catch(console.error)