-- Drop all 'Consolidated ALL policy' policies that are causing duplicate warnings
-- These consolidated policies conflict with existing granular policies
-- We keep the specific, descriptive policies instead

DO $$
DECLARE
    policy_record RECORD;
    dropped_count INTEGER := 0;
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'DROPPING CONSOLIDATED ALL POLICIES';
    RAISE NOTICE '==========================================';

    -- Find and drop all policies named 'Consolidated ALL policy'
    FOR policy_record IN
        SELECT
            schemaname,
            tablename,
            policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND policyname = 'Consolidated ALL policy'
        ORDER BY tablename
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                policy_record.policyname,
                policy_record.schemaname,
                policy_record.tablename
            );

            dropped_count := dropped_count + 1;
            RAISE NOTICE 'Dropped policy "Consolidated ALL policy" from table: %',
                policy_record.tablename;

        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to drop policy from table %: %',
                policy_record.tablename,
                SQLERRM;
        END;
    END LOOP;

    -- Also drop any other consolidated policies that might exist
    FOR policy_record IN
        SELECT
            schemaname,
            tablename,
            policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND (
            policyname LIKE 'Consolidated % policy'
            OR policyname LIKE 'Consolidated %'
        )
        AND policyname != 'Consolidated ALL policy'  -- Already handled above
        ORDER BY tablename, policyname
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                policy_record.policyname,
                policy_record.schemaname,
                policy_record.tablename
            );

            dropped_count := dropped_count + 1;
            RAISE NOTICE 'Dropped consolidated policy "%" from table: %',
                policy_record.policyname,
                policy_record.tablename;

        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to drop policy "%" from table %: %',
                policy_record.policyname,
                policy_record.tablename,
                SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE '==========================================';
    RAISE NOTICE 'TOTAL CONSOLIDATED POLICIES DROPPED: %', dropped_count;
    RAISE NOTICE 'Keeping specific granular policies';
    RAISE NOTICE '==========================================';
END $$;

-- Verify remaining policies
DO $$
DECLARE
    table_record RECORD;
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'REMAINING POLICIES BY TABLE:';
    RAISE NOTICE '==========================================';

    FOR table_record IN
        SELECT
            tablename,
            COUNT(*) as policy_count,
            array_agg(policyname ORDER BY policyname) as policies
        FROM pg_policies
        WHERE schemaname = 'public'
        GROUP BY tablename
        ORDER BY tablename
    LOOP
        RAISE NOTICE 'Table: % (% policies)',
            table_record.tablename,
            table_record.policy_count;
    END LOOP;

    RAISE NOTICE '==========================================';
END $$;
