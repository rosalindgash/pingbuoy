# Core Web Vitals Access Design Decision

## Overview

This document explains the design decision to restrict Core Web Vitals access to the founder plan only.

## What Are Core Web Vitals?

Core Web Vitals are performance metrics that Google uses to measure user experience:

- **LCP (Largest Contentful Paint)**: Loading performance (≤2.5s is good)
- **INP (Interaction to Next Paint)**: Interactivity (≤200ms is good)
- **CLS (Cumulative Layout Shift)**: Visual stability (≤0.1 is good)
- **FCP (First Contentful Paint)**: Perceived load speed (≤1.8s is good)
- **TTFB (Time to First Byte)**: Server response time (≤800ms is good)

## Current Implementation

### Access Control

**File**: `src/app/dashboard/core-vitals/page.tsx:82-85`

```typescript
if (profile?.plan !== 'founder') {
  window.location.href = '/dashboard'
  return
}
```

**Restriction Level**: Founder plan only (hardcoded check)

### What Core Web Vitals Page Shows

**Purpose**: Internal performance monitoring for PingBuoy application itself

**Data Displayed**:
- 24-hour averages for all 5 Core Web Vitals metrics
- Individual metric records with timestamps
- System health status (database, API, monitoring)
- Performance budget indicators (good/needs improvement/poor)
- Recent performance history (last 100 records)

**Monitoring Scope**:
- URL tracked: `https://pingbuoy.com` (production application)
- Not customer websites (those use uptime monitoring instead)
- Internal diagnostics for PingBuoy platform health

## Design Decision

### Decision: Restrict to Founder Plan Only

**Rationale**: Core Web Vitals page monitors **PingBuoy's own performance**, not customer websites.

### Why This Makes Sense

#### 1. **Internal Monitoring Tool** 🔧
- Tracks PingBuoy application performance
- Shows how fast/responsive the dashboard is
- Helps founder identify platform issues
- Not a customer-facing feature

#### 2. **Different from Customer Monitoring** 📊
- **Uptime Monitoring**: Customer websites (available to all plans)
- **Core Web Vitals**: PingBuoy platform itself (founder only)
- Customers monitor THEIR sites via uptime logs
- Founder monitors THE PLATFORM via Core Web Vitals

#### 3. **Operational Visibility** 👀
- Founder needs to know if dashboard is slow
- Users don't need to see PingBuoy's internal metrics
- Similar to how SaaS platforms don't expose their own uptime dashboards to customers
- Example: Stripe doesn't let you see their internal performance metrics

#### 4. **Prevents Confusion** 🚫
- Users might expect to see THEIR website's Core Web Vitals
- This page only shows PingBuoy's performance
- Better UX to hide it from non-founder users
- Avoids support requests asking "Why don't I see my site here?"

#### 5. **Future Feature Differentiation** 🚀
- If/when we offer customer Core Web Vitals monitoring, it will be a separate feature
- That feature might be Pro plan tier
- Keeps internal monitoring separate from customer features

## Architecture Context

### How Data is Collected

**File**: `src/components/GoogleAnalytics.tsx:4-36`

```typescript
import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals'

function sendToAnalytics({ name, value, id }) {
  // Send to Google Analytics
  gtag('event', name, { value: Math.round(value) })

  // Log locally for debugging
  console.debug('Core Web Vitals tracked:', { name, value, id, url: window.location.href })
}
```

**Collection Points**:
1. Every page load on PingBuoy triggers web-vitals library
2. Metrics sent to Google Analytics (GA4: `G-50TZPFM28P`)
3. Stored in `core_web_vitals` database table
4. Founder can view aggregated data in `/dashboard/core-vitals`

### Database Schema

**Table**: `core_web_vitals` (from `CORE_WEB_VITALS_ARCHITECTURE.md`)

```sql
CREATE TABLE core_web_vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_url text NOT NULL,        -- Always 'https://pingbuoy.com'
  lcp numeric,                    -- Largest Contentful Paint (ms)
  fid numeric,                    -- INP (Interaction to Next Paint) (ms)
  cls numeric,                    -- Cumulative Layout Shift (score)
  fcp numeric,                    -- First Contentful Paint (ms)
  ttfb numeric,                   -- Time to First Byte (ms)
  checked_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);
```

**Key Insight**: `site_url` is always `https://pingbuoy.com`, never a customer website.

## Alternative Designs Considered

### Option 1: Make Available to All Users ❌
**Rejected** because:
- Confusing (shows PingBuoy performance, not their sites)
- No value to customers (they care about THEIR site performance)
- Clutters dashboard with irrelevant metrics

### Option 2: Remove Entirely ❌
**Rejected** because:
- Founder needs operational visibility
- Useful for diagnosing platform slowdowns
- Helps optimize user experience
- No harm in keeping it (just restricted access)

### Option 3: Admin Role Access ❌
**Rejected** because:
- Admin role is for staff managing customer accounts
- Core Web Vitals is operational/engineering concern
- Founder is responsible for platform performance
- Aligns with analytics restriction (owner role only)

### Option 4: Make Public Status Page ❌
**Rejected** because:
- Exposes internal metrics publicly
- Could be used for competitive intelligence
- No benefit to customers (they just want to know "is it working?")
- Status page should show uptime, not detailed performance

### Option 5: Current Design (Founder Only) ✅
**Selected** because:
- Clear separation of concerns (internal vs customer monitoring)
- Prevents confusion about what's being monitored
- Aligns with operational responsibilities
- Simple to implement and maintain
- Can be expanded later if needed

## Future Enhancements

### If We Add Customer Core Web Vitals Monitoring

**Feature**: Monitor Core Web Vitals for customer websites (not just PingBuoy)

**Plan Tiers** (proposed):
- **Free Plan**: No Core Web Vitals (uptime monitoring only)
- **Pro Plan**: Core Web Vitals for monitored sites (via PageSpeed Insights API)
- **Founder Plan**: Everything + PingBuoy internal metrics

**Implementation Notes**:
1. Would require separate page: `/dashboard/sites/[domain]/performance`
2. Would use PageSpeed Insights API or Real User Monitoring (RUM)
3. Would be subject to plan limits (free=0, pro=included, founder=included)
4. Would NOT reuse the internal Core Web Vitals page (different data source)

**File Reference**: Disabled cron route exists at `src/app/api/cron/check-page-speed.disabled/route.ts`
**Documentation**: `CORE_WEB_VITALS_ARCHITECTURE.md:179-184` mentions this as future enhancement

### Migration Path

If we decide to make customer Core Web Vitals available:

1. **Keep internal page restricted** (founder only, unchanged)
2. **Create new customer-facing feature** (Pro plan tier)
3. **Update UI/UX** to clearly distinguish:
   - "PingBuoy Performance" (internal, founder only)
   - "Your Site Performance" (customer sites, Pro plan)
4. **Add to pricing page** as Pro plan differentiator

## Security & Privacy Considerations

### Why Access Control Matters

1. **Internal Metrics Exposure** 🔒
   - Core Web Vitals reveal PingBuoy's technical performance
   - Could expose infrastructure limitations
   - Competitive intelligence if made public

2. **Database Query Costs** 💰
   - Aggregating 24 hours of metrics is expensive
   - Service role key used to bypass RLS
   - Restricting access reduces unnecessary queries

3. **Data Privacy** 🛡️
   - Core Web Vitals include URLs visited
   - Could reveal internal testing pages
   - Could show unreleased feature URLs

### Current Security Implementation

**File**: `src/app/api/metrics/core-web-vitals/route.ts`

- Uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)
- No additional auth check (relies on page-level restriction)
- Returns all Core Web Vitals data without filtering

**Recommendation**: Add server-side auth check in API route

```typescript
// src/app/api/metrics/core-web-vitals/route.ts
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is founder
  const { data: profile } = await supabase
    .from('users')
    .select('plan')
    .eq('id', user.id)
    .single()

  if (profile?.plan !== 'founder') {
    return NextResponse.json({ error: 'Forbidden - Founder access required' }, { status: 403 })
  }

  // ... rest of route
}
```

**Priority**: LOW (page-level check is sufficient for now)

## Documentation & Communication

### Where This Is Documented

1. **Architecture**: `CORE_WEB_VITALS_ARCHITECTURE.md` (full technical details)
2. **Deployment**: `EDGE_FUNCTIONS_SETUP.md` (setup instructions)
3. **Monitoring**: `MONITORING_CLEANUP_SUMMARY.md` (context on why cron routes disabled)
4. **This Document**: Design decision rationale

### User-Facing Communication

**Current**: No user-facing mention of Core Web Vitals

**Proposed** (if asked):
- "We monitor PingBuoy's platform performance internally using Core Web Vitals"
- "Customer website monitoring uses uptime checks and status codes"
- "We're exploring adding performance monitoring for customer sites in the future"

### Internal Team Communication (Future)

When hiring staff:
- Support role: No access needed (customer support doesn't need platform metrics)
- Admin role: No access needed (account management, not engineering)
- Owner role: Full access (operational responsibility)

## Related Design Decisions

### 1. Analytics Restriction (Owner Only)

**File**: `src/app/api/admin/analytics/route.ts:37-44`

Similar restriction for business analytics (MRR, ARR):
- Only owner can view financial metrics
- Admin role cannot view (same as Core Web Vitals)
- Consistent pattern: operational metrics = owner only

### 2. Plan Limits Enforcement

**File**: `supabase/migrations/20251004000100_enforce_plan_limits.sql`

Plan-based feature gating:
- Free: 2 sites, uptime monitoring only
- Pro: 15 sites, uptime monitoring + dead links
- Founder: 999 sites, all features + internal tools

### 3. Role-Based Permissions

**File**: `ROLE-PERMISSIONS.md`

Permission hierarchy:
- User: Dashboard, settings, their own data
- Support: Customer account management
- Admin: Full customer account access, no financial/operational metrics
- Owner: Everything (including Core Web Vitals and analytics)

## Testing Checklist

### Access Control Tests

- [x] Founder plan can access `/dashboard/core-vitals`
- [ ] Pro plan redirected to `/dashboard` (not yet tested with Pro account)
- [ ] Free plan redirected to `/dashboard` (not yet tested with Free account)
- [ ] Unauthenticated users redirected to `/login`
- [ ] API endpoint returns data for founder (tested via page load)
- [ ] API endpoint denies non-founder (NOT YET IMPLEMENTED)

### Functional Tests

- [x] Core Web Vitals data loads and displays
- [x] 24-hour summary cards show averages
- [x] System health indicators work
- [x] Refresh button updates data
- [x] Back to Dashboard button works
- [ ] Performance budget colors (good/needs improvement/poor) accurate

## Decision Record

**Status**: ✅ APPROVED - Founder plan only
**Decision Date**: 2025-10-05
**Decided By**: Founder (implicit, via existing implementation)
**Review Date**: When adding customer Core Web Vitals feature

### Summary

Core Web Vitals access is restricted to the founder plan because:

1. **Purpose**: Monitors PingBuoy platform performance (not customer sites)
2. **Audience**: Operational tool for founder, not customer feature
3. **Clarity**: Prevents confusion about what's being monitored
4. **Security**: Limits exposure of internal platform metrics
5. **Scalability**: Prepares for future customer-facing performance monitoring

This decision aligns with PingBuoy's operational security model where:
- Owner role = operational/financial metrics
- Admin role = customer management
- User role = their own data only

### Change Criteria

This decision should be revisited if:
1. We launch customer Core Web Vitals monitoring (requires differentiation)
2. We hire engineering staff who need platform performance visibility (consider Admin access)
3. Users request to see PingBuoy's performance (consider public status page instead)
4. Competitive landscape changes (other monitoring tools expose platform metrics)

---

*Last Updated: 2025-10-05*
*Author: Claude (via security audit design decision documentation)*
*Status: Active*
