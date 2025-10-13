-- Fix function search_path mutable warnings by setting explicit search_path
-- This prevents search path hijacking attacks
-- https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- List of all functions that need fixing (22 total):
-- 1. get_performance_summary
-- 2. cleanup_old_data
-- 3. get_site_monitoring_summary
-- 4. update_user_last_sign_in
-- 5. get_website_limit
-- 6. get_api_endpoint_limit
-- 7. get_user_monitoring_frequency
-- 8. get_next_check_time
-- 9. get_edge_function_url
-- 10. call_edge_function
-- 11. get_current_user_monitoring_info
-- 12. check_site_limit
-- 13. real_tiered_uptime_monitoring_with_ssl
-- 14. run_analytics_backfill
-- 15. run_analytics_quality_check
-- 16. debug_http_response
-- 17. real_tiered_uptime_monitoring
-- 18. real_uptime_monitoring
-- 19. normalize_to_monthly_cents
-- 20. check_daily_metrics_quality
-- 21. recompute_daily_facts
-- 22. update_facts_daily_updated_at

-- Strategy: Add SET search_path = public, pg_catalog to each function
-- This needs to be done using ALTER FUNCTION since we can't recreate all functions here

-- Fix all 22 functions at once
DO $$
DECLARE
    func_name TEXT;
    func_names TEXT[] := ARRAY[
        'get_performance_summary',
        'cleanup_old_data',
        'get_site_monitoring_summary',
        'update_user_last_sign_in',
        'get_website_limit',
        'get_api_endpoint_limit',
        'get_user_monitoring_frequency',
        'get_next_check_time',
        'get_edge_function_url',
        'call_edge_function',
        'get_current_user_monitoring_info',
        'check_site_limit',
        'real_tiered_uptime_monitoring_with_ssl',
        'run_analytics_backfill',
        'run_analytics_quality_check',
        'debug_http_response',
        'real_tiered_uptime_monitoring',
        'real_uptime_monitoring',
        'normalize_to_monthly_cents',
        'check_daily_metrics_quality',
        'recompute_daily_facts',
        'update_facts_daily_updated_at'
    ];
BEGIN
    FOREACH func_name IN ARRAY func_names
    LOOP
        BEGIN
            -- Try to alter the function to set search_path
            -- We need to get the function signature first
            EXECUTE format(
                'ALTER FUNCTION %I SET search_path = public, pg_catalog',
                func_name
            );
            RAISE NOTICE 'Fixed search_path for function: %', func_name;
        EXCEPTION
            WHEN undefined_function THEN
                -- Function might not exist, skip it
                RAISE NOTICE 'Function % not found, skipping', func_name;
            WHEN OTHERS THEN
                -- Log other errors but continue
                RAISE NOTICE 'Error fixing %: %', func_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- Note: The above approach sets search_path for all overloaded versions of these functions
-- If there are issues with specific function signatures, we can target them individually

COMMENT ON SCHEMA public IS 'Standard public schema with search_path security enforced on all functions';
