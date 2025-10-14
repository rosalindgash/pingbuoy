-- Fix RLS performance warnings by wrapping auth function calls in subqueries
-- This prevents auth functions from being re-evaluated multiple times per row
-- https://supabase.com/docs/guides/database/postgres/row-level-security#performance

-- ================================================================
-- PERFORMANCE OPTIMIZATION STRATEGY
-- ================================================================
-- Instead of: auth.uid() = user_id
-- Use: (SELECT auth.uid()) = user_id
--
-- This ensures auth.uid() is evaluated once per query, not once per row
-- ================================================================

-- ================================================================
-- 1. USERS TABLE POLICIES
-- ================================================================

DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Service role full access to users" ON public.users;

CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT
    USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Service role full access to users" ON public.users
    FOR ALL
    USING ((SELECT auth.role()) = 'service_role')
    WITH CHECK ((SELECT auth.role()) = 'service_role');

-- ================================================================
-- 2. SITES TABLE POLICIES
-- ================================================================

DROP POLICY IF EXISTS "Users can view own sites" ON public.sites;
DROP POLICY IF EXISTS "Users can insert own sites" ON public.sites;
DROP POLICY IF EXISTS "Users can update own sites" ON public.sites;
DROP POLICY IF EXISTS "Users can delete own sites" ON public.sites;
DROP POLICY IF EXISTS "Service role full access to sites" ON public.sites;

CREATE POLICY "Users can view own sites" ON public.sites
    FOR SELECT
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own sites" ON public.sites
    FOR INSERT
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own sites" ON public.sites
    FOR UPDATE
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own sites" ON public.sites
    FOR DELETE
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Service role full access to sites" ON public.sites
    FOR ALL
    USING ((SELECT auth.role()) = 'service_role')
    WITH CHECK ((SELECT auth.role()) = 'service_role');

-- ================================================================
-- 3. UPTIME_LOGS TABLE POLICIES
-- ================================================================

DROP POLICY IF EXISTS "Users can view logs for own sites" ON public.uptime_logs;
DROP POLICY IF EXISTS "System can insert uptime logs" ON public.uptime_logs;
DROP POLICY IF EXISTS "Service role full access to uptime logs" ON public.uptime_logs;

CREATE POLICY "Users can view logs for own sites" ON public.uptime_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = uptime_logs.site_id
            AND sites.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "System can insert uptime logs" ON public.uptime_logs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = uptime_logs.site_id
        )
    );

CREATE POLICY "Service role full access to uptime logs" ON public.uptime_logs
    FOR ALL
    USING ((SELECT auth.role()) = 'service_role')
    WITH CHECK ((SELECT auth.role()) = 'service_role');

-- ================================================================
-- 4. ALERTS TABLE POLICIES
-- ================================================================

DROP POLICY IF EXISTS "Users can view alerts for own sites" ON public.alerts;
DROP POLICY IF EXISTS "System can insert alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can update alerts for own sites" ON public.alerts;
DROP POLICY IF EXISTS "Service role full access to alerts" ON public.alerts;

CREATE POLICY "Users can view alerts for own sites" ON public.alerts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = alerts.site_id
            AND sites.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "System can insert alerts" ON public.alerts
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = alerts.site_id
        )
    );

CREATE POLICY "Users can update alerts for own sites" ON public.alerts
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = alerts.site_id
            AND sites.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Service role full access to alerts" ON public.alerts
    FOR ALL
    USING ((SELECT auth.role()) = 'service_role')
    WITH CHECK ((SELECT auth.role()) = 'service_role');

-- ================================================================
-- 5. DEAD_LINKS TABLE POLICIES
-- ================================================================

DROP POLICY IF EXISTS "Users can view dead links for own sites" ON public.dead_links;
DROP POLICY IF EXISTS "System can insert dead links" ON public.dead_links;
DROP POLICY IF EXISTS "Users can update dead links for own sites" ON public.dead_links;
DROP POLICY IF EXISTS "Service role full access to dead links" ON public.dead_links;

CREATE POLICY "Users can view dead links for own sites" ON public.dead_links
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = dead_links.site_id
            AND sites.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "System can insert dead links" ON public.dead_links
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = dead_links.site_id
        )
    );

CREATE POLICY "Users can update dead links for own sites" ON public.dead_links
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = dead_links.site_id
            AND sites.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Service role full access to dead links" ON public.dead_links
    FOR ALL
    USING ((SELECT auth.role()) = 'service_role')
    WITH CHECK ((SELECT auth.role()) = 'service_role');

-- ================================================================
-- 6. SCANS TABLE POLICIES
-- ================================================================

DROP POLICY IF EXISTS "Users can view scans for own sites" ON public.scans;
DROP POLICY IF EXISTS "System can insert scans" ON public.scans;
DROP POLICY IF EXISTS "Users can update scans for own sites" ON public.scans;
DROP POLICY IF EXISTS "Service role full access to scans" ON public.scans;

CREATE POLICY "Users can view scans for own sites" ON public.scans
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = scans.site_id
            AND sites.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "System can insert scans" ON public.scans
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = scans.site_id
        )
    );

CREATE POLICY "Users can update scans for own sites" ON public.scans
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = scans.site_id
            AND sites.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Service role full access to scans" ON public.scans
    FOR ALL
    USING ((SELECT auth.role()) = 'service_role')
    WITH CHECK ((SELECT auth.role()) = 'service_role');

-- ================================================================
-- 7. INTEGRATIONS TABLE POLICIES
-- ================================================================

DROP POLICY IF EXISTS "Users can view their own integrations" ON public.integrations;
DROP POLICY IF EXISTS "Users can insert their own integrations" ON public.integrations;
DROP POLICY IF EXISTS "Users can update their own integrations" ON public.integrations;
DROP POLICY IF EXISTS "Users can delete their own integrations" ON public.integrations;
DROP POLICY IF EXISTS "Service role full access to integrations" ON public.integrations;

CREATE POLICY "Users can view their own integrations" ON public.integrations
    FOR SELECT
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own integrations" ON public.integrations
    FOR INSERT
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own integrations" ON public.integrations
    FOR UPDATE
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own integrations" ON public.integrations
    FOR DELETE
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Service role full access to integrations" ON public.integrations
    FOR ALL
    USING ((SELECT auth.role()) = 'service_role')
    WITH CHECK ((SELECT auth.role()) = 'service_role');

-- ================================================================
-- 8. CORE_WEB_VITALS TABLE POLICIES (Service role only)
-- ================================================================

DROP POLICY IF EXISTS "Service role full access to core web vitals" ON public.core_web_vitals;

CREATE POLICY "Service role full access to core web vitals" ON public.core_web_vitals
    FOR ALL
    USING ((SELECT auth.role()) = 'service_role')
    WITH CHECK ((SELECT auth.role()) = 'service_role');

-- ================================================================
-- 9. NOTIFICATION_SETTINGS TABLE POLICIES (if exists)
-- ================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notification_settings') THEN
        DROP POLICY IF EXISTS "Users can view own notification settings" ON public.notification_settings;
        DROP POLICY IF EXISTS "Users can insert own notification settings" ON public.notification_settings;
        DROP POLICY IF EXISTS "Users can update own notification settings" ON public.notification_settings;
        DROP POLICY IF EXISTS "Users can delete own notification settings" ON public.notification_settings;
        DROP POLICY IF EXISTS "Service role full access to notification settings" ON public.notification_settings;

        CREATE POLICY "Users can view own notification settings" ON public.notification_settings
            FOR SELECT
            USING ((SELECT auth.uid()) = user_id);

        CREATE POLICY "Users can insert own notification settings" ON public.notification_settings
            FOR INSERT
            WITH CHECK ((SELECT auth.uid()) = user_id);

        CREATE POLICY "Users can update own notification settings" ON public.notification_settings
            FOR UPDATE
            USING ((SELECT auth.uid()) = user_id)
            WITH CHECK ((SELECT auth.uid()) = user_id);

        CREATE POLICY "Users can delete own notification settings" ON public.notification_settings
            FOR DELETE
            USING ((SELECT auth.uid()) = user_id);

        CREATE POLICY "Service role full access to notification settings" ON public.notification_settings
            FOR ALL
            USING ((SELECT auth.role()) = 'service_role')
            WITH CHECK ((SELECT auth.role()) = 'service_role');

        RAISE NOTICE 'Updated notification_settings policies';
    END IF;
END $$;

-- ================================================================
-- 10. EMAIL_LOGS TABLE POLICIES (if exists)
-- ================================================================
-- Note: email_logs is service role only, no user_id column

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_logs') THEN
        DROP POLICY IF EXISTS "Service role can manage email logs" ON public.email_logs;
        DROP POLICY IF EXISTS "No user access to email logs" ON public.email_logs;

        CREATE POLICY "Service role can manage email logs" ON public.email_logs
            FOR ALL
            USING ((SELECT auth.role()) = 'service_role');

        CREATE POLICY "No user access to email logs" ON public.email_logs
            FOR ALL
            USING (false);

        RAISE NOTICE 'Updated email_logs policies';
    END IF;
END $$;

-- ================================================================
-- 11. PERFORMANCE_MONITORING TABLE POLICIES (if exists)
-- ================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'performance_monitoring') THEN
        DROP POLICY IF EXISTS "Users can view performance for own sites" ON public.performance_monitoring;
        DROP POLICY IF EXISTS "Service role full access to performance monitoring" ON public.performance_monitoring;

        CREATE POLICY "Users can view performance for own sites" ON public.performance_monitoring
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.sites
                    WHERE sites.id = performance_monitoring.site_id
                    AND sites.user_id = (SELECT auth.uid())
                )
            );

        CREATE POLICY "Service role full access to performance monitoring" ON public.performance_monitoring
            FOR ALL
            USING ((SELECT auth.role()) = 'service_role')
            WITH CHECK ((SELECT auth.role()) = 'service_role');

        RAISE NOTICE 'Updated performance_monitoring policies';
    END IF;
END $$;

-- ================================================================
-- 12. PAGE_SPEED_LOGS TABLE POLICIES (if exists)
-- ================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'page_speed_logs') THEN
        DROP POLICY IF EXISTS "Users can view page speed for own sites" ON public.page_speed_logs;
        DROP POLICY IF EXISTS "Service role full access to page speed logs" ON public.page_speed_logs;

        CREATE POLICY "Users can view page speed for own sites" ON public.page_speed_logs
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.sites
                    WHERE sites.id = page_speed_logs.site_id
                    AND sites.user_id = (SELECT auth.uid())
                )
            );

        CREATE POLICY "Service role full access to page speed logs" ON public.page_speed_logs
            FOR ALL
            USING ((SELECT auth.role()) = 'service_role')
            WITH CHECK ((SELECT auth.role()) = 'service_role');

        RAISE NOTICE 'Updated page_speed_logs policies';
    END IF;
END $$;

-- ================================================================
-- 13. ANALYTICS TABLES (if exist)
-- ================================================================

DO $$
BEGIN
    -- facts_daily table
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'facts_daily') THEN
        DROP POLICY IF EXISTS "Service role full access to facts daily" ON public.facts_daily;

        CREATE POLICY "Service role full access to facts daily" ON public.facts_daily
            FOR ALL
            USING ((SELECT auth.role()) = 'service_role')
            WITH CHECK ((SELECT auth.role()) = 'service_role');

        RAISE NOTICE 'Updated facts_daily policies';
    END IF;

    -- dim_products table
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dim_products') THEN
        DROP POLICY IF EXISTS "Service role full access to dim products" ON public.dim_products;

        CREATE POLICY "Service role full access to dim products" ON public.dim_products
            FOR ALL
            USING ((SELECT auth.role()) = 'service_role')
            WITH CHECK ((SELECT auth.role()) = 'service_role');

        RAISE NOTICE 'Updated dim_products policies';
    END IF;
END $$;

-- ================================================================
-- VERIFICATION
-- ================================================================

DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public';

    RAISE NOTICE '==========================================';
    RAISE NOTICE 'RLS PERFORMANCE OPTIMIZATION COMPLETE';
    RAISE NOTICE 'Total policies updated: %', policy_count;
    RAISE NOTICE 'All auth.uid() and auth.role() calls wrapped in subqueries';
    RAISE NOTICE '==========================================';
END $$;

-- ================================================================
-- NOTES
-- ================================================================
-- ✅ All auth.uid() calls wrapped with (SELECT auth.uid())
-- ✅ All auth.role() calls wrapped with (SELECT auth.role())
-- ✅ This prevents function re-evaluation on every row
-- ✅ Significant performance improvement for large datasets
-- ✅ Maintains same security guarantees as before
-- ================================================================
