-- Fix security definer views to use SECURITY INVOKER
-- This ensures RLS policies are enforced based on the querying user, not the view creator
-- https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view

-- Drop existing views
DROP VIEW IF EXISTS user_monitoring_info;
DROP VIEW IF EXISTS monitoring_dashboard;

-- Recreate user_monitoring_info with SECURITY INVOKER
-- This view will respect RLS policies on the underlying users table
CREATE VIEW user_monitoring_info
WITH (security_invoker = true)
AS
SELECT
    u.id,
    u.email,
    u.plan,
    get_user_monitoring_frequency(u.plan) as monitoring_frequency,
    CASE
        WHEN u.plan IN ('pro', 'founder') THEN '3 minutes'
        ELSE '10 minutes'
    END as frequency_display
FROM users u;

-- Recreate monitoring_dashboard with SECURITY INVOKER
-- This view will respect RLS policies on sites, users, and uptime_logs tables
CREATE VIEW monitoring_dashboard
WITH (security_invoker = true)
AS
SELECT
    s.id as site_id,
    s.name as site_name,
    s.url as site_url,
    s.user_id,
    u.plan as user_plan,
    u.email as user_email,

    -- Latest uptime check
    latest_uptime.status as current_status,
    latest_uptime.checked_at as last_checked,
    latest_uptime.response_time as latest_response_time,

    -- Latest speed test
    latest_speed.response_time as latest_load_time,
    latest_speed.status_code as latest_performance_score,
    latest_speed.checked_at as last_speed_test,

    -- Latest dead link scan
    latest_scan.status_code as broken_links_count,
    latest_scan.response_time as total_links_count,
    latest_scan.checked_at as last_scan_date

FROM sites s
JOIN users u ON s.user_id = u.id
LEFT JOIN LATERAL (
    SELECT status, checked_at, response_time, status_code
    FROM uptime_logs
    WHERE site_id = s.id AND status IN ('up', 'down')
    ORDER BY checked_at DESC
    LIMIT 1
) latest_uptime ON true
LEFT JOIN LATERAL (
    SELECT response_time, status_code, checked_at
    FROM uptime_logs
    WHERE site_id = s.id AND status = 'speed'
    ORDER BY checked_at DESC
    LIMIT 1
) latest_speed ON true
LEFT JOIN LATERAL (
    SELECT status_code, response_time, checked_at
    FROM uptime_logs
    WHERE site_id = s.id AND status = 'scan'
    ORDER BY checked_at DESC
    LIMIT 1
) latest_scan ON true
WHERE s.is_active = true;

-- Grant permissions
GRANT SELECT ON user_monitoring_info TO authenticated;
GRANT SELECT ON monitoring_dashboard TO authenticated;

-- Add comments
COMMENT ON VIEW user_monitoring_info IS 'User monitoring frequency info. Uses SECURITY INVOKER to enforce RLS of querying user.';
COMMENT ON VIEW monitoring_dashboard IS 'Comprehensive monitoring dashboard view. Uses SECURITY INVOKER to enforce RLS of querying user.';
