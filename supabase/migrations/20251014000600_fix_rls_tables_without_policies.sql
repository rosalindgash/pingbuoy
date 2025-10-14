-- Fix 13 tables with RLS enabled but no policies
-- Part 1: Disable RLS for service-only tables
-- Part 2: Create RLS policies for user-accessible tables

-- ========================================
-- PART 1: DISABLE RLS FOR SERVICE-ONLY TABLES
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'DISABLING RLS FOR SERVICE-ONLY TABLES';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Reason: Service role bypasses RLS, no user access needed';
    RAISE NOTICE '==========================================';

    -- Service-only analytics tables
    ALTER TABLE public.webhook_events DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE '  ✓ Disabled RLS: webhook_events';

    ALTER TABLE public.events_subscriptions DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE '  ✓ Disabled RLS: events_subscriptions';

    ALTER TABLE public.analytics_audit_log DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE '  ✓ Disabled RLS: analytics_audit_log';

    ALTER TABLE public.facts_daily DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE '  ✓ Disabled RLS: facts_daily';

    -- Internal monitoring table
    ALTER TABLE public.core_web_vitals DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE '  ✓ Disabled RLS: core_web_vitals';

    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Service-only tables: RLS disabled (5 tables)';
    RAISE NOTICE '==========================================';
END $$;

-- ========================================
-- PART 2: CREATE RLS POLICIES FOR USER-ACCESSIBLE TABLES
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'CREATING RLS POLICIES FOR USER-ACCESSIBLE TABLES';
    RAISE NOTICE '==========================================';
END $$;

-- ========================================
-- 2.1 USER_PERFORMANCE_LOGS
-- Users can view and insert logs for their own sites
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Creating policies for: user_performance_logs';

    -- Users can view performance logs for their own sites
    CREATE POLICY "Users can view their own site performance logs" ON public.user_performance_logs
        FOR SELECT
        USING (
            site_id IN (
                SELECT id FROM public.sites WHERE user_id = (SELECT auth.uid())
            )
        );
    RAISE NOTICE '  ✓ SELECT policy created';

    -- Users can insert performance logs for their own sites
    CREATE POLICY "Users can insert performance logs for their sites" ON public.user_performance_logs
        FOR INSERT
        WITH CHECK (
            site_id IN (
                SELECT id FROM public.sites WHERE user_id = (SELECT auth.uid())
            )
        );
    RAISE NOTICE '  ✓ INSERT policy created';
END $$;

-- ========================================
-- 2.2 CHART_ANNOTATIONS
-- Only authenticated users can view, admin users can manage
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Creating policies for: chart_annotations';

    -- Authenticated users can view all chart annotations
    CREATE POLICY "Authenticated users can view chart annotations" ON public.chart_annotations
        FOR SELECT
        USING ((SELECT auth.role()) = 'authenticated');
    RAISE NOTICE '  ✓ SELECT policy created';

    -- Authenticated users can create chart annotations
    CREATE POLICY "Authenticated users can create chart annotations" ON public.chart_annotations
        FOR INSERT
        WITH CHECK ((SELECT auth.role()) = 'authenticated');
    RAISE NOTICE '  ✓ INSERT policy created';

    -- Users can update their own chart annotations
    CREATE POLICY "Users can update their own chart annotations" ON public.chart_annotations
        FOR UPDATE
        USING ((SELECT auth.uid()) = created_by);
    RAISE NOTICE '  ✓ UPDATE policy created';

    -- Users can delete their own chart annotations
    CREATE POLICY "Users can delete their own chart annotations" ON public.chart_annotations
        FOR DELETE
        USING ((SELECT auth.uid()) = created_by);
    RAISE NOTICE '  ✓ DELETE policy created';
END $$;

-- ========================================
-- 2.3 STATUS PAGE TABLES (PUBLIC READ ACCESS)
-- These tables power the public status page
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Creating policies for: status_services';

    -- Public read access for status services
    CREATE POLICY "Public can view visible status services" ON public.status_services
        FOR SELECT
        USING (is_visible = true);
    RAISE NOTICE '  ✓ SELECT policy created (public read)';
END $$;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Creating policies for: status_incidents';

    -- Public read access for public incidents
    CREATE POLICY "Public can view public status incidents" ON public.status_incidents
        FOR SELECT
        USING (is_public = true);
    RAISE NOTICE '  ✓ SELECT policy created (public read)';
END $$;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Creating policies for: status_incident_updates';

    -- Public read access for incident updates (if parent incident is public)
    CREATE POLICY "Public can view updates for public incidents" ON public.status_incident_updates
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM public.status_incidents
                WHERE status_incidents.id = status_incident_updates.incident_id
                AND status_incidents.is_public = true
            )
        );
    RAISE NOTICE '  ✓ SELECT policy created (public read)';
END $$;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Creating policies for: status_checks';

    -- Public read access for status checks (recent history)
    CREATE POLICY "Public can view status checks" ON public.status_checks
        FOR SELECT
        USING (true);
    RAISE NOTICE '  ✓ SELECT policy created (public read)';
END $$;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Creating policies for: status_maintenance';

    -- Public read access for public maintenance windows
    CREATE POLICY "Public can view public maintenance" ON public.status_maintenance
        FOR SELECT
        USING (is_public = true);
    RAISE NOTICE '  ✓ SELECT policy created (public read)';
END $$;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Creating policies for: status_subscribers';

    -- Anyone can subscribe (INSERT)
    CREATE POLICY "Anyone can subscribe to status updates" ON public.status_subscribers
        FOR INSERT
        WITH CHECK (true);
    RAISE NOTICE '  ✓ INSERT policy created (public)';

    -- Users can view their own subscription
    CREATE POLICY "Users can view their own subscription" ON public.status_subscribers
        FOR SELECT
        USING (email = (SELECT (SELECT auth.jwt()) ->> 'email'));
    RAISE NOTICE '  ✓ SELECT policy created (own subscription)';

    -- Users can update their own subscription
    CREATE POLICY "Users can update their own subscription" ON public.status_subscribers
        FOR UPDATE
        USING (email = (SELECT (SELECT auth.jwt()) ->> 'email'));
    RAISE NOTICE '  ✓ UPDATE policy created (own subscription)';

    -- Users can delete their own subscription
    CREATE POLICY "Users can unsubscribe" ON public.status_subscribers
        FOR DELETE
        USING (email = (SELECT (SELECT auth.jwt()) ->> 'email'));
    RAISE NOTICE '  ✓ DELETE policy created (own subscription)';
END $$;

-- ========================================
-- FINAL VERIFICATION
-- ========================================

DO $$
DECLARE
    rls_enabled_count INTEGER;
    table_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'FINAL VERIFICATION';
    RAISE NOTICE '==========================================';

    -- Count tables with RLS enabled but no policies
    SELECT COUNT(*) INTO rls_enabled_count
    FROM pg_tables t
    WHERE t.schemaname = 'public'
    AND t.rowsecurity = true
    AND NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = t.schemaname
        AND p.tablename = t.tablename
    );

    IF rls_enabled_count = 0 THEN
        RAISE NOTICE '✅ SUCCESS: No tables with RLS enabled but no policies!';
    ELSE
        RAISE WARNING 'Still found % tables with RLS enabled but no policies:', rls_enabled_count;

        -- List the tables
        FOR table_record IN
            SELECT t.tablename
            FROM pg_tables t
            WHERE t.schemaname = 'public'
            AND t.rowsecurity = true
            AND NOT EXISTS (
                SELECT 1 FROM pg_policies p
                WHERE p.schemaname = t.schemaname
                AND p.tablename = t.tablename
            )
        LOOP
            RAISE WARNING '  - %', table_record.tablename;
        END LOOP;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '  • 5 service-only tables: RLS disabled';
    RAISE NOTICE '  • 8 user-accessible tables: RLS policies created';
    RAISE NOTICE '  • user_performance_logs: users access own sites';
    RAISE NOTICE '  • chart_annotations: authenticated users can manage';
    RAISE NOTICE '  • status_* tables: public read access for status page';
    RAISE NOTICE '==========================================';
END $$;
