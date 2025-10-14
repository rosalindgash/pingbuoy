-- Drop redundant specific action policies when comprehensive policies exist
-- Keep 'manage', 'full access', or 'ALL' policies and remove specific SELECT/INSERT/UPDATE/DELETE
-- This fixes duplicate policy warnings where both comprehensive and specific policies exist

DO $$
DECLARE
    table_record RECORD;
    policy_record RECORD;
    has_comprehensive_policy BOOLEAN;
    dropped_count INTEGER := 0;
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'DROPPING REDUNDANT SPECIFIC ACTION POLICIES';
    RAISE NOTICE '==========================================';

    -- For each table, check if comprehensive policies exist
    FOR table_record IN
        SELECT DISTINCT tablename
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        -- Check if this table has comprehensive policies (FOR ALL or 'manage'/'full access' in name)
        SELECT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = table_record.tablename
            AND (
                cmd = 'ALL'
                OR policyname ILIKE '%manage%'
                OR policyname ILIKE '%full access%'
            )
        ) INTO has_comprehensive_policy;

        -- If comprehensive policy exists, drop specific action policies for the same role
        IF has_comprehensive_policy THEN
            FOR policy_record IN
                SELECT DISTINCT p1.policyname, p1.cmd
                FROM pg_policies p1
                WHERE p1.schemaname = 'public'
                AND p1.tablename = table_record.tablename
                AND p1.cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
                AND EXISTS (
                    -- Check if there's a comprehensive policy for same role
                    SELECT 1
                    FROM pg_policies p2
                    WHERE p2.schemaname = 'public'
                    AND p2.tablename = table_record.tablename
                    AND p2.cmd = 'ALL'
                    AND (
                        -- Same role or overlapping role (service_role with same qual pattern)
                        (p2.policyname ILIKE '%service%' AND p1.policyname ILIKE '%service%')
                        OR (p2.policyname ILIKE '%user%' AND p1.policyname ILIKE '%user%')
                        OR (p2.policyname ILIKE '%admin%' AND p1.policyname ILIKE '%admin%')
                        OR (p2.policyname ILIKE '%manage%' AND p1.policyname NOT ILIKE '%service%')
                    )
                )
                ORDER BY p1.policyname
            LOOP
                BEGIN
                    -- Drop the specific action policy
                    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
                        policy_record.policyname,
                        table_record.tablename
                    );

                    dropped_count := dropped_count + 1;
                    RAISE NOTICE 'Dropped redundant % policy "%" from table: %',
                        policy_record.cmd,
                        policy_record.policyname,
                        table_record.tablename;

                EXCEPTION WHEN OTHERS THEN
                    RAISE WARNING 'Failed to drop policy "%" from table %: %',
                        policy_record.policyname,
                        table_record.tablename,
                        SQLERRM;
                END;
            END LOOP;
        END IF;
    END LOOP;

    RAISE NOTICE '==========================================';
    RAISE NOTICE 'TOTAL REDUNDANT POLICIES DROPPED: %', dropped_count;
    RAISE NOTICE '==========================================';
END $$;

-- Now handle specific known duplicate cases
DO $$
DECLARE
    dropped_count INTEGER := 0;
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'HANDLING SPECIFIC KNOWN DUPLICATES';
    RAISE NOTICE '==========================================';

    -- Drop specific policies where we know comprehensive ones exist

    -- Status checks - has "Service role can manage status checks" (ALL)
    DROP POLICY IF EXISTS "Service role can insert status checks" ON public.status_checks;
    DROP POLICY IF EXISTS "Service role can update status checks" ON public.status_checks;
    DROP POLICY IF EXISTS "Service role can delete status checks" ON public.status_checks;

    -- Status incident updates - has "Service role can manage incident updates" (ALL)
    DROP POLICY IF EXISTS "Service role can insert incident updates" ON public.status_incident_updates;
    DROP POLICY IF EXISTS "Service role can update incident updates" ON public.status_incident_updates;
    DROP POLICY IF EXISTS "Service role can delete incident updates" ON public.status_incident_updates;

    -- Status services - has "Service role can manage status services" (ALL)
    DROP POLICY IF EXISTS "Service role can insert status services" ON public.status_services;
    DROP POLICY IF EXISTS "Service role can update status services" ON public.status_services;
    DROP POLICY IF EXISTS "Service role can delete status services" ON public.status_services;

    -- Status incidents - has "Service role can manage incidents" (ALL)
    DROP POLICY IF EXISTS "Service role can insert incidents" ON public.status_incidents;
    DROP POLICY IF EXISTS "Service role can update incidents" ON public.status_incidents;
    DROP POLICY IF EXISTS "Service role can delete incidents" ON public.status_incidents;

    -- Status maintenance - has "Service role can manage maintenance" (ALL)
    DROP POLICY IF EXISTS "Service role can insert maintenance" ON public.status_maintenance;
    DROP POLICY IF EXISTS "Service role can update maintenance" ON public.status_maintenance;
    DROP POLICY IF EXISTS "Service role can delete maintenance" ON public.status_maintenance;

    -- Status subscribers - has "Service role can manage subscribers" (ALL)
    DROP POLICY IF EXISTS "Service role can insert subscribers" ON public.status_subscribers;
    DROP POLICY IF EXISTS "Service role can delete subscribers" ON public.status_subscribers;

    -- Sites - has "Users can manage own sites" (ALL)
    DROP POLICY IF EXISTS "Users can view own sites" ON public.sites;
    DROP POLICY IF EXISTS "Users can insert own sites" ON public.sites;
    DROP POLICY IF EXISTS "Users can update own sites" ON public.sites;
    DROP POLICY IF EXISTS "Users can delete own sites" ON public.sites;

    -- Integrations - has comprehensive access
    DROP POLICY IF EXISTS "Users can view their own integrations" ON public.integrations;
    DROP POLICY IF EXISTS "Users can insert their own integrations" ON public.integrations;
    DROP POLICY IF EXISTS "Users can update their own integrations" ON public.integrations;
    DROP POLICY IF EXISTS "Users can delete their own integrations" ON public.integrations;

    -- User performance logs - might have specific policies
    DROP POLICY IF EXISTS "Users can insert performance logs for their sites" ON public.user_performance_logs;
    DROP POLICY IF EXISTS "Users can view their own site performance logs" ON public.user_performance_logs;

    -- Alerts
    DROP POLICY IF EXISTS "System can insert alerts" ON public.alerts;
    DROP POLICY IF EXISTS "Users can view alerts for own sites" ON public.alerts;
    DROP POLICY IF EXISTS "Users can update alerts for own sites" ON public.alerts;

    -- Dead links
    DROP POLICY IF EXISTS "System can insert dead links" ON public.dead_links;
    DROP POLICY IF EXISTS "Users can view dead links for own sites" ON public.dead_links;
    DROP POLICY IF EXISTS "Users can update dead links for own sites" ON public.dead_links;

    -- Scans
    DROP POLICY IF EXISTS "System can insert scans" ON public.scans;
    DROP POLICY IF EXISTS "Users can view scans for own sites" ON public.scans;
    DROP POLICY IF EXISTS "Users can update scans for own sites" ON public.scans;

    -- Uptime logs
    DROP POLICY IF EXISTS "System can insert uptime logs" ON public.uptime_logs;

    RAISE NOTICE 'Dropped specific known duplicate policies';
    RAISE NOTICE '==========================================';
END $$;

-- Verify final policy count
DO $$
DECLARE
    table_record RECORD;
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'FINAL POLICY COUNT BY TABLE:';
    RAISE NOTICE '==========================================';

    FOR table_record IN
        SELECT
            tablename,
            COUNT(*) as policy_count,
            array_agg(policyname || ' (' || cmd || ')' ORDER BY policyname) as policies
        FROM pg_policies
        WHERE schemaname = 'public'
        GROUP BY tablename
        ORDER BY tablename
    LOOP
        RAISE NOTICE 'Table: % - % policies', table_record.tablename, table_record.policy_count;
    END LOOP;

    RAISE NOTICE '==========================================';
END $$;
