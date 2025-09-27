// Test the exact queries that the status page uses
// Run this in browser console while on staging.pingbuoy.com/status/rosalindgash.org

async function debugStatusQueries() {
  console.log('🔍 Debugging exact status page queries...\n');

  // Create the same supabase client the status page uses
  const { createClient } = supabaseJs;
  const supabase = createClient(
    'https://jowgayuomnzfvrrsrssl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impvd2dheXVvbW56ZnZycnNyc3NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0Njg0NjYsImV4cCI6MjA3NDA0NDQ2Nn0.F5tghTIPa73NJ4Rj81FxgZJEs0WgyRj-x85ff2DTXDk'
  );

  const domain = 'rosalindgash.org';

  // Step 1: Test site lookup (same as status page)
  console.log('1. Testing site lookup...');
  const possibleUrls = [
    `https://${domain}`,
    `http://${domain}`,
    `https://www.${domain}`,
    `http://www.${domain}`,
    `https://${domain}/`,
    `http://${domain}/`,
    `https://www.${domain}/`,
    `http://www.${domain}/`
  ];

  const { data: sitesData, error: sitesError } = await supabase
    .from('sites')
    .select(`
      id, name, url, status, last_checked, user_id, public_status,
      users(plan, email)
    `)
    .eq('is_active', true)
    .or(possibleUrls.map(url => `url.eq.${url}`).join(','));

  if (sitesError) {
    console.error('❌ Sites error:', sitesError);
    return;
  }

  console.log('Sites found:', sitesData);

  if (!sitesData || sitesData.length === 0) {
    console.log('❌ No sites found');
    return;
  }

  const site = sitesData[0];
  console.log(`✅ Using site: ${site.name} (${site.id})`);
  console.log(`   Public status: ${site.public_status}`);

  // Step 2: Test uptime logs query (30-day stats)
  console.log('\n2. Testing 30-day uptime stats...');
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: uptimeData, error: uptimeError } = await supabase
    .from('uptime_logs')
    .select('status, checked_at')
    .eq('site_id', site.id)
    .in('status', ['up', 'down'])
    .gte('checked_at', thirtyDaysAgo)
    .order('checked_at', { ascending: true });

  if (uptimeError) {
    console.error('❌ Uptime logs error:', uptimeError);
  } else {
    console.log(`✅ Found ${uptimeData?.length || 0} uptime logs`);
    if (uptimeData && uptimeData.length > 0) {
      const upCount = uptimeData.filter(log => log.status === 'up').length;
      const uptime = (upCount / uptimeData.length * 100).toFixed(2);
      console.log(`   Uptime: ${uptime}% (${upCount}/${uptimeData.length})`);
      console.log(`   Recent logs:`, uptimeData.slice(-3));
    }
  }

  // Step 3: Test response time query
  console.log('\n3. Testing response time data...');
  const { data: responseData, error: responseError } = await supabase
    .from('uptime_logs')
    .select('response_time, checked_at')
    .eq('site_id', site.id)
    .eq('status', 'up')
    .not('response_time', 'is', null)
    .order('checked_at', { ascending: false })
    .limit(10);

  if (responseError) {
    console.error('❌ Response time error:', responseError);
  } else {
    console.log(`✅ Found ${responseData?.length || 0} response time records`);
    if (responseData && responseData.length > 0) {
      const avgTime = Math.round(
        responseData.reduce((sum, log) => sum + (log.response_time || 0), 0) / responseData.length
      );
      console.log(`   Average response time: ${avgTime}ms`);
      console.log(`   Recent times:`, responseData.slice(0, 3).map(r => `${r.response_time}ms`));
    }
  }

  // Step 4: Test hourly data
  console.log('\n4. Testing 24-hour data...');
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: hourlyLogs, error: hourlyError } = await supabase
    .from('uptime_logs')
    .select('status, checked_at')
    .eq('site_id', site.id)
    .in('status', ['up', 'down'])
    .gte('checked_at', twentyFourHoursAgo)
    .order('checked_at', { ascending: true });

  if (hourlyError) {
    console.error('❌ Hourly data error:', hourlyError);
  } else {
    console.log(`✅ Found ${hourlyLogs?.length || 0} logs in last 24 hours`);
  }

  // Step 5: Test dead links
  console.log('\n5. Testing dead links...');
  const { data: deadLinksData, error: deadLinksError } = await supabase
    .from('dead_links')
    .select('id, found_at')
    .eq('site_id', site.id)
    .eq('fixed', false)
    .order('found_at', { ascending: false });

  if (deadLinksError) {
    console.error('❌ Dead links error:', deadLinksError);
  } else {
    console.log(`✅ Found ${deadLinksData?.length || 0} broken links`);
  }

  console.log('\n✅ Debug complete. Check for any errors above.');
}

console.log('Paste this in your browser console while on the status page:');
console.log('debugStatusQueries()');