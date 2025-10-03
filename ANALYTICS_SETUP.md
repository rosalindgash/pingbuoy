# Analytics System Setup Guide

## 🎯 Overview

PingBuoy now has a production-ready analytics system with:
- **Accurate MRR/ARR tracking** (annual plans normalized to monthly)
- **Churn metrics** (logo churn, gross churn, NRR)
- **Trial conversion tracking**
- **Plan-based revenue breakdown**
- **Automatic nightly backfill** for late webhooks
- **Data quality checks**
- **Audit logging** for all analytics access

## ✅ What's Already Done

### 1. Database Migrations ✓
- `events_subscriptions` - Immutable event log
- `facts_daily` - Pre-computed daily metrics
- `webhook_events` - Raw webhook storage
- `analytics_audit_log` - Access tracking
- `chart_annotations` - Product launch markers

### 2. Cron Jobs ✓
- **Nightly backfill** (2 AM CST) - Recomputes last 7 days
- **Quality checks** (3 AM CST) - Validates data integrity

### 3. API Endpoints ✓
- `/api/admin/analytics` - Main analytics dashboard
- `/api/webhooks/stripe-analytics` - Stripe webhook receiver

### 4. Dashboard ✓
- Accessible at: `/admin/analytics`
- Visible only to founder email: `rosalind@pingbuoy.com`

## 🔧 Required Setup Steps

### Step 1: Configure Stripe Webhook

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)

2. Click **"Add endpoint"**

3. Configure:
   - **Endpoint URL:** `https://staging.pingbuoy.com/api/webhooks/stripe-analytics`
   - **Description:** PingBuoy Analytics
   - **API Version:** Latest
   - **Events to listen to:**
     ```
     customer.subscription.created
     customer.subscription.updated
     customer.subscription.deleted
     customer.subscription.paused
     customer.subscription.resumed
     customer.subscription.trial_will_end
     invoice.paid
     invoice.payment_failed
     charge.refunded
     ```

4. Click **"Add endpoint"**

5. Copy the **Signing secret** (starts with `whsec_...`)

### Step 2: Add Webhook Secret

1. Open `.env.local`

2. Uncomment and add your webhook secret:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
   ```

3. Restart your dev server:
   ```bash
   npm run dev
   ```

### Step 3: Test Webhook (Optional)

Use Stripe CLI to test locally:

```bash
stripe listen --forward-to localhost:4000/api/webhooks/stripe-analytics
stripe trigger customer.subscription.created
```

## 📊 Accessing Analytics

### Option 1: Via Navigation
1. Log in as founder (`rosalind@pingbuoy.com`)
2. Click **"Analytics"** in the navigation menu

### Option 2: Direct URL
Navigate to: `http://localhost:4000/admin/analytics`

## 🔍 How It Works

### Data Flow

```
Stripe → Webhook → events_subscriptions (immutable)
                              ↓
                    Triggers recompute_daily_facts()
                              ↓
                       facts_daily (aggregates)
                              ↓
                     Analytics Dashboard API
                              ↓
                        React Dashboard UI
```

### MRR Calculation

1. **Normalization:**
   - Monthly plans: Amount as-is
   - Annual plans: Amount ÷ 12
   - All in cents for precision

2. **Exclusions:**
   - Setup fees (one-time charges)
   - Taxes
   - Credits/refunds (tracked separately)

3. **State Handling:**
   - `trialing` = 0 MRR (until first paid invoice)
   - `past_due` = Tracked separately (dunning bucket)
   - `cancel_at_period_end` = Keep MRR until period ends
   - `paused` = 0 MRR

### Event Classification

| Stripe Event | Our Classification | MRR Impact |
|-------------|-------------------|------------|
| `subscription.created` | `created` or `trial_started` | +New MRR |
| `subscription.updated` (upgrade) | `upgraded` | +Expansion MRR |
| `subscription.updated` (downgrade) | `downgraded` | -Contraction MRR |
| `subscription.deleted` | `canceled` | -Churned MRR |
| `invoice.paid` (first) | `trial_converted` | +New MRR |
| `invoice.payment_failed` | `payment_failed` | Past due bucket |
| `charge.refunded` | `refunded` | Tracked separately |

### Metrics Definitions

- **MRR** = Sum of all active subscription monthly amounts (normalized)
- **ARR** = MRR × 12
- **Net New MRR** = (New + Expansion) - (Churned + Contraction)
- **Logo Churn** = Canceled customers ÷ Total customers
- **Gross Churn** = Churned MRR ÷ Starting MRR
- **NRR (Net Revenue Retention)** = (Starting MRR - Churned - Contraction + Expansion) ÷ Starting MRR × 100
- **ARPU** = MRR ÷ Active subscribers
- **LTV** = ARPU × Average customer lifespan (12 months)
- **Trial Conversion** = Trials converted ÷ Trials started

## 🔄 Backfill & Maintenance

### Automatic (Already Setup)

- **Nightly backfill** runs at 2 AM CST
  - Recomputes last 7 days
  - Handles late webhooks
  - Fixes backdated invoices

- **Quality checks** run at 3 AM CST
  - Validates MRR ≥ 0
  - Checks ARPU calculations
  - Flags data issues

### Manual Backfill

To backfill a specific date:

```sql
SELECT recompute_daily_facts('2025-10-01');
```

To backfill last 30 days:

```sql
DO $$
DECLARE
    target_day DATE;
BEGIN
    FOR i IN 0..29 LOOP
        target_day := CURRENT_DATE - i;
        PERFORM recompute_daily_facts(target_day);
    END LOOP;
END $$;
```

## 📝 Audit Trail

Every analytics access is logged in `analytics_audit_log`:

- User ID & email
- Action (view, export, api_access)
- IP address
- User agent
- Timestamp

View logs:
```sql
SELECT * FROM analytics_audit_log
ORDER BY created_at DESC
LIMIT 100;
```

## 📌 Chart Annotations

Add markers for product launches, pricing changes:

```sql
INSERT INTO chart_annotations (
    annotation_date,
    title,
    description,
    type,
    color
) VALUES (
    '2025-10-15',
    'Launched Pro Plan v2',
    'New features: advanced monitoring, Slack integration',
    'launch',
    '#10B981'
);
```

Types: `launch`, `pricing_change`, `feature`, `marketing`, `other`

## 🐛 Troubleshooting

### Dashboard shows $0 for everything

**Cause:** No data in `facts_daily`

**Fix:**
1. Check if webhooks are configured
2. Run manual backfill for recent dates
3. Check `events_subscriptions` table for data

### Webhook failing with 401/403

**Cause:** Missing or incorrect webhook secret

**Fix:**
1. Verify `STRIPE_WEBHOOK_SECRET` in `.env.local`
2. Check webhook signing secret in Stripe dashboard
3. Restart dev server

### Data quality check failing

**Cause:** MRR calculation issue

**Fix:**
```sql
-- View failed checks
SELECT * FROM facts_daily
WHERE data_quality_check_passed = false;

-- Re-run quality check
SELECT check_daily_metrics_quality('2025-10-01');
```

### Cron jobs not running

**Cause:** pg_cron not enabled

**Fix:**
```sql
-- Check if jobs exist
SELECT * FROM cron.job;

-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Re-run migration
-- migrations/20251002000200_setup_analytics_cron.sql
```

## 🚀 Production Deployment

### Before Going Live

1. ✅ Update `.env.local` → `.env.production`
2. ✅ Switch Stripe webhook to production endpoint
3. ✅ Use production Stripe secret key
4. ✅ Update `NEXT_PUBLIC_SITE_URL` to production domain
5. ✅ Test webhook with `stripe trigger` in live mode
6. ✅ Run backfill for last 90 days
7. ✅ Verify cron jobs are running

### Production Webhook URL

```
https://pingbuoy.com/api/webhooks/stripe-analytics
```

### Monitoring

- Check `webhook_events` table for processing errors
- Monitor `analytics_audit_log` for access patterns
- Review `data_quality_check_passed` flags daily

## 📚 Additional Resources

- [Stripe Webhooks Docs](https://stripe.com/docs/webhooks)
- [pg_cron Documentation](https://github.com/citusdata/pg_cron)
- [Supabase Functions](https://supabase.com/docs/guides/database/functions)

## 🎉 You're All Set!

Your analytics system is now ready to track accurate SaaS metrics with:
- ✅ Idempotent webhook processing
- ✅ MRR normalization (annual → monthly)
- ✅ Automated backfills
- ✅ Data quality checks
- ✅ Audit logging
- ✅ Beautiful dashboard

Access at: **http://localhost:4000/admin/analytics**
