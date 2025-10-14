-- Add indexes for 5 remaining unindexed foreign keys
-- These improve JOIN performance and foreign key constraint checks

DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'ADDING INDEXES FOR REMAINING UNINDEXED FOREIGN KEYS';
    RAISE NOTICE '==========================================';

    -- 1. analytics_audit_log.user_id
    CREATE INDEX IF NOT EXISTS idx_analytics_audit_log_user_id ON public.analytics_audit_log(user_id);
    RAISE NOTICE '  ✓ Added index: idx_analytics_audit_log_user_id';

    -- 2. integration_logs.integration_id
    CREATE INDEX IF NOT EXISTS idx_integration_logs_integration_id ON public.integration_logs(integration_id);
    RAISE NOTICE '  ✓ Added index: idx_integration_logs_integration_id';

    -- 3. notification_history.user_id
    CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON public.notification_history(user_id);
    RAISE NOTICE '  ✓ Added index: idx_notification_history_user_id';

    -- 4. page_speed_logs.site_id
    CREATE INDEX IF NOT EXISTS idx_page_speed_logs_site_id ON public.page_speed_logs(site_id);
    RAISE NOTICE '  ✓ Added index: idx_page_speed_logs_site_id';

    -- 5. user_performance_logs.site_id
    CREATE INDEX IF NOT EXISTS idx_user_performance_logs_site_id ON public.user_performance_logs(site_id);
    RAISE NOTICE '  ✓ Added index: idx_user_performance_logs_site_id';

    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ All 5 foreign key indexes added successfully';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Benefits:';
    RAISE NOTICE '  • Faster JOIN operations on foreign key columns';
    RAISE NOTICE '  • Improved foreign key constraint checks';
    RAISE NOTICE '  • Better query performance for related data lookups';
    RAISE NOTICE '==========================================';
END $$;
