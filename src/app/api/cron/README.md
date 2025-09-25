# Cron Routes - DISABLED

## ⚠️ Important Notice

The monitoring cron routes in this directory have been **DISABLED** and moved to Supabase Edge Functions with scheduled functions.

### Disabled Routes
- `check-uptime.disabled/` - Now handled by `uptime-monitor` Edge Function
- `check-page-speed.disabled/` - Now handled by `page-speed-monitor` Edge Function
- `scan-dead-links.disabled/` - Now handled by `dead-link-batch-scanner` Edge Function
- `cleanup-data.disabled/` - Now handled by `data-cleanup` Edge Function

### Why This Change?

1. **Single Source of Truth**: All monitoring runs in Supabase infrastructure
2. **No Double Runs**: Eliminates conflicts between Vercel crons and Edge Functions
3. **Better Reliability**: Edge Functions run even if Vercel is down
4. **Closer to Data**: Functions run next to the database for better performance
5. **No Auth Confusion**: No need for external headers/secrets

### All Routes Disabled
All cron routes have been disabled as monitoring is now fully handled by Supabase Edge Functions with scheduled functions.

### How Monitoring Now Works

Monitoring is scheduled in Supabase using `pg_cron`:

```sql
-- Every 5 minutes: uptime monitoring
SELECT cron.schedule('uptime-monitoring', '*/5 * * * *', $$SELECT call_edge_function('uptime-monitor');$$);

-- Every 6 hours: page speed checks
SELECT cron.schedule('page-speed-monitoring', '0 */6 * * *', $$SELECT call_edge_function('page-speed-monitor');$$);

-- Every 3 days at 2 AM: dead link scanning
SELECT cron.schedule('dead-link-scanning', '0 2 */3 * *', $$SELECT call_edge_function('dead-link-batch-scanner');$$);

-- Daily at 1 AM: data cleanup
SELECT cron.schedule('data-cleanup', '0 1 * * *', $$SELECT call_edge_function('data-cleanup');$$);
```

### Edge Functions Location
- `supabase/functions/uptime-monitor/`
- `supabase/functions/page-speed-monitor/`
- `supabase/functions/dead-link-scanner/`
- `supabase/functions/dead-link-batch-scanner/`
- `supabase/functions/data-cleanup/`

### Setup Required
1. Deploy Edge Functions: `supabase functions deploy`
2. Run database migrations: `supabase db push`
3. Configure project reference and service role key in the scheduled functions migration
4. Verify schedules: `SELECT * FROM cron.job;`