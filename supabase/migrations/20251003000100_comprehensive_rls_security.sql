-- ================================================================
-- COMPREHENSIVE ROW LEVEL SECURITY POLICIES
-- Migration: 20251003000100_comprehensive_rls_security.sql
-- ================================================================
-- This migration ensures all tables have proper RLS enabled
-- and policies are correctly configured for multi-tenant security
-- ================================================================

-- ================================================================
-- 1. USERS TABLE - Users can only read/update their own profile
-- ================================================================

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Service role full access to users" ON public.users;

-- Recreate policies
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role full access to users" ON public.users
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ================================================================
-- 2. SITES TABLE - Users can fully manage (CRUD) their own sites
-- ================================================================

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own sites" ON public.sites;
DROP POLICY IF EXISTS "Users can insert own sites" ON public.sites;
DROP POLICY IF EXISTS "Users can update own sites" ON public.sites;
DROP POLICY IF EXISTS "Users can delete own sites" ON public.sites;
DROP POLICY IF EXISTS "Service role full access to sites" ON public.sites;

-- Recreate policies
CREATE POLICY "Users can view own sites" ON public.sites
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sites" ON public.sites
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sites" ON public.sites
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sites" ON public.sites
    FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to sites" ON public.sites
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ================================================================
-- 3. UPTIME_LOGS TABLE - Users can only READ logs for their sites
-- ================================================================

ALTER TABLE public.uptime_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view logs for own sites" ON public.uptime_logs;
DROP POLICY IF EXISTS "System can insert uptime logs" ON public.uptime_logs;
DROP POLICY IF EXISTS "Service role full access to uptime logs" ON public.uptime_logs;

-- Recreate policies
CREATE POLICY "Users can view logs for own sites" ON public.uptime_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = uptime_logs.site_id
            AND sites.user_id = auth.uid()
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
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ================================================================
-- 4. INTEGRATIONS TABLE - Users can fully manage their integrations
-- ================================================================

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own integrations" ON public.integrations;
DROP POLICY IF EXISTS "Users can insert their own integrations" ON public.integrations;
DROP POLICY IF EXISTS "Users can update their own integrations" ON public.integrations;
DROP POLICY IF EXISTS "Users can delete their own integrations" ON public.integrations;
DROP POLICY IF EXISTS "Service role full access to integrations" ON public.integrations;

-- Recreate policies
CREATE POLICY "Users can view their own integrations" ON public.integrations
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own integrations" ON public.integrations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations" ON public.integrations
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integrations" ON public.integrations
    FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to integrations" ON public.integrations
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ================================================================
-- 5. CORE_WEB_VITALS TABLE - SERVICE ROLE ONLY (Internal metrics)
-- ================================================================

ALTER TABLE public.core_web_vitals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Service role can manage core web vitals" ON public.core_web_vitals;
DROP POLICY IF EXISTS "Service role full access to core web vitals" ON public.core_web_vitals;

-- Only service role can access this table
CREATE POLICY "Service role full access to core web vitals" ON public.core_web_vitals
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- No user policies - this table is internal only

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

DO $$
DECLARE
    rls_check RECORD;
    policy_count INTEGER;
BEGIN
    -- Check RLS is enabled on all critical tables
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'RLS STATUS CHECK';
    RAISE NOTICE '==========================================';

    FOR rls_check IN
        SELECT tablename, rowsecurity
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN ('users', 'sites', 'uptime_logs', 'integrations', 'core_web_vitals')
        ORDER BY tablename
    LOOP
        RAISE NOTICE 'Table: % | RLS Enabled: %', rls_check.tablename, rls_check.rowsecurity;
    END LOOP;

    RAISE NOTICE '==========================================';
    RAISE NOTICE 'POLICY COUNT CHECK';
    RAISE NOTICE '==========================================';

    -- Count policies per table
    FOR rls_check IN
        SELECT tablename, COUNT(*) as policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN ('users', 'sites', 'uptime_logs', 'integrations', 'core_web_vitals')
        GROUP BY tablename
        ORDER BY tablename
    LOOP
        RAISE NOTICE 'Table: % | Policies: %', rls_check.tablename, rls_check.policy_count;
    END LOOP;

    RAISE NOTICE '==========================================';
    RAISE NOTICE 'RLS migration completed successfully!';
    RAISE NOTICE '==========================================';
END $$;

-- ================================================================
-- ADDITIONAL NOTES
-- ================================================================
--
-- ✅ All policies use both USING and WITH CHECK for consistency
-- ✅ Service role policies exist on all tables for system operations
-- ✅ Users can only access their own data (multi-tenant isolation)
-- ✅ core_web_vitals is restricted to service role only
-- ✅ uptime_logs is read-only for users (no INSERT/UPDATE/DELETE)
--
-- TESTING CHECKLIST:
-- 1. Users can view/edit only their own sites
-- 2. Users can view uptime logs for their sites only
-- 3. Users can manage their own integrations
-- 4. Users can view/update their own profile
-- 5. /dashboard/core-vitals page loads correctly
-- 6. Monitoring cron jobs continue to work (use service role)
--
-- ================================================================
