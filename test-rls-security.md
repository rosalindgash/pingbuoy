# RLS Security Testing Checklist

## ✅ Migration Applied Successfully
- **Date:** 2025-10-03
- **Migration:** 20251003000100_comprehensive_rls_security.sql
- **Status:** Applied to production
- **RLS Enabled on:** users, sites, uptime_logs, integrations, core_web_vitals

---

## 🧪 Manual Testing Checklist

### Test 1: User Can View Only Their Own Sites
**Steps:**
1. Login to http://localhost:4000/login with your account
2. Navigate to http://localhost:4000/dashboard
3. Verify you see only YOUR sites in the dashboard
4. Open browser DevTools → Network tab
5. Refresh the page and check the API response
6. Confirm the sites array only contains sites where `user_id` matches your user ID

**Expected Result:** ✅ Only your own sites are visible

**Status:** [ ] Pass [ ] Fail

---

### Test 2: User Can Add/Edit/Delete Their Own Sites
**Steps:**
1. Navigate to http://localhost:4000/dashboard
2. Click "Add New Site" button
3. Enter site details and save
4. Verify new site appears in dashboard
5. Click edit on the new site
6. Modify site name and save
7. Verify changes are reflected
8. Delete the test site
9. Verify site is removed from dashboard

**Expected Result:** ✅ All CRUD operations work for your own sites

**Status:** [ ] Pass [ ] Fail

---

### Test 3: User Cannot Access Another User's Sites
**Steps:**
1. Login with your account
2. Open browser DevTools → Console
3. Run this code (replace with another user's site ID):
```javascript
const { data, error } = await supabase
  .from('sites')
  .select('*')
  .eq('id', 'ANOTHER_USER_SITE_ID')

console.log('Data:', data)
console.log('Error:', error)
```

**Expected Result:** ✅ Returns empty array (no data) due to RLS filtering

**Status:** [ ] Pass [ ] Fail

---

### Test 4: User Can View Uptime Logs for Their Sites Only
**Steps:**
1. Navigate to http://localhost:4000/dashboard
2. Click on one of your sites to view details
3. Verify uptime history/logs are displayed
4. Check DevTools → Network tab
5. Verify uptime_logs API calls only return logs for YOUR sites

**Expected Result:** ✅ Only uptime logs for your own sites are visible

**Status:** [ ] Pass [ ] Fail

---

### Test 5: User Can Manage Their Own Integrations
**Steps:**
1. Navigate to http://localhost:4000/dashboard/integrations
2. Click "Add Integration"
3. Create a test Slack/Discord/Webhook integration
4. Save the integration
5. Verify it appears in your integrations list
6. Edit the integration
7. Verify changes are saved
8. Delete the test integration
9. Verify it's removed

**Expected Result:** ✅ All integration CRUD operations work

**Status:** [ ] Pass [ ] Fail

---

### Test 6: /dashboard/core-vitals Page Loads Correctly
**Steps:**
1. Navigate to http://localhost:4000/dashboard/core-vitals
2. Verify the page loads without errors
3. Check that metrics are displayed
4. Check that system health shows "Database Responsive: ✓"
5. Open DevTools → Console and verify no RLS errors
6. Check DevTools → Network tab
7. Verify `/api/metrics/core-web-vitals` returns data successfully

**Expected Result:** ✅ Page loads and displays internal metrics correctly

**Status:** [ ] Pass [ ] Fail

---

### Test 7: Monitoring Cron Jobs Continue to Work
**Steps:**
1. Wait 3-5 minutes for next monitoring cycle
2. Check your dashboard for new uptime logs
3. Verify `last_checked` timestamp is recent
4. Navigate to Supabase Dashboard → Database → Functions
5. Check cron job execution logs
6. Verify no errors related to RLS policies

**Expected Result:** ✅ Monitoring continues to create uptime logs

**Status:** [ ] Pass [ ] Fail

---

### Test 8: Service Role Has Full Access (Backend Test)
**Steps:**
1. Check that monitoring Edge Functions work
2. Verify SSL monitoring continues
3. Check analytics are being collected
4. Verify incident management works

**Expected Result:** ✅ All background jobs using service role work

**Status:** [ ] Pass [ ] Fail

---

## 🔍 SQL Verification Queries

Run these in Supabase SQL Editor to verify policies:

### Check RLS Status
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'sites', 'uptime_logs', 'integrations', 'core_web_vitals')
ORDER BY tablename;
```

### List All Policies
```sql
SELECT tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('users', 'sites', 'uptime_logs', 'integrations', 'core_web_vitals')
ORDER BY tablename, policyname;
```

### Test User Isolation (replace with your user_id)
```sql
-- Set context to a specific user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'YOUR_USER_ID_HERE';

-- Should only return YOUR sites
SELECT * FROM sites;

-- Should only return logs for YOUR sites
SELECT * FROM uptime_logs LIMIT 10;

-- Should only return YOUR integrations
SELECT * FROM integrations;

-- Reset role
RESET ROLE;
```

---

## 📋 Summary

**Total Tests:** 8
**Passed:** [ ]
**Failed:** [ ]

**Notes:**
- Document any issues or unexpected behavior
- Check browser console for RLS policy violations
- Monitor Supabase logs for errors

**RLS Security Status:** 🟢 Active and Enforced
