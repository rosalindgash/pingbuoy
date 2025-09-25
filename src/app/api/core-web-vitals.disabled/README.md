# Core Web Vitals Route - DISABLED

## ⚠️ Important Notice

The `/api/core-web-vitals` Vercel route has been **DISABLED** and replaced with a Supabase Edge Function.

### Why This Change?

1. **Better Security**: Edge Function validates `Authorization: Bearer ${SERVICE_JWT_SECRET}` header
2. **Proper CORS**: Uses centralized CORS configuration that allows your UI origins
3. **Service Role Access**: Direct database access with service role for better performance
4. **Consistency**: All API functions now run in Supabase infrastructure

### New Implementation

**Edge Function Location**: `supabase/functions/core-web-vitals/`

**Authentication**: Requires `SERVICE_JWT_SECRET` in Authorization header:
```javascript
fetch('https://YOUR-PROJECT-REF.supabase.co/functions/v1/core-web-vitals', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SERVICE_JWT_SECRET}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    metric: 'LCP',
    value: 1250,
    url: 'https://pingbuoy.com/dashboard',
    timestamp: Date.now()
  })
})
```

**Supported Metrics**:
- `LCP` (Largest Contentful Paint)
- `CLS` (Cumulative Layout Shift)
- `INP` (Interaction to Next Paint)
- `FID` (First Input Delay)
- `FCP` (First Contentful Paint)
- `TTFB` (Time to First Byte)

**Domain Validation**: Only accepts metrics from allowed domains (your UI origins)

**Database**: Uses the existing `core_web_vitals` table with service role access

### Migration Required

Update your client-side code to:
1. Use the new Edge Function endpoint
2. Include `Authorization: Bearer ${SERVICE_JWT_SECRET}` header
3. Handle proper error responses

### Rollback Plan

To rollback to Vercel route:
1. Rename this directory back to `core-web-vitals`
2. Update client code to use `/api/core-web-vitals` endpoint
3. Remove `SERVICE_JWT_SECRET` header requirement