#!/usr/bin/env node

/**
 * Test script for Edge Functions
 * Tests all monitoring functions to ensure they work correctly
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const functions = [
  'uptime-monitor',
  'page-speed-monitor',
  'data-cleanup',
  'dead-link-batch-scanner',
  'core-web-vitals'
];

async function testFunction(functionName, payload = {}) {
  const projectRef = process.env.SUPABASE_PROJECT_REF || process.env.PROJECT_REF;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!projectRef || !serviceRoleKey) {
    console.error('❌ Missing environment variables:');
    console.error('   SUPABASE_PROJECT_REF (your project reference)');
    console.error('   SUPABASE_SERVICE_ROLE_KEY (your service role key)');
    process.exit(1);
  }

  const url = `https://${projectRef}.supabase.co/functions/v1/${functionName}`;

  console.log(`🧪 Testing ${functionName}...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`✅ ${functionName} - Success`);
      console.log(`   Status: ${response.status}`);
      if (result.success) {
        console.log(`   Result: ${JSON.stringify(result, null, 2)}`);
      }
    } else {
      console.log(`❌ ${functionName} - Failed`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${JSON.stringify(result, null, 2)}`);
    }
  } catch (error) {
    console.log(`❌ ${functionName} - Network Error`);
    console.log(`   Error: ${error.message}`);
  }

  console.log(''); // Empty line for readability
}

async function testCoreWebVitals() {
  const serviceJwtSecret = process.env.SERVICE_JWT_SECRET;
  if (!serviceJwtSecret) {
    console.log('⚠️  Skipping core-web-vitals test - SERVICE_JWT_SECRET not set');
    return;
  }

  console.log('🧪 Testing core-web-vitals with sample data...');

  const testMetrics = [
    { metric: 'LCP', value: 1250, url: 'https://pingbuoy.com', timestamp: Date.now() },
    { metric: 'CLS', value: 0.08, url: 'https://pingbuoy.com/dashboard', timestamp: Date.now() },
    { metric: 'INP', value: 85, url: 'https://pingbuoy.com', timestamp: Date.now() },
    { metric: 'FCP', value: 1100, url: 'https://pingbuoy.com', timestamp: Date.now() },
    { metric: 'TTFB', value: 245, url: 'https://pingbuoy.com', timestamp: Date.now() }
  ];

  for (const testData of testMetrics) {
    await testFunctionWithAuth('core-web-vitals', testData, serviceJwtSecret);
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
  }
}

async function testFunctionWithAuth(functionName, payload, authToken) {
  const projectRef = process.env.SUPABASE_PROJECT_REF || process.env.PROJECT_REF;

  if (!projectRef) {
    console.error('❌ Missing SUPABASE_PROJECT_REF');
    return;
  }

  const url = `https://${projectRef}.supabase.co/functions/v1/${functionName}`;

  console.log(`🧪 Testing ${functionName} with ${payload.metric}...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`✅ ${functionName} (${payload.metric}) - Success`);
    } else {
      console.log(`❌ ${functionName} (${payload.metric}) - Failed`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${JSON.stringify(result, null, 2)}`);
    }
  } catch (error) {
    console.log(`❌ ${functionName} (${payload.metric}) - Network Error`);
    console.log(`   Error: ${error.message}`);
  }
}

async function testScheduledFunctions() {
  console.log('🚀 Testing Edge Functions for Monitoring\n');

  // Test basic functions first
  await testFunction('uptime-monitor');
  await testFunction('page-speed-monitor');
  await testFunction('data-cleanup');
  await testFunction('dead-link-batch-scanner');

  // Test core-web-vitals with special auth
  console.log(''); // Empty line
  await testCoreWebVitals();

  console.log('\n🏁 Testing completed!');
  console.log('\n💡 Tips:');
  console.log('   - Check Edge Function logs: supabase functions logs FUNCTION-NAME');
  console.log('   - View scheduled jobs: SELECT * FROM cron.job;');
  console.log('   - Monitor job runs: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;');
  console.log('   - Check web vitals data: SELECT * FROM core_web_vitals ORDER BY checked_at DESC LIMIT 10;');
}

// Run the tests
testScheduledFunctions().catch(console.error);