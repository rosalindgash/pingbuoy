# Uptime Monitoring Setup

This document explains how the automatic uptime monitoring system works.

## How It Works

### 1. Automatic Monitoring (Every 5 minutes)
- GitHub Actions workflow runs every 5 minutes
- Calls `/api/cron/uptime` endpoint with secret authentication
- Endpoint triggers Supabase Edge Function `uptime-monitor`
- Edge function checks all active sites and logs results

### 2. Manual Monitoring
- Individual site checks via "Check" button in dashboard
- Bulk checks via "Check All Sites" button
- Uses `/api/sites/[siteId]/ping` endpoint
- Results stored in `uptime_logs` table

### 3. Real-time Dashboard Updates
- Dashboard auto-refreshes every 30 seconds
- Shows current status and uptime statistics
- Displays recent check results

## Required Environment Variables

### For Deployment (Production)
Add these secrets to your hosting platform:

```
CRON_SECRET=your-secure-random-string
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key
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

- **Automatic**: Every 5 minutes via GitHub Actions
- **Manual**: On-demand via dashboard buttons
- **Dashboard refresh**: Every 30 seconds

## Alerts

The system automatically:
- Sends email alerts when sites go down
- Sends recovery notifications when sites come back up
- Prevents alert spam by checking for existing unresolved alerts