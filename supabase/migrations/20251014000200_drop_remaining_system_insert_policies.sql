-- Drop remaining 2 redundant "System can insert" policies
-- Tables: integration_logs, notification_history
-- These tables have service role full access policies that already cover INSERT operations

DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'DROPPING REMAINING SYSTEM INSERT POLICIES';
    RAISE NOTICE '==========================================';

    -- integration_logs
    DROP POLICY IF EXISTS "System can insert integration logs" ON public.integration_logs;
    RAISE NOTICE '  ✓ Dropped "System can insert integration logs" from integration_logs';

    -- notification_history
    DROP POLICY IF EXISTS "System can insert notification history" ON public.notification_history;
    RAISE NOTICE '  ✓ Dropped "System can insert notification history" from notification_history';

    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Remaining policies dropped successfully';
    RAISE NOTICE '==========================================';
END $$;

-- Verify service role policies exist for these tables
DO $$
DECLARE
    table_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Verifying service role policies exist:';
    RAISE NOTICE '==========================================';

    FOR table_record IN
        SELECT tablename, policyname, cmd
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN ('integration_logs', 'notification_history')
        AND (
            policyname ILIKE '%service role%'
            OR policyname ILIKE '%manage%'
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

-- Final verification: Check for ANY remaining "System can insert" policies
DO $$
DECLARE
    remaining_count INTEGER;
    table_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'FINAL VERIFICATION:';
    RAISE NOTICE '==========================================';

    SELECT COUNT(*)
    INTO remaining_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND policyname ILIKE '%system%insert%';

    IF remaining_count = 0 THEN
        RAISE NOTICE '✅ SUCCESS: ALL "System can insert" policies removed!';
        RAISE NOTICE '✅ No more duplicate policy warnings expected';
        RAISE NOTICE '✅ Edge Functions use service role authentication';
    ELSE
        RAISE WARNING 'Still found % "System can insert" policies remaining', remaining_count;

        -- List the remaining policies
        FOR table_record IN
            SELECT tablename, policyname
            FROM pg_policies
            WHERE schemaname = 'public'
            AND policyname ILIKE '%system%insert%'
        LOOP
            RAISE WARNING '  - Table: % | Policy: %',
                table_record.tablename,
                table_record.policyname;
        END LOOP;
    END IF;

    RAISE NOTICE '==========================================';
END $$;
