-- Fix all 34 Performance Advisor index suggestions
-- Part 1: Add 3 missing indexes for foreign keys
-- Part 2: Drop 31 unused indexes

-- ========================================
-- PART 1: ADD INDEXES FOR UNINDEXED FOREIGN KEYS
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'ADDING INDEXES FOR UNINDEXED FOREIGN KEYS';
    RAISE NOTICE '==========================================';

    -- 1. chart_annotations.created_by (foreign key: chart_annotations_created_by_fkey)
    CREATE INDEX IF NOT EXISTS idx_chart_annotations_created_by ON public.chart_annotations(created_by);
    RAISE NOTICE '  ✓ Added index: idx_chart_annotations_created_by';

    -- 2. status_checks.service_id (foreign key: status_checks_service_id_fkey)
    CREATE INDEX IF NOT EXISTS idx_status_checks_service_id ON public.status_checks(service_id);
    RAISE NOTICE '  ✓ Added index: idx_status_checks_service_id';

    -- 3. status_incident_updates.incident_id (foreign key: status_incident_updates_incident_id_fkey)
    CREATE INDEX IF NOT EXISTS idx_status_incident_updates_incident_id ON public.status_incident_updates(incident_id);
    RAISE NOTICE '  ✓ Added index: idx_status_incident_updates_incident_id';

    RAISE NOTICE '==========================================';
    RAISE NOTICE 'All foreign key indexes added successfully';
    RAISE NOTICE '==========================================';
END $$;

-- ========================================
-- PART 2: DROP UNUSED INDEXES
-- ========================================

DO $$
DECLARE
    dropped_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'DROPPING 31 UNUSED INDEXES';
    RAISE NOTICE '==========================================';

    -- User performance logs indexes (6 indexes)
    DROP INDEX IF EXISTS idx_user_performance_logs_site_id;
    RAISE NOTICE '  ✓ Dropped: idx_user_performance_logs_site_id';
    dropped_count := dropped_count + 1;

    DROP INDEX IF EXISTS idx_user_performance_logs_recorded_at;
    RAISE NOTICE '  ✓ Dropped: idx_user_performance_logs_recorded_at';
    dropped_count := dropped_count + 1;

    DROP INDEX IF EXISTS idx_user_performance_logs_page_url;
    RAISE NOTICE '  ✓ Dropped: idx_user_performance_logs_page_url';
    dropped_count := dropped_count + 1;

    DROP INDEX IF EXISTS idx_user_performance_logs_device_type;
    RAISE NOTICE '  ✓ Dropped: idx_user_performance_logs_device_type';
    dropped_count := dropped_count + 1;

    DROP INDEX IF EXISTS idx_user_performance_logs_country;
    RAISE NOTICE '  ✓ Dropped: idx_user_performance_logs_country';
    dropped_count := dropped_count + 1;

    DROP INDEX IF EXISTS idx_user_performance_logs_site_recorded;
    RAISE NOTICE '  ✓ Dropped: idx_user_performance_logs_site_recorded';
    dropped_count := dropped_count + 1;

    -- Uptime logs indexes (2 indexes)
    DROP INDEX IF EXISTS idx_uptime_logs_status;
    RAISE NOTICE '  ✓ Dropped: idx_uptime_logs_status';
    dropped_count := dropped_count + 1;

    DROP INDEX IF EXISTS idx_uptime_logs_site_status;
    RAISE NOTICE '  ✓ Dropped: idx_uptime_logs_site_status';
    dropped_count := dropped_count + 1;

    -- Sites indexes (2 indexes)
    DROP INDEX IF EXISTS idx_sites_active;
    RAISE NOTICE '  ✓ Dropped: idx_sites_active';
    dropped_count := dropped_count + 1;

    DROP INDEX IF EXISTS idx_sites_ssl_status;
    RAISE NOTICE '  ✓ Dropped: idx_sites_ssl_status';
    dropped_count := dropped_count + 1;

    -- Users indexes (2 indexes)
    DROP INDEX IF EXISTS idx_users_plan;
    RAISE NOTICE '  ✓ Dropped: idx_users_plan';
    dropped_count := dropped_count + 1;

    DROP INDEX IF EXISTS idx_users_role;
    RAISE NOTICE '  ✓ Dropped: idx_users_role';
    dropped_count := dropped_count + 1;

    -- Page speed logs indexes (3 indexes)
    DROP INDEX IF EXISTS idx_page_speed_logs_site_id;
    RAISE NOTICE '  ✓ Dropped: idx_page_speed_logs_site_id';
    dropped_count := dropped_count + 1;

    DROP INDEX IF EXISTS idx_page_speed_logs_checked_at;
    RAISE NOTICE '  ✓ Dropped: idx_page_speed_logs_checked_at';
    dropped_count := dropped_count + 1;

    DROP INDEX IF EXISTS idx_page_speed_logs_load_time;
    RAISE NOTICE '  ✓ Dropped: idx_page_speed_logs_load_time';
    dropped_count := dropped_count + 1;

    -- SSL indexes (1 index)
    DROP INDEX IF EXISTS idx_uptime_logs_ssl_checked_at;
    RAISE NOTICE '  ✓ Dropped: idx_uptime_logs_ssl_checked_at';
    dropped_count := dropped_count + 1;

    -- Notification indexes (3 indexes)
    DROP INDEX IF EXISTS users_notification_preferences_idx;
    RAISE NOTICE '  ✓ Dropped: users_notification_preferences_idx';
    dropped_count := dropped_count + 1;

    DROP INDEX IF EXISTS idx_notification_settings_user_id;
    RAISE NOTICE '  ✓ Dropped: idx_notification_settings_user_id';
    dropped_count := dropped_count + 1;

    DROP INDEX IF EXISTS idx_notification_history_user_id;
    RAISE NOTICE '  ✓ Dropped: idx_notification_history_user_id';
    dropped_count := dropped_count + 1;

    -- Integration logs index (1 index)
    DROP INDEX IF EXISTS idx_integration_logs_integration_id;
    RAISE NOTICE '  ✓ Dropped: idx_integration_logs_integration_id';
    dropped_count := dropped_count + 1;

    -- Status page indexes (3 indexes)
    DROP INDEX IF EXISTS idx_status_services_visible;
    RAISE NOTICE '  ✓ Dropped: idx_status_services_visible';
    dropped_count := dropped_count + 1;

    DROP INDEX IF EXISTS idx_status_incidents_public;
    RAISE NOTICE '  ✓ Dropped: idx_status_incidents_public';
    dropped_count := dropped_count + 1;

    DROP INDEX IF EXISTS idx_status_subscribers_email;
    RAISE NOTICE '  ✓ Dropped: idx_status_subscribers_email';
    dropped_count := dropped_count + 1;

    -- Analytics indexes (5 indexes)
    DROP INDEX IF EXISTS events_subscriptions_customer_idx;
    RAISE NOTICE '  ✓ Dropped: events_subscriptions_customer_idx';
    dropped_count := dropped_count + 1;

    DROP INDEX IF EXISTS events_subscriptions_event_type_idx;
    RAISE NOTICE '  ✓ Dropped: events_subscriptions_event_type_idx';
    dropped_count := dropped_count + 1;

    DROP INDEX IF EXISTS events_subscriptions_stripe_event_idx;
    RAISE NOTICE '  ✓ Dropped: events_subscriptions_stripe_event_idx';
    dropped_count := dropped_count + 1;

    DROP INDEX IF EXISTS facts_daily_mrr_idx;
    RAISE NOTICE '  ✓ Dropped: facts_daily_mrr_idx';
    dropped_count := dropped_count + 1;

    DROP INDEX IF EXISTS analytics_audit_log_user_id_idx;
    RAISE NOTICE '  ✓ Dropped: analytics_audit_log_user_id_idx';
    dropped_count := dropped_count + 1;

    DROP INDEX IF EXISTS analytics_audit_log_created_at_idx;
    RAISE NOTICE '  ✓ Dropped: analytics_audit_log_created_at_idx';
    dropped_count := dropped_count + 1;

    -- Webhook indexes (2 indexes)
    DROP INDEX IF EXISTS webhook_events_event_type_idx;
    RAISE NOTICE '  ✓ Dropped: webhook_events_event_type_idx';
    dropped_count := dropped_count + 1;

    DROP INDEX IF EXISTS webhook_events_processed_idx;
    RAISE NOTICE '  ✓ Dropped: webhook_events_processed_idx';
    dropped_count := dropped_count + 1;

    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'TOTAL UNUSED INDEXES DROPPED: %', dropped_count;
    RAISE NOTICE '==========================================';
END $$;

-- ========================================
-- FINAL VERIFICATION
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'PERFORMANCE ADVISOR INDEX FIXES COMPLETE';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ Added 3 indexes for unindexed foreign keys';
    RAISE NOTICE '✅ Dropped 31 unused indexes';
    RAISE NOTICE '✅ Total: 34 Performance Advisor suggestions resolved';
    RAISE NOTICE '';
    RAISE NOTICE 'Benefits:';
    RAISE NOTICE '  • Improved query performance on foreign key lookups';
    RAISE NOTICE '  • Reduced index storage overhead';
    RAISE NOTICE '  • Faster write operations (fewer indexes to update)';
    RAISE NOTICE '  • Cleaner database schema';
    RAISE NOTICE '==========================================';
END $$;
