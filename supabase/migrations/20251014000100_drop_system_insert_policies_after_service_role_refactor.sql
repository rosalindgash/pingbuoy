-- Drop redundant "System can insert" policies after Edge Functions refactoring
-- Edge Functions now use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS entirely
-- The "Service role full access" policies (FOR ALL) cover all operations including INSERT
-- Therefore, specific "System can insert" policies are redundant and cause duplicate warnings

DO $$
DECLARE
    table_record RECORD;
    policy_record RECORD;
    dropped_count INTEGER := 0;
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'DROPPING REDUNDANT SYSTEM INSERT POLICIES';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Reason: Edge Functions now use service role key (bypasses RLS)';
    RAISE NOTICE 'Service role policies (FOR ALL) already cover INSERT operations';
    RAISE NOTICE '==========================================';

    -- For each table that has BOTH service role AND system insert policies
    FOR table_record IN
        SELECT DISTINCT tablename
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN (
            -- Find tables with service role full access policies
            SELECT tablename
            FROM pg_policies
            WHERE schemaname = 'public'
            AND (
                policyname ILIKE '%service role%full access%'
                OR policyname ILIKE '%service role can manage%'
            )
        )
        AND tablename IN (
            -- Find tables with system insert policies
            SELECT tablename
            FROM pg_policies
            WHERE schemaname = 'public'
            AND policyname ILIKE '%system%insert%'
        )
        ORDER BY tablename
    LOOP
        RAISE NOTICE '';
        RAISE NOTICE 'Processing table: %', table_record.tablename;

        -- Find and drop all "System can insert" policies for this table
        FOR policy_record IN
            SELECT policyname
            FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = table_record.tablename
            AND policyname ILIKE '%system%insert%'
            ORDER BY policyname
        LOOP
            BEGIN
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
                    policy_record.policyname,
                    table_record.tablename
                );

                dropped_count := dropped_count + 1;
                RAISE NOTICE '  ✓ Dropped: "%"', policy_record.policyname;

            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING '  ✗ Failed to drop policy "%" from table %: %',
                    policy_record.policyname,
                    table_record.tablename,
                    SQLERRM;
            END;
        END LOOP;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'TOTAL POLICIES DROPPED: %', dropped_count;
    RAISE NOTICE '==========================================';

    -- Verify service role policies still exist
    RAISE NOTICE '';
    RAISE NOTICE 'Verifying service role policies still exist:';
    RAISE NOTICE '==========================================';

    FOR table_record IN
        SELECT tablename, policyname, cmd
        FROM pg_policies
        WHERE schemaname = 'public'
        AND (
            policyname ILIKE '%service role%full access%'
            OR policyname ILIKE '%service role can manage%'
        )
        ORDER BY tablename, policyname
    LOOP
        RAISE NOTICE 'Table: % | Policy: % | Command: %',
            table_record.tablename,
            table_record.policyname,
            table_record.cmd;
    END LOOP;

    RAISE NOTICE '==========================================';
END $$;

-- List specific known policies to drop (for tables we know have these)
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Dropping specific known redundant policies:';
    RAISE NOTICE '==========================================';

    -- uptime_logs
    DROP POLICY IF EXISTS "System can insert uptime logs" ON public.uptime_logs;
    RAISE NOTICE '  ✓ Dropped "System can insert uptime logs" from uptime_logs';

    -- alerts
    DROP POLICY IF EXISTS "System can insert alerts" ON public.alerts;
    RAISE NOTICE '  ✓ Dropped "System can insert alerts" from alerts';

    -- dead_links
    DROP POLICY IF EXISTS "System can insert dead links" ON public.dead_links;
    RAISE NOTICE '  ✓ Dropped "System can insert dead links" from dead_links';

    -- scans
    DROP POLICY IF EXISTS "System can insert scans" ON public.scans;
    RAISE NOTICE '  ✓ Dropped "System can insert scans" from scans';

    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Specific known policies dropped successfully';
    RAISE NOTICE '==========================================';
END $$;

-- Final verification
DO $$
DECLARE
    table_record RECORD;
    has_issues BOOLEAN := false;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'FINAL VERIFICATION:';
    RAISE NOTICE '==========================================';

    -- Check for any remaining "System can insert" policies
    FOR table_record IN
        SELECT tablename, COUNT(*) as policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        AND policyname ILIKE '%system%insert%'
        GROUP BY tablename
    LOOP
        has_issues := true;
        RAISE WARNING 'Table % still has % "System can insert" policies',
            table_record.tablename,
            table_record.policy_count;
    END LOOP;

    IF NOT has_issues THEN
        RAISE NOTICE '✅ SUCCESS: All redundant "System can insert" policies removed';
        RAISE NOTICE '✅ Edge Functions use service role key (bypasses RLS)';
        RAISE NOTICE '✅ "Service role full access" policies remain active';
    END IF;

    RAISE NOTICE '==========================================';
END $$;
