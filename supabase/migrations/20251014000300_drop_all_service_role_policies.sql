-- Drop ALL "Service role full access" policies across all tables
-- Reason: Service role bypasses RLS entirely and doesn't need explicit policies
-- These policies create overlapping policy warnings with user-specific policies
-- Service role authentication works WITHOUT any RLS policies defined

DO $$
DECLARE
    policy_record RECORD;
    dropped_count INTEGER := 0;
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'DROPPING ALL SERVICE ROLE RLS POLICIES';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Reason: Service role bypasses RLS (does not need policies)';
    RAISE NOTICE 'These policies create overlapping warnings with user policies';
    RAISE NOTICE '==========================================';

    -- Find and drop ALL policies with "service role" in the name
    FOR policy_record IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND (
            policyname ILIKE '%service role%'
            OR policyname ILIKE '%service_role%'
        )
        ORDER BY tablename, policyname
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                policy_record.policyname,
                policy_record.schemaname,
                policy_record.tablename
            );

            dropped_count := dropped_count + 1;
            RAISE NOTICE '  ✓ Dropped: "%" from table %',
                policy_record.policyname,
                policy_record.tablename;

        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '  ✗ Failed to drop policy "%" from table %: %',
                policy_record.policyname,
                policy_record.tablename,
                SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'TOTAL SERVICE ROLE POLICIES DROPPED: %', dropped_count;
    RAISE NOTICE '==========================================';
END $$;

-- Verify no service role policies remain
DO $$
DECLARE
    remaining_count INTEGER;
    policy_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'FINAL VERIFICATION:';
    RAISE NOTICE '==========================================';

    SELECT COUNT(*)
    INTO remaining_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND (
        policyname ILIKE '%service role%'
        OR policyname ILIKE '%service_role%'
    );

    IF remaining_count = 0 THEN
        RAISE NOTICE '✅ SUCCESS: All service role policies removed!';
        RAISE NOTICE '✅ Service role authentication bypasses RLS';
        RAISE NOTICE '✅ User-specific policies remain active for regular users';
        RAISE NOTICE '✅ No more overlapping policy warnings expected';
    ELSE
        RAISE WARNING 'Still found % service role policies remaining', remaining_count;

        -- List the remaining policies
        FOR policy_record IN
            SELECT tablename, policyname
            FROM pg_policies
            WHERE schemaname = 'public'
            AND (
                policyname ILIKE '%service role%'
                OR policyname ILIKE '%service_role%'
            )
        LOOP
            RAISE WARNING '  - Table: % | Policy: %',
                policy_record.tablename,
                policy_record.policyname;
        END LOOP;
    END IF;

    RAISE NOTICE '==========================================';
END $$;

-- List remaining policy count by table
DO $$
DECLARE
    table_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'REMAINING POLICIES BY TABLE:';
    RAISE NOTICE '==========================================';

    FOR table_record IN
        SELECT tablename, COUNT(*) as policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        GROUP BY tablename
        ORDER BY tablename
    LOOP
        RAISE NOTICE 'Table: % - % policies',
            table_record.tablename,
            table_record.policy_count;
    END LOOP;

    RAISE NOTICE '==========================================';
    RAISE NOTICE 'All policies are now user-specific (no service role overlap)';
    RAISE NOTICE '==========================================';
END $$;
