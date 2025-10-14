-- Enable RLS on service-only tables to satisfy Supabase linter
-- These tables are only accessed via service role, which bypasses RLS
-- We enable RLS with no permissive policies to block all direct API access
-- Service role authentication still works because it bypasses RLS entirely

DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'ENABLING RLS ON SERVICE-ONLY TABLES';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Reason: Supabase linter requires RLS enabled on all public tables';
    RAISE NOTICE 'Service role bypasses RLS, so this does not affect API routes';
    RAISE NOTICE '==========================================';

    -- Enable RLS on service-only analytics tables
    ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '  ✓ Enabled RLS: webhook_events';

    ALTER TABLE public.events_subscriptions ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '  ✓ Enabled RLS: events_subscriptions';

    ALTER TABLE public.analytics_audit_log ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '  ✓ Enabled RLS: analytics_audit_log';

    ALTER TABLE public.facts_daily ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '  ✓ Enabled RLS: facts_daily';

    -- Internal monitoring table
    ALTER TABLE public.core_web_vitals ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '  ✓ Enabled RLS: core_web_vitals';

    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Service-only tables: RLS enabled with no policies';
    RAISE NOTICE 'All user access blocked, service role bypasses RLS';
    RAISE NOTICE '==========================================';
END $$;

-- ========================================
-- VERIFICATION
-- ========================================

DO $$
DECLARE
    table_record RECORD;
    rls_disabled_count INTEGER := 0;
    rls_no_policies_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'VERIFICATION: RLS STATUS';
    RAISE NOTICE '==========================================';

    -- Check for tables with RLS disabled in public schema
    SELECT COUNT(*) INTO rls_disabled_count
    FROM pg_tables
    WHERE schemaname = 'public'
    AND rowsecurity = false;

    -- Check for tables with RLS enabled but no policies (service-only tables)
    SELECT COUNT(*) INTO rls_no_policies_count
    FROM pg_tables t
    WHERE t.schemaname = 'public'
    AND t.rowsecurity = true
    AND t.tablename IN ('webhook_events', 'events_subscriptions', 'analytics_audit_log', 'facts_daily', 'core_web_vitals')
    AND NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = t.schemaname
        AND p.tablename = t.tablename
    );

    RAISE NOTICE '';
    RAISE NOTICE 'Service-only tables status:';
    FOR table_record IN
        SELECT tablename, rowsecurity
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN ('webhook_events', 'events_subscriptions', 'analytics_audit_log', 'facts_daily', 'core_web_vitals')
        ORDER BY tablename
    LOOP
        RAISE NOTICE '  • %: RLS = %', table_record.tablename, table_record.rowsecurity;
    END LOOP;

    RAISE NOTICE '';
    IF rls_no_policies_count = 5 THEN
        RAISE NOTICE '✅ SUCCESS: All 5 service-only tables have RLS enabled with no policies';
        RAISE NOTICE '✅ Service role bypasses RLS and can still access these tables';
        RAISE NOTICE '✅ Direct API access blocked for users (no permissive policies)';
    ELSE
        RAISE WARNING 'Expected 5 service-only tables with RLS but no policies, found %', rls_no_policies_count;
    END IF;

    RAISE NOTICE '==========================================';
END $$;

-- ========================================
-- DOCUMENTATION
-- ========================================

COMMENT ON TABLE public.webhook_events IS 'Service-only: Raw Stripe webhooks. RLS enabled with no policies. Only accessible via service role.';
COMMENT ON TABLE public.events_subscriptions IS 'Service-only: Subscription events. RLS enabled with no policies. Only accessible via service role.';
COMMENT ON TABLE public.analytics_audit_log IS 'Service-only: Analytics audit trail. RLS enabled with no policies. Only accessible via service role.';
COMMENT ON TABLE public.facts_daily IS 'Service-only: Daily metrics. RLS enabled with no policies. Only accessible via service role.';
COMMENT ON TABLE public.core_web_vitals IS 'Service-only: Internal monitoring. RLS enabled with no policies. Only accessible via service role.';
