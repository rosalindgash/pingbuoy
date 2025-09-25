# Core Web Vitals Architecture

This document explains the complete Core Web Vitals data flow in PingBuoy.

## 🏗️ Architecture Overview

```
Browser → Edge Function → Database ← Vercel API ← Dashboard
```

### Data Flow

1. **Client-side Collection** (`GoogleAnalytics.tsx`)
   - Uses `web-vitals` library to measure LCP, CLS, INP, FCP, TTFB
   - Sends metrics to Edge Function with SERVICE_JWT_SECRET auth

2. **Data Ingestion** (`supabase/functions/core-web-vitals/`)
   - Validates authorization header
   - Validates metric values and domains
   - Inserts to `core_web_vitals` table with service role

3. **Data Fetching** (`/api/metrics/core-web-vitals`)
   - Vercel API route with service role access
   - Provides aggregated summaries and filtered data
   - Never exposes service role to browser

4. **Dashboard Display** (`/dashboard/core-vitals`)
   - Fetches data via Vercel API route
   - Displays real-time metrics and summaries
   - Shows 24h averages and individual records

## 🔐 Security Model

### Ingestion (Browser → Edge Function)
- **Authentication**: `Authorization: Bearer ${SERVICE_JWT_SECRET}`
- **Domain Validation**: Only allowed domains can submit metrics
- **Value Validation**: Metric ranges validated
- **Timestamp Validation**: Prevents replay attacks

### Fetching (Dashboard → Vercel API → Database)
- **Server-side Only**: Service role key never exposed to browser
- **RLS Bypass**: Service role bypasses row-level security
- **Aggregation**: Provides summaries without exposing raw access

## 📊 Database Schema

```sql
CREATE TABLE core_web_vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_url text NOT NULL,
  lcp numeric,        -- Largest Contentful Paint (ms)
  fid numeric,        -- First Input Delay / INP (ms)
  cls numeric,        -- Cumulative Layout Shift (score)
  fcp numeric,        -- First Contentful Paint (ms)
  ttfb numeric,       -- Time to First Byte (ms)
  checked_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);
```

**Note**: The `fid` column now stores INP (Interaction to Next Paint) values for compatibility, as INP replaced FID as an official Core Web Vital.

## 🔄 API Endpoints

### Edge Function: `core-web-vitals`
```javascript
POST https://PROJECT-REF.supabase.co/functions/v1/core-web-vitals
Authorization: Bearer ${SERVICE_JWT_SECRET}

{
  "metric": "LCP",
  "value": 1250,
  "url": "https://pingbuoy.com",
  "timestamp": 1640995200000
}
```

### Vercel API: `/api/metrics/core-web-vitals`
```javascript
GET /api/metrics/core-web-vitals?limit=100&hours_back=24&site_url=https://pingbuoy.com

Response:
{
  "success": true,
  "data": [...],
  "summary": {
    "total_records": 150,
    "avg_lcp": 1250,
    "avg_fid": 85,
    "avg_cls": 0.08,
    "avg_fcp": 1100,
    "avg_ttfb": 245,
    "time_range_hours": 24
  },
  "available_sites": ["https://pingbuoy.com", ...],
  "pagination": {...}
}
```

## 🎯 Metric Thresholds

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | ≤2.5s | ≤4.0s | >4.0s |
| INP | ≤200ms | ≤500ms | >500ms |
| CLS | ≤0.1 | ≤0.25 | >0.25 |
| FCP | ≤1.8s | ≤3.0s | >3.0s |
| TTFB | ≤800ms | ≤1.8s | >1.8s |

## 🚀 Deployment Checklist

### Environment Variables

**Supabase Edge Functions:**
```env
SERVICE_JWT_SECRET=your-secure-random-string
ALLOWED_WEB_VITALS_DOMAINS=pingbuoy.com,www.pingbuoy.com
```

**Next.js Application (.env.local):**
```env
NEXT_PUBLIC_SERVICE_JWT_SECRET=your-secure-random-string
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Deployment Steps

1. **Deploy Edge Function:**
   ```bash
   supabase functions deploy core-web-vitals
   ```

2. **Set Environment Variables:**
   - In Supabase: Settings > Edge Functions > Environment Variables
   - In Vercel: Settings > Environment Variables

3. **Test Data Flow:**
   ```bash
   node scripts/test-edge-functions.js    # Test ingestion
   node scripts/test-api-routes.js        # Test fetching
   ```

4. **Verify Dashboard:**
   - Visit `/dashboard/core-vitals`
   - Check that metrics load and display properly
   - Verify summary cards show 24h averages

## 🔧 Troubleshooting

### No Data in Dashboard
- Check `SUPABASE_SERVICE_ROLE_KEY` in Vercel environment
- Verify `core_web_vitals` table has data
- Check API route logs in Vercel dashboard

### Ingestion Not Working
- Verify `SERVICE_JWT_SECRET` matches in both environments
- Check Edge Function logs: `supabase functions logs core-web-vitals`
- Ensure domain is in `ALLOWED_WEB_VITALS_DOMAINS`

### Permission Errors
- Confirm service role key has RLS bypass
- Check that RLS policies allow service role access
- Verify table permissions for service role

## 📈 Monitoring

### Key Metrics to Watch
- Data ingestion rate (should correlate with page views)
- API response times for dashboard
- Edge Function error rates
- Database query performance

### Alerts
- Set up monitoring for Edge Function failures
- Monitor API route 500 errors
- Watch for unusual metric values (possible client issues)

## 🔮 Future Enhancements

- **Real-time Dashboard**: Use Supabase Realtime for live updates
- **Historical Trends**: Add charts showing metric trends over time
- **Performance Budgets**: Set thresholds and alerts for regression
- **User Segmentation**: Track metrics by user type, geography, device
- **Comparative Analysis**: Compare metrics across different site sections