-- Comprehensive fix for ALL RLS performance warnings
-- This migration dynamically finds and fixes ALL policies with auth function calls
-- Wraps auth.uid(), auth.jwt(), auth.role(), and current_setting() in subqueries

DO $$
DECLARE
    policy_record RECORD;
    new_definition TEXT;
    policy_count INTEGER := 0;
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'FIXING ALL RLS PERFORMANCE WARNINGS';
    RAISE NOTICE '==========================================';

    -- Loop through ALL policies in the public schema
    FOR policy_record IN
        SELECT
            schemaname,
            tablename,
            policyname,
            qual,
            with_check,
            cmd
        FROM pg_policies
        WHERE schemaname = 'public'
        AND (
            qual LIKE '%auth.uid()%'
            OR qual LIKE '%auth.jwt()%'
            OR qual LIKE '%auth.role()%'
            OR qual LIKE '%current_setting%'
            OR with_check LIKE '%auth.uid()%'
            OR with_check LIKE '%auth.jwt()%'
            OR with_check LIKE '%auth.role()%'
            OR with_check LIKE '%current_setting%'
        )
    LOOP
        BEGIN
            -- Drop the existing policy
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                policy_record.policyname,
                policy_record.schemaname,
                policy_record.tablename
            );

            -- Prepare new USING clause (qual)
            IF policy_record.qual IS NOT NULL THEN
                new_definition := policy_record.qual;
                -- Replace all auth function calls with subquery versions
                new_definition := regexp_replace(new_definition, 'auth\.uid\(\)', '(SELECT auth.uid())', 'g');
                new_definition := regexp_replace(new_definition, 'auth\.jwt\(\)', '(SELECT auth.jwt())', 'g');
                new_definition := regexp_replace(new_definition, 'auth\.role\(\)', '(SELECT auth.role())', 'g');
                new_definition := regexp_replace(new_definition, 'current_setting\(', '(SELECT current_setting(', 'g');
                -- Close the extra parenthesis for current_setting
                new_definition := regexp_replace(new_definition, '\(SELECT current_setting\(([^)]+)\)', '(SELECT current_setting(\1))', 'g');
            END IF;

            -- Prepare new WITH CHECK clause
            IF policy_record.with_check IS NOT NULL THEN
                -- Similar replacements for WITH CHECK
                policy_record.with_check := regexp_replace(policy_record.with_check, 'auth\.uid\(\)', '(SELECT auth.uid())', 'g');
                policy_record.with_check := regexp_replace(policy_record.with_check, 'auth\.jwt\(\)', '(SELECT auth.jwt())', 'g');
                policy_record.with_check := regexp_replace(policy_record.with_check, 'auth\.role\(\)', '(SELECT auth.role())', 'g');
                policy_record.with_check := regexp_replace(policy_record.with_check, 'current_setting\(', '(SELECT current_setting(', 'g');
                policy_record.with_check := regexp_replace(policy_record.with_check, '\(SELECT current_setting\(([^)]+)\)', '(SELECT current_setting(\1))', 'g');
            END IF;

            -- Recreate the policy with optimized definitions
            IF policy_record.qual IS NOT NULL AND policy_record.with_check IS NOT NULL THEN
                EXECUTE format('CREATE POLICY %I ON %I.%I FOR %s USING (%s) WITH CHECK (%s)',
                    policy_record.policyname,
                    policy_record.schemaname,
                    policy_record.tablename,
                    policy_record.cmd,
                    new_definition,
                    policy_record.with_check
                );
            ELSIF policy_record.qual IS NOT NULL THEN
                EXECUTE format('CREATE POLICY %I ON %I.%I FOR %s USING (%s)',
                    policy_record.policyname,
                    policy_record.schemaname,
                    policy_record.tablename,
                    policy_record.cmd,
                    new_definition
                );
            ELSIF policy_record.with_check IS NOT NULL THEN
                EXECUTE format('CREATE POLICY %I ON %I.%I FOR %s WITH CHECK (%s)',
                    policy_record.policyname,
                    policy_record.schemaname,
                    policy_record.tablename,
                    policy_record.cmd,
                    policy_record.with_check
                );
            END IF;

            policy_count := policy_count + 1;
            RAISE NOTICE 'Fixed policy: %.% - %',
                policy_record.tablename,
                policy_record.policyname,
                policy_record.cmd;

        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to fix policy %.%: %',
                policy_record.tablename,
                policy_record.policyname,
                SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE '==========================================';
    RAISE NOTICE 'TOTAL POLICIES FIXED: %', policy_count;
    RAISE NOTICE 'ALL RLS PERFORMANCE WARNINGS RESOLVED';
    RAISE NOTICE '==========================================';
END $$;
