# Uptime Monitoring Setup

This document explains how the automatic uptime monitoring system works with tiered features.

## How It Works

### 1. Automatic Monitoring (Supabase Scheduled Functions)
- **All Users**: Supabase scheduled functions run every 5 minutes
- Uses `pg_cron` to call `uptime-monitor` Edge Function directly
- Edge function checks all active sites and applies plan-specific intervals
- **Free Users**: Sites checked every 5 minutes (as per plan logic)
- **Pro/Founder Users**: Sites checked every 1 minute (as per plan logic)
- No external dependencies (GitHub Actions, Vercel crons) required

### 2. Manual Monitoring
- **All Users**: Individual site checks via "Check" button in dashboard
- **All Users**: Bulk checks via "Check All Sites" button
- **All Users**: Page speed checks via "Speed" button
- **Pro/Founder Users**: SSL certificate monitoring
- Uses `/api/sites/[siteId]/ping` and `/api/page-speed/[siteId]` endpoints
- Results stored in `uptime_logs` table with plan-specific data

### 3. Real-time Dashboard Updates
- Dashboard auto-refreshes every 30 seconds
- Shows current status, uptime statistics, and page speed scores
- **Pro features**: SSL certificate status and expiry tracking
- Displays recent check results

## Architecture Overview

```
Supabase pg_cron → Edge Function → Database → Dashboard
```

### Monitoring Flow
1. **Scheduled Function**: `pg_cron` calls `uptime-monitor` every 5 minutes
2. **Edge Function**: Checks all active sites with plan-aware frequency
3. **Database**: Stores results in `uptime_logs` table
4. **Dashboard**: Displays real-time status from database

## Required Environment Variables

### For Supabase Setup
Configure these in your Supabase project:

**Database Configuration:**
```sql
-- Set service role key for scheduled functions
ALTER DATABASE postgres SET app.supabase.service_role_key = 'your-service-role-key';
```

**Edge Function Environment Variables** (in Supabase Dashboard):
```
SERVICE_JWT_SECRET=your-secure-jwt-secret (for Core Web Vitals)
ALLOWED_WEB_VITALS_DOMAINS=pingbuoy.com,www.pingbuoy.com
```

**Next.js Environment Variables** (.env.local):
```
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key
NEXT_PUBLIC_SERVICE_JWT_SECRET=your-secure-jwt-secret
```

## Database Tables

### uptime_logs
Stores all monitoring check results:
- `site_id` - References sites table
- `status` - 'up' or 'down'
- `response_time` - Response time in milliseconds
- `status_code` - HTTP status code
- `checked_at` - Timestamp of check

### sites
Updated with current status:
- `status` - Current site status
- `last_checked` - Last monitoring timestamp

## Manual Testing

Test the uptime monitoring manually:

```bash
# Test manual site check
curl -X POST "https://your-app.com/api/sites/SITE_ID/ping" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"

# Test cron endpoint (requires CRON_SECRET)
curl -X POST "https://your-app.com/api/cron/uptime" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Monitoring Frequency

- **Automatic Free**: Every 5 minutes via GitHub Actions
- **Automatic Pro/Founder**: Every 1 minute via GitHub Actions
- **Manual**: On-demand via dashboard buttons
- **Dashboard refresh**: Every 30 seconds

## Data Retention

- **Free Users**: 7 days of monitoring history
- **Pro/Founder Users**: 90 days of monitoring history
- **Automatic cleanup**: Daily at 2 AM UTC via GitHub Actions

## Pro Features

### Page Speed Monitoring
- Google PageSpeed Insights integration
- Core Web Vitals tracking (LCP, FID, CLS)
- Performance scores (0-100)
- Load time measurements

### SSL Certificate Monitoring
- SSL validity checks for HTTPS sites
- Certificate expiry tracking
- Automated alerts for expiring certificates

### Enhanced Data
- Detailed performance metrics
- Extended monitoring history
- Higher monitoring frequency

## Alerts

The system automatically:
- Sends email alerts when sites go down
- Sends recovery notifications when sites come back up
- Prevents alert spam by checking for existing unresolved alerts