# Uptime Monitoring Setup

This document explains how the automatic uptime monitoring system works with tiered features.

## How It Works

### 1. Automatic Monitoring (Tiered by Plan)
- **Free Users**: GitHub Actions workflow runs every 5 minutes
- **Pro/Founder Users**: GitHub Actions workflow runs every 1 minute
- Calls `/api/cron/uptime` endpoint with plan-specific parameters
- Endpoint triggers Supabase Edge Function `uptime-monitor`
- Edge function checks sites based on user plan and logs results

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

## Required Environment Variables

### For Deployment (Production)
Add these secrets to your hosting platform:

```
CRON_SECRET=your-secure-random-string
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key
GOOGLE_PAGESPEED_API_KEY=your-google-api-key (for Pro page speed features)
```

### For GitHub Actions
Add these secrets to your GitHub repository:

```
APP_URL=https://your-app-domain.com
CRON_SECRET=same-as-above
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