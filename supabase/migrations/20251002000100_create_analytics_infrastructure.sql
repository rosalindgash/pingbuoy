-- Analytics Infrastructure: Practical & Robust Data Model
-- Immutable events + recomputed daily facts

-- =====================================================
-- 1. EVENTS_SUBSCRIPTIONS (Immutable, Append-Only)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.events_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Idempotency & audit
    stripe_event_id TEXT NOT NULL UNIQUE,
    occurred_at_utc TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Core identifiers
    customer_id TEXT NOT NULL,
    subscription_id TEXT NOT NULL,
    plan_id TEXT,

    -- Money (all in cents for precision)
    currency TEXT NOT NULL DEFAULT 'usd',
    amount_recurring_cents BIGINT, -- Current recurring amount (normalized to monthly)
    amount_change_cents BIGINT, -- Delta from previous state

    -- Event classification
    event_type TEXT NOT NULL CHECK (event_type IN (
        'created', 'upgraded', 'downgraded', 'canceled', 'paused', 'resumed',
        'invoice_paid', 'payment_failed', 'refunded', 'trial_started', 'trial_converted'
    )),

    -- Metadata
    raw_json JSONB NOT NULL, -- Full Stripe payload for debugging
    processed BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS events_subscriptions_occurred_at_idx ON public.events_subscriptions(occurred_at_utc DESC);
CREATE INDEX IF NOT EXISTS events_subscriptions_customer_idx ON public.events_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS events_subscriptions_subscription_idx ON public.events_subscriptions(subscription_id);
CREATE INDEX IF NOT EXISTS events_subscriptions_event_type_idx ON public.events_subscriptions(event_type, occurred_at_utc DESC);
CREATE INDEX IF NOT EXISTS events_subscriptions_stripe_event_idx ON public.events_subscriptions(stripe_event_id);

COMMENT ON TABLE public.events_subscriptions IS 'Immutable append-only event store for all subscription lifecycle events';
COMMENT ON COLUMN public.events_subscriptions.amount_recurring_cents IS 'Normalized monthly recurring amount in cents';
COMMENT ON COLUMN public.events_subscriptions.amount_change_cents IS 'Change in MRR from previous state (expansion/contraction)';

-- =====================================================
-- 2. FACTS_DAILY (Recomputed Nightly + On Webhook)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.facts_daily (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    day DATE NOT NULL UNIQUE,

    -- Revenue metrics (all in cents, normalized to USD)
    mrr_cents_normalized BIGINT DEFAULT 0 CHECK (mrr_cents_normalized >= 0),
    arr_cents BIGINT DEFAULT 0 CHECK (arr_cents >= 0),

    -- MRR movement
    new_mrr_cents BIGINT DEFAULT 0,
    expansion_mrr_cents BIGINT DEFAULT 0,
    contraction_mrr_cents BIGINT DEFAULT 0,
    churned_mrr_cents BIGINT DEFAULT 0,
    reactivation_mrr_cents BIGINT DEFAULT 0,

    -- Subscriber counts
    active_subscribers INTEGER DEFAULT 0,
    new_customers INTEGER DEFAULT 0,
    churned_customers INTEGER DEFAULT 0,

    -- ARPU
    arpu_cents BIGINT DEFAULT 0,

    -- Dunning & failed payments
    past_due_subscribers INTEGER DEFAULT 0,
    failed_payments INTEGER DEFAULT 0,
    recovered_payments INTEGER DEFAULT 0,

    -- Trials
    trial_starts INTEGER DEFAULT 0,
    trial_conversions INTEGER DEFAULT 0,
    trial_active INTEGER DEFAULT 0,

    -- Per-plan metrics (Pro plan example)
    mrr_plan_pro_cents BIGINT DEFAULT 0,
    subs_plan_pro INTEGER DEFAULT 0,
    arpu_plan_pro_cents BIGINT DEFAULT 0,

    -- Per-plan metrics (Free plan)
    mrr_plan_free_cents BIGINT DEFAULT 0,
    subs_plan_free INTEGER DEFAULT 0,
    arpu_plan_free_cents BIGINT DEFAULT 0,

    -- Per-plan metrics (Founder plan)
    mrr_plan_founder_cents BIGINT DEFAULT 0,
    subs_plan_founder INTEGER DEFAULT 0,
    arpu_plan_founder_cents BIGINT DEFAULT 0,

    -- Refunds
    refunded_mrr_cents BIGINT DEFAULT 0,

    -- Data quality & audit
    last_computed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    backfilled BOOLEAN DEFAULT false,
    data_quality_check_passed BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS facts_daily_day_idx ON public.facts_daily(day DESC);
CREATE INDEX IF NOT EXISTS facts_daily_mrr_idx ON public.facts_daily(mrr_cents_normalized DESC);

COMMENT ON TABLE public.facts_daily IS 'Pre-computed daily metrics aggregated from events_subscriptions. Recomputed nightly with backfill.';
COMMENT ON COLUMN public.facts_daily.mrr_cents_normalized IS 'Total MRR normalized to monthly in USD cents';
COMMENT ON COLUMN public.facts_daily.backfilled IS 'True if this day was backfilled to correct late webhooks';

-- =====================================================
-- 3. WEBHOOK_EVENTS (Raw Stripe Webhooks - For Replay)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS webhook_events_event_type_idx ON public.webhook_events(event_type);
CREATE INDEX IF NOT EXISTS webhook_events_processed_idx ON public.webhook_events(processed, created_at DESC);

COMMENT ON TABLE public.webhook_events IS 'Raw Stripe webhook storage for idempotency and replay';

-- =====================================================
-- 4. ANALYTICS_AUDIT_LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS public.analytics_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_email TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('view', 'export', 'api_access')),
    resource TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS analytics_audit_log_user_id_idx ON public.analytics_audit_log(user_id);
CREATE INDEX IF NOT EXISTS analytics_audit_log_created_at_idx ON public.analytics_audit_log(created_at DESC);

COMMENT ON TABLE public.analytics_audit_log IS 'Audit trail for analytics access (who viewed/exported when)';

-- =====================================================
-- 5. CHART_ANNOTATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.chart_annotations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    annotation_date DATE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('launch', 'pricing_change', 'feature', 'marketing', 'other')),
    color TEXT DEFAULT '#3B82F6',
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS chart_annotations_date_idx ON public.chart_annotations(annotation_date DESC);

COMMENT ON TABLE public.chart_annotations IS 'Vertical markers on charts for launches, pricing changes, etc.';

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Normalize annual to monthly (in cents)
CREATE OR REPLACE FUNCTION normalize_to_monthly_cents(
    amount_cents BIGINT,
    billing_interval TEXT
) RETURNS BIGINT AS $$
BEGIN
    IF billing_interval = 'year' THEN
        RETURN amount_cents / 12;
    ELSE
        RETURN amount_cents;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Data quality check: Ensure MRR >= 0
CREATE OR REPLACE FUNCTION check_daily_metrics_quality(check_date DATE)
RETURNS BOOLEAN AS $$
DECLARE
    daily_record RECORD;
    is_valid BOOLEAN := true;
BEGIN
    SELECT * INTO daily_record FROM public.facts_daily WHERE day = check_date;

    IF daily_record IS NULL THEN
        RETURN false;
    END IF;

    -- Check: MRR should be >= 0
    IF daily_record.mrr_cents_normalized < 0 THEN
        RAISE WARNING 'Data quality issue: MRR < 0 on %', check_date;
        is_valid := false;
    END IF;

    -- Check: Active subscribers should be >= 0
    IF daily_record.active_subscribers < 0 THEN
        RAISE WARNING 'Data quality issue: Active subscribers < 0 on %', check_date;
        is_valid := false;
    END IF;

    -- Check: ARPU calculation
    IF daily_record.active_subscribers > 0 THEN
        IF daily_record.arpu_cents != (daily_record.mrr_cents_normalized / daily_record.active_subscribers) THEN
            RAISE WARNING 'Data quality issue: ARPU mismatch on %', check_date;
            is_valid := false;
        END IF;
    END IF;

    RETURN is_valid;
END;
$$ LANGUAGE plpgsql;

-- Recompute daily facts from events
CREATE OR REPLACE FUNCTION recompute_daily_facts(target_date DATE)
RETURNS VOID AS $$
DECLARE
    start_of_day TIMESTAMP WITH TIME ZONE;
    end_of_day TIMESTAMP WITH TIME ZONE;
    current_mrr BIGINT := 0;
    new_mrr BIGINT := 0;
    expansion_mrr BIGINT := 0;
    contraction_mrr BIGINT := 0;
    churned_mrr BIGINT := 0;
    active_subs INTEGER := 0;
    new_customers INTEGER := 0;
    churned_customers INTEGER := 0;
BEGIN
    -- Set timezone boundaries (America/Chicago)
    start_of_day := (target_date::TIMESTAMP AT TIME ZONE 'America/Chicago') AT TIME ZONE 'UTC';
    end_of_day := start_of_day + INTERVAL '1 day';

    -- Calculate MRR from events
    SELECT
        COALESCE(SUM(CASE WHEN event_type = 'created' THEN amount_recurring_cents ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN event_type = 'upgraded' THEN amount_change_cents ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN event_type = 'downgraded' THEN ABS(amount_change_cents) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN event_type = 'canceled' THEN amount_recurring_cents ELSE 0 END), 0),
        COUNT(DISTINCT CASE WHEN event_type = 'created' THEN customer_id END),
        COUNT(DISTINCT CASE WHEN event_type = 'canceled' THEN customer_id END)
    INTO new_mrr, expansion_mrr, contraction_mrr, churned_mrr, new_customers, churned_customers
    FROM public.events_subscriptions
    WHERE occurred_at_utc >= start_of_day AND occurred_at_utc < end_of_day;

    -- Get current MRR (sum of all active subscriptions as of end of day)
    -- This is simplified - in production you'd query actual subscription state
    current_mrr := new_mrr + expansion_mrr - contraction_mrr - churned_mrr;

    -- Upsert into facts_daily
    INSERT INTO public.facts_daily (
        day,
        mrr_cents_normalized,
        arr_cents,
        new_mrr_cents,
        expansion_mrr_cents,
        contraction_mrr_cents,
        churned_mrr_cents,
        new_customers,
        churned_customers,
        active_subscribers,
        arpu_cents,
        backfilled,
        last_computed_at
    ) VALUES (
        target_date,
        current_mrr,
        current_mrr * 12,
        new_mrr,
        expansion_mrr,
        contraction_mrr,
        churned_mrr,
        new_customers,
        churned_customers,
        active_subs,
        CASE WHEN active_subs > 0 THEN current_mrr / active_subs ELSE 0 END,
        true,
        TIMEZONE('utc'::text, NOW())
    )
    ON CONFLICT (day) DO UPDATE SET
        mrr_cents_normalized = EXCLUDED.mrr_cents_normalized,
        arr_cents = EXCLUDED.arr_cents,
        new_mrr_cents = EXCLUDED.new_mrr_cents,
        expansion_mrr_cents = EXCLUDED.expansion_mrr_cents,
        contraction_mrr_cents = EXCLUDED.contraction_mrr_cents,
        churned_mrr_cents = EXCLUDED.churned_mrr_cents,
        new_customers = EXCLUDED.new_customers,
        churned_customers = EXCLUDED.churned_customers,
        backfilled = true,
        last_computed_at = TIMEZONE('utc'::text, NOW());

    -- Run data quality check
    PERFORM check_daily_metrics_quality(target_date);
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_facts_daily_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER facts_daily_updated_at
    BEFORE UPDATE ON public.facts_daily
    FOR EACH ROW
    EXECUTE FUNCTION update_facts_daily_updated_at();

-- =====================================================
-- 7. RLS POLICIES
-- =====================================================

ALTER TABLE public.events_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facts_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_annotations ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.events_subscriptions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.facts_daily FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.webhook_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.analytics_audit_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.chart_annotations FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 8. GRANTS
-- =====================================================

GRANT ALL ON public.events_subscriptions TO authenticated;
GRANT ALL ON public.facts_daily TO authenticated;
GRANT ALL ON public.webhook_events TO authenticated;
GRANT ALL ON public.analytics_audit_log TO authenticated;
GRANT ALL ON public.chart_annotations TO authenticated;
