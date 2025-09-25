# Edge Functions Monitoring Setup

This guide will help you complete the transition from Vercel crons to Supabase Edge Functions with scheduled functions.

## 🚀 Quick Setup

### 1. Deploy Edge Functions

```bash
# Deploy all edge functions
supabase functions deploy uptime-monitor
supabase functions deploy dead-link-scanner
supabase functions deploy dead-link-batch-scanner
supabase functions deploy page-speed-monitor
supabase functions deploy data-cleanup
supabase functions deploy core-web-vitals
```

### 2. Apply Database Migrations

```bash
# Push migrations to create scheduled functions and page_speed_logs table
supabase db push
```

### 3. Configure Your Project

You need to update the scheduled functions with your actual project details:

#### Get Your Project Reference
1. Go to your Supabase dashboard
2. Navigate to Settings > API
3. Copy your "Project URL" (it looks like `https://abcdefgh.supabase.co`)
4. Extract the project reference (the part before `.supabase.co`)

#### Update the Migration
Update the `get_edge_function_url()` function in your database:

```sql
-- Connect to your Supabase database and run:
CREATE OR REPLACE FUNCTION get_edge_function_url(function_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Replace 'your-project-ref' with your actual project reference
  RETURN 'https://YOUR-ACTUAL-PROJECT-REF.supabase.co/functions/v1/' || function_name;
END;
$$;
```

#### Set Service Role Key
```sql
-- Set your service role key (get this from Settings > API > service_role key)
ALTER DATABASE postgres SET app.supabase.service_role_key = 'your-actual-service-role-key-here';
```

### 4. Configure Environment Variables

Set these environment variables for your Edge Functions:

#### In Supabase Dashboard (Settings > Edge Functions > Environment Variables)
```env
SERVICE_JWT_SECRET=your-service-jwt-secret-for-web-vitals
ALLOWED_WEB_VITALS_DOMAINS=yourdomain.com,www.yourdomain.com
```

#### In your Next.js app (.env.local)
```env
NEXT_PUBLIC_SERVICE_JWT_SECRET=your-service-jwt-secret-for-web-vitals
```

**Important**: The `SERVICE_JWT_SECRET` should be a secure random string that you generate. This is used specifically for the Core Web Vitals function authentication.

## 📋 Verification

### Check Scheduled Jobs
```sql
-- View all scheduled cron jobs
SELECT * FROM cron.job;

-- Should show:
-- uptime-monitoring (*/5 * * * *)
-- page-speed-monitoring (0 */6 * * *)
-- dead-link-scanning (0 2 */3 * *)
-- data-cleanup (0 1 * * *)
```

### Test Functions Manually
```bash
# Test uptime monitoring
curl -X POST 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/uptime-monitor' \
  -H 'Authorization: Bearer YOUR-SERVICE-ROLE-KEY' \
  -H 'Content-Type: application/json'

# Test page speed monitoring
curl -X POST 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/page-speed-monitor' \
  -H 'Authorization: Bearer YOUR-SERVICE-ROLE-KEY' \
  -H 'Content-Type: application/json'

# Test data cleanup
curl -X POST 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/data-cleanup' \
  -H 'Authorization: Bearer YOUR-SERVICE-ROLE-KEY' \
  -H 'Content-Type: application/json'

# Test core web vitals (requires SERVICE_JWT_SECRET)
curl -X POST 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/core-web-vitals' \
  -H 'Authorization: Bearer YOUR-SERVICE-JWT-SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"metric":"LCP","value":1250,"url":"https://pingbuoy.com","timestamp":'$(date +%s)'000}'
```

### Monitor Function Logs
```bash
# Watch logs for uptime monitoring
supabase functions logs uptime-monitor --follow

# Watch logs for page speed monitoring
supabase functions logs page-speed-monitor --follow

# Watch logs for core web vitals
supabase functions logs core-web-vitals --follow
```

## 🎯 Schedules Overview

| Function | Schedule | Description |
|----------|----------|-------------|
| `uptime-monitor` | Every 5 minutes | Checks all active sites for uptime |
| `page-speed-monitor` | Every 6 hours | Measures page load performance |
| `dead-link-batch-scanner` | Every 3 days at 2 AM | Scans all sites for broken links |
| `data-cleanup` | Daily at 1 AM | Cleans up old logs and data |
| `core-web-vitals` | On-demand | Receives Core Web Vitals from client |

## ✅ What's Been Done

- ✅ Vercel cron schedules disabled in `vercel.json`
- ✅ Vercel cron route directories renamed to `.disabled`
- ✅ Edge Functions created with SSRF protection
- ✅ Database scheduled functions configured
- ✅ Page speed logs table created
- ✅ Core Web Vitals Edge Function with `SERVICE_JWT_SECRET` auth
- ✅ Vercel `/api/core-web-vitals` route disabled
- ✅ Client-side code updated to use Edge Function
- ✅ Proper authentication and error handling

## 🔄 Rollback Plan

If you need to rollback to Vercel crons:

1. Restore `vercel.json` crons section
2. Rename `.disabled` directories back to active names
3. Disable Supabase scheduled functions:
   ```sql
   SELECT cron.unschedule('uptime-monitoring');
   SELECT cron.unschedule('page-speed-monitoring');
   SELECT cron.unschedule('dead-link-scanning');
   SELECT cron.unschedule('data-cleanup');
   ```

## 🐛 Troubleshooting

### Functions Not Running
- Check that `pg_cron` extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
- Verify service role key is set: `SELECT current_setting('app.supabase.service_role_key', true);`
- Check cron job status: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`

### Function Errors
- Check Edge Function logs: `supabase functions logs FUNCTION-NAME`
- Verify function authentication in `_shared/service-auth.ts`
- Ensure database permissions for service role

### Missing Data
- Verify `page_speed_logs` table exists
- Check RLS policies are correct
- Ensure sites are marked as `is_active = true`

## 📚 Additional Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [pg_cron Documentation](https://github.com/citusdata/pg_cron)
- [Supabase Scheduled Functions Guide](https://supabase.com/docs/guides/database/postgres/cron)