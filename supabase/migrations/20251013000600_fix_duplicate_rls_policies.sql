-- Fix duplicate RLS policies by consolidating multiple permissive policies
-- This migration finds and consolidates duplicate policies for the same table/command/role

DO $$
DECLARE
    table_record RECORD;
    policy_record RECORD;
    duplicate_policies TEXT[];
    combined_qual TEXT;
    combined_check TEXT;
    new_policy_name TEXT;
    policy_count INTEGER := 0;
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'CONSOLIDATING DUPLICATE RLS POLICIES';
    RAISE NOTICE '==========================================';

    -- Find tables with duplicate permissive policies for the same command
    FOR table_record IN
        SELECT
            tablename,
            cmd
        FROM pg_policies
        WHERE schemaname = 'public'
        AND permissive = 'PERMISSIVE'
        GROUP BY tablename, cmd
        HAVING COUNT(*) > 1
        AND COUNT(DISTINCT roles::text) = 1  -- Same role
    LOOP
        -- Get all policies for this table/command combination
        duplicate_policies := ARRAY[]::TEXT[];
        combined_qual := NULL;
        combined_check := NULL;

        FOR policy_record IN
            SELECT
                policyname,
                qual,
                with_check,
                roles
            FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = table_record.tablename
            AND cmd = table_record.cmd
            AND permissive = 'PERMISSIVE'
            ORDER BY policyname
        LOOP
            duplicate_policies := array_append(duplicate_policies, policy_record.policyname);

            -- Combine USING clauses with OR
            IF policy_record.qual IS NOT NULL THEN
                IF combined_qual IS NULL THEN
                    combined_qual := '(' || policy_record.qual || ')';
                ELSE
                    combined_qual := combined_qual || ' OR (' || policy_record.qual || ')';
                END IF;
            END IF;

            -- Combine WITH CHECK clauses with OR
            IF policy_record.with_check IS NOT NULL THEN
                IF combined_check IS NULL THEN
                    combined_check := '(' || policy_record.with_check || ')';
                ELSE
                    combined_check := combined_check || ' OR (' || policy_record.with_check || ')';
                END IF;
            END IF;
        END LOOP;

        -- Only consolidate if we found duplicates
        IF array_length(duplicate_policies, 1) > 1 THEN
            BEGIN
                -- Drop all existing policies
                FOREACH new_policy_name IN ARRAY duplicate_policies
                LOOP
                    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
                        new_policy_name,
                        table_record.tablename
                    );
                END LOOP;

                -- Create consolidated policy
                new_policy_name := format('Consolidated %s policy', table_record.cmd);

                IF combined_qual IS NOT NULL AND combined_check IS NOT NULL THEN
                    EXECUTE format('CREATE POLICY %I ON public.%I FOR %s USING (%s) WITH CHECK (%s)',
                        new_policy_name,
                        table_record.tablename,
                        table_record.cmd,
                        combined_qual,
                        combined_check
                    );
                ELSIF combined_qual IS NOT NULL THEN
                    EXECUTE format('CREATE POLICY %I ON public.%I FOR %s USING (%s)',
                        new_policy_name,
                        table_record.tablename,
                        table_record.cmd,
                        combined_qual
                    );
                ELSIF combined_check IS NOT NULL THEN
                    EXECUTE format('CREATE POLICY %I ON public.%I FOR %s WITH CHECK (%s)',
                        new_policy_name,
                        table_record.tablename,
                        table_record.cmd,
                        combined_check
                    );
                END IF;

                policy_count := policy_count + array_length(duplicate_policies, 1);
                RAISE NOTICE 'Consolidated % policies on table % for %: %',
                    array_length(duplicate_policies, 1),
                    table_record.tablename,
                    table_record.cmd,
                    array_to_string(duplicate_policies, ', ');

            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Failed to consolidate policies on %.%: %',
                    table_record.tablename,
                    table_record.cmd,
                    SQLERRM;
            END;
        END IF;
    END LOOP;

    RAISE NOTICE '==========================================';
    RAISE NOTICE 'TOTAL DUPLICATE POLICIES FIXED: %', policy_count;
    RAISE NOTICE '==========================================';
END $$;
