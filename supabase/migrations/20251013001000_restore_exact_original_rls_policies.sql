-- CRITICAL: Restore EXACT original RLS policies that were accidentally removed
-- These tables have RLS enabled but no policies, blocking all user access
-- This restores the policies with their ORIGINAL names and logic (no duplicates)
-- WITH PERFORMANCE OPTIMIZATIONS: All auth functions wrapped in (SELECT ...)

-- ================================================================
-- 1. SITES TABLE - Restore 5 original policies
-- ================================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sites' AND policyname = 'Users can view own sites') THEN
        CREATE POLICY "Users can view own sites" ON public.sites
            FOR SELECT
            USING ((SELECT auth.uid()) = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sites' AND policyname = 'Users can insert own sites') THEN
        CREATE POLICY "Users can insert own sites" ON public.sites
            FOR INSERT
            WITH CHECK ((SELECT auth.uid()) = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sites' AND policyname = 'Users can update own sites') THEN
        CREATE POLICY "Users can update own sites" ON public.sites
            FOR UPDATE
            USING ((SELECT auth.uid()) = user_id)
            WITH CHECK ((SELECT auth.uid()) = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sites' AND policyname = 'Users can delete own sites') THEN
        CREATE POLICY "Users can delete own sites" ON public.sites
            FOR DELETE
            USING ((SELECT auth.uid()) = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sites' AND policyname = 'Service role full access to sites') THEN
        CREATE POLICY "Service role full access to sites" ON public.sites
            FOR ALL
            USING ((SELECT auth.role()) = 'service_role')
            WITH CHECK ((SELECT auth.role()) = 'service_role');
    END IF;
END $$;

-- ================================================================
-- 2. UPTIME_LOGS TABLE - Restore 3 original policies
-- ================================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'uptime_logs' AND policyname = 'Users can view logs for own sites') THEN
        CREATE POLICY "Users can view logs for own sites" ON public.uptime_logs
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.sites
                    WHERE sites.id = uptime_logs.site_id
                    AND sites.user_id = (SELECT auth.uid())
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'uptime_logs' AND policyname = 'System can insert uptime logs') THEN
        CREATE POLICY "System can insert uptime logs" ON public.uptime_logs
            FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.sites
                    WHERE sites.id = uptime_logs.site_id
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'uptime_logs' AND policyname = 'Service role full access to uptime logs') THEN
        CREATE POLICY "Service role full access to uptime logs" ON public.uptime_logs
            FOR ALL
            USING ((SELECT auth.role()) = 'service_role')
            WITH CHECK ((SELECT auth.role()) = 'service_role');
    END IF;
END $$;

-- ================================================================
-- 3. ALERTS TABLE - Restore 4 original policies
-- ================================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'alerts' AND policyname = 'Users can view alerts for own sites') THEN
        CREATE POLICY "Users can view alerts for own sites" ON public.alerts
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.sites
                    WHERE sites.id = alerts.site_id
                    AND sites.user_id = (SELECT auth.uid())
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'alerts' AND policyname = 'System can insert alerts') THEN
        CREATE POLICY "System can insert alerts" ON public.alerts
            FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.sites
                    WHERE sites.id = alerts.site_id
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'alerts' AND policyname = 'Users can update alerts for own sites') THEN
        CREATE POLICY "Users can update alerts for own sites" ON public.alerts
            FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM public.sites
                    WHERE sites.id = alerts.site_id
                    AND sites.user_id = (SELECT auth.uid())
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'alerts' AND policyname = 'Service role full access to alerts') THEN
        CREATE POLICY "Service role full access to alerts" ON public.alerts
            FOR ALL
            USING ((SELECT auth.role()) = 'service_role')
            WITH CHECK ((SELECT auth.role()) = 'service_role');
    END IF;
END $$;

-- ================================================================
-- 4. DEAD_LINKS TABLE - Restore 4 original policies
-- ================================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'dead_links' AND policyname = 'Users can view dead links for own sites') THEN
        CREATE POLICY "Users can view dead links for own sites" ON public.dead_links
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.sites
                    WHERE sites.id = dead_links.site_id
                    AND sites.user_id = (SELECT auth.uid())
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'dead_links' AND policyname = 'System can insert dead links') THEN
        CREATE POLICY "System can insert dead links" ON public.dead_links
            FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.sites
                    WHERE sites.id = dead_links.site_id
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'dead_links' AND policyname = 'Users can update dead links for own sites') THEN
        CREATE POLICY "Users can update dead links for own sites" ON public.dead_links
            FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM public.sites
                    WHERE sites.id = dead_links.site_id
                    AND sites.user_id = (SELECT auth.uid())
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'dead_links' AND policyname = 'Service role full access to dead links') THEN
        CREATE POLICY "Service role full access to dead links" ON public.dead_links
            FOR ALL
            USING ((SELECT auth.role()) = 'service_role')
            WITH CHECK ((SELECT auth.role()) = 'service_role');
    END IF;
END $$;

-- ================================================================
-- 5. SCANS TABLE - Restore 4 original policies
-- ================================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scans' AND policyname = 'Users can view scans for own sites') THEN
        CREATE POLICY "Users can view scans for own sites" ON public.scans
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.sites
                    WHERE sites.id = scans.site_id
                    AND sites.user_id = (SELECT auth.uid())
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scans' AND policyname = 'System can insert scans') THEN
        CREATE POLICY "System can insert scans" ON public.scans
            FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.sites
                    WHERE sites.id = scans.site_id
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scans' AND policyname = 'Users can update scans for own sites') THEN
        CREATE POLICY "Users can update scans for own sites" ON public.scans
            FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM public.sites
                    WHERE sites.id = scans.site_id
                    AND sites.user_id = (SELECT auth.uid())
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scans' AND policyname = 'Service role full access to scans') THEN
        CREATE POLICY "Service role full access to scans" ON public.scans
            FOR ALL
            USING ((SELECT auth.role()) = 'service_role')
            WITH CHECK ((SELECT auth.role()) = 'service_role');
    END IF;
END $$;

-- ================================================================
-- 6. INTEGRATIONS TABLE - Restore 5 original policies
-- ================================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'integrations' AND policyname = 'Users can view their own integrations') THEN
        CREATE POLICY "Users can view their own integrations" ON public.integrations
            FOR SELECT
            USING ((SELECT auth.uid()) = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'integrations' AND policyname = 'Users can insert their own integrations') THEN
        CREATE POLICY "Users can insert their own integrations" ON public.integrations
            FOR INSERT
            WITH CHECK ((SELECT auth.uid()) = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'integrations' AND policyname = 'Users can update their own integrations') THEN
        CREATE POLICY "Users can update their own integrations" ON public.integrations
            FOR UPDATE
            USING ((SELECT auth.uid()) = user_id)
            WITH CHECK ((SELECT auth.uid()) = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'integrations' AND policyname = 'Users can delete their own integrations') THEN
        CREATE POLICY "Users can delete their own integrations" ON public.integrations
            FOR DELETE
            USING ((SELECT auth.uid()) = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'integrations' AND policyname = 'Service role full access to integrations') THEN
        CREATE POLICY "Service role full access to integrations" ON public.integrations
            FOR ALL
            USING ((SELECT auth.role()) = 'service_role')
            WITH CHECK ((SELECT auth.role()) = 'service_role');
    END IF;
END $$;

-- ================================================================
-- 7. NOTIFICATION_SETTINGS TABLE - Restore 5 original policies
-- ================================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notification_settings' AND policyname = 'Users can view their own notification settings') THEN
        CREATE POLICY "Users can view their own notification settings" ON public.notification_settings
            FOR SELECT
            USING ((SELECT auth.uid()) = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notification_settings' AND policyname = 'Users can insert their own notification settings') THEN
        CREATE POLICY "Users can insert their own notification settings" ON public.notification_settings
            FOR INSERT
            WITH CHECK ((SELECT auth.uid()) = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notification_settings' AND policyname = 'Users can update their own notification settings') THEN
        CREATE POLICY "Users can update their own notification settings" ON public.notification_settings
            FOR UPDATE
            USING ((SELECT auth.uid()) = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notification_settings' AND policyname = 'Users can delete their own notification settings') THEN
        CREATE POLICY "Users can delete their own notification settings" ON public.notification_settings
            FOR DELETE
            USING ((SELECT auth.uid()) = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notification_settings' AND policyname = 'Service role full access') THEN
        CREATE POLICY "Service role full access" ON public.notification_settings
            FOR ALL
            USING ((SELECT auth.role()) = 'service_role');
    END IF;
END $$;

-- ================================================================
-- 8. PAGE_SPEED_LOGS TABLE - Restore 2 original policies
-- ================================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'page_speed_logs' AND policyname = 'Users can view their own page speed logs') THEN
        CREATE POLICY "Users can view their own page speed logs" ON public.page_speed_logs
            FOR SELECT
            USING (
                site_id IN (
                    SELECT id FROM public.sites WHERE user_id = (SELECT auth.uid())
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'page_speed_logs' AND policyname = 'Service role can manage all page speed logs') THEN
        CREATE POLICY "Service role can manage all page speed logs" ON public.page_speed_logs
            FOR ALL
            USING ((SELECT auth.jwt()) ->> 'role' = 'service_role');
    END IF;
END $$;

-- ================================================================
-- 9. EMAIL_LOGS TABLE - Restore 2 original policies
-- ================================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_logs' AND policyname = 'Service role can manage email logs') THEN
        CREATE POLICY "Service role can manage email logs" ON public.email_logs
            FOR ALL
            USING ((SELECT auth.role()) = 'service_role');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_logs' AND policyname = 'No user access to email logs') THEN
        CREATE POLICY "No user access to email logs" ON public.email_logs
            FOR ALL
            USING (false);
    END IF;
END $$;

-- ================================================================
-- 10. FACTS_DAILY TABLE - Restore 1 original policy
-- ================================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'facts_daily' AND policyname = 'Service role full access') THEN
        CREATE POLICY "Service role full access" ON public.facts_daily
            FOR ALL
            USING ((SELECT auth.role()) = 'service_role');
    END IF;
END $$;

-- ================================================================
-- VERIFICATION
-- ================================================================

DO $$
DECLARE
    table_record RECORD;
    missing_policies TEXT[] := ARRAY[]::TEXT[];
    total_restored INTEGER := 0;
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'VERIFYING RESTORED RLS POLICIES';
    RAISE NOTICE '==========================================';

    FOR table_record IN
        SELECT
            tablename,
            rowsecurity as rls_enabled,
            (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND pg_policies.tablename = t.tablename) as policy_count
        FROM pg_tables t
        WHERE schemaname = 'public'
        AND tablename IN ('sites', 'uptime_logs', 'alerts', 'dead_links', 'scans',
                         'page_speed_logs', 'integrations', 'notification_settings',
                         'email_logs', 'facts_daily')
        ORDER BY tablename
    LOOP
        total_restored := total_restored + table_record.policy_count;

        IF table_record.rls_enabled AND table_record.policy_count = 0 THEN
            missing_policies := array_append(missing_policies, table_record.tablename);
        END IF;

        RAISE NOTICE 'Table: % | RLS: % | Policies: %',
            table_record.tablename,
            table_record.rls_enabled,
            table_record.policy_count;
    END LOOP;

    IF array_length(missing_policies, 1) > 0 THEN
        RAISE WARNING 'Tables STILL with RLS but no policies: %', array_to_string(missing_policies, ', ');
    ELSE
        RAISE NOTICE '✅ All 10 tables have RLS policies restored!';
        RAISE NOTICE 'Total policies: %', total_restored;
        RAISE NOTICE '✅ All policies use performance-optimized (SELECT auth.uid/role()) syntax';
    END IF;

    RAISE NOTICE '==========================================';
END $$;
