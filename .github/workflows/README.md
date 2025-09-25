# GitHub Workflows - Monitoring Disabled

## ⚠️ Important Notice

The monitoring-related GitHub workflows have been **DISABLED** as all monitoring now runs in Supabase Edge Functions with scheduled functions.

### Disabled Workflows
- `uptime-monitoring.yml.disabled` - Called old `/api/cron/uptime` Vercel route
- `data-cleanup.yml.disabled` - Called old `/api/cron/cleanup` Vercel route

### Why This Change?

1. **Single Source of Truth**: All monitoring runs in Supabase infrastructure
2. **Better Reliability**: Supabase scheduled functions run even if GitHub Actions or Vercel are down
3. **Simplified Architecture**: No external dependencies for monitoring
4. **Cost Efficiency**: No GitHub Actions minutes consumed
5. **Consistent Timing**: Supabase pg_cron provides more reliable scheduling

### Current Monitoring Setup

All monitoring is now handled by Supabase scheduled functions:

```sql
-- Every 5 minutes: uptime monitoring
SELECT cron.schedule('uptime-monitoring', '*/5 * * * *', $$SELECT call_edge_function('uptime-monitor');$$);

-- Daily at 1 AM: data cleanup
SELECT cron.schedule('data-cleanup', '0 1 * * *', $$SELECT call_edge_function('data-cleanup');$$);

-- Every 6 hours: page speed monitoring
SELECT cron.schedule('page-speed-monitoring', '0 */6 * * *', $$SELECT call_edge_function('page-speed-monitor');$$);

-- Every 3 days at 2 AM: dead link scanning
SELECT cron.schedule('dead-link-scanning', '0 2 */3 * *', $$SELECT call_edge_function('dead-link-batch-scanner');$$);
```

### View Scheduled Jobs

Check what's currently scheduled in your Supabase database:

```sql
-- View all scheduled jobs
SELECT * FROM cron.job;

-- View recent job runs
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

### Rollback Plan

If you need to temporarily restore GitHub workflow monitoring:

1. Rename `.disabled` files back to `.yml`
2. Ensure `APP_URL` and `CRON_SECRET` are set in GitHub secrets
3. Re-enable the corresponding Vercel API routes
4. Disable the Supabase scheduled functions to prevent double runs

### Active Workflows

Other workflows that remain active:
- Security scanning workflows
- Build/deployment workflows (if any)
- Backup validation workflows (if any)

**Note**: Only monitoring-specific workflows have been disabled. Other CI/CD workflows continue to function normally.