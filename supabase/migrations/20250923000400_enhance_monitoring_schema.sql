-- Enhance existing schema to support the new clean monitoring system
-- Keep Core Web Vitals separate for PingBuoy internal use

-- Add plan column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'users' AND column_name = 'plan') THEN
        ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro'));
    END IF;
END $$;

-- Add last_sign_in_at column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'users' AND column_name = 'last_sign_in_at') THEN
        ALTER TABLE users ADD COLUMN last_sign_in_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Add active column to sites table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'sites' AND column_name = 'active') THEN
        ALTER TABLE sites ADD COLUMN active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Enhance uptime_logs table to support the new monitoring types
-- Add error_message column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'uptime_logs' AND column_name = 'error_message') THEN
        ALTER TABLE uptime_logs ADD COLUMN error_message TEXT;
    END IF;
END $$;

-- Update status column to support new monitoring types
DO $$
BEGIN
    -- Drop the existing constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.check_constraints
               WHERE constraint_name = 'uptime_logs_status_check') THEN
        ALTER TABLE uptime_logs DROP CONSTRAINT uptime_logs_status_check;
    END IF;

    -- Add new constraint with additional status types
    ALTER TABLE uptime_logs ADD CONSTRAINT uptime_logs_status_check
    CHECK (status IN ('up', 'down', 'scan', 'speed', 'cleanup'));
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_uptime_logs_status ON uptime_logs(status);
CREATE INDEX IF NOT EXISTS idx_uptime_logs_site_status ON uptime_logs(site_id, status);
CREATE INDEX IF NOT EXISTS idx_uptime_logs_checked_at_desc ON uptime_logs(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_sites_active ON sites(active);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);

-- Create view for monitoring dashboard (excluding Core Web Vitals data)
CREATE OR REPLACE VIEW monitoring_dashboard AS
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
WHERE s.active = true;

-- Grant permissions for the monitoring view
GRANT SELECT ON monitoring_dashboard TO authenticated;

-- Create helper function to get site monitoring summary
CREATE OR REPLACE FUNCTION get_site_monitoring_summary(
    target_site_id uuid,
    days_back integer DEFAULT 7
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'uptime_percentage', (
            SELECT CASE
                WHEN COUNT(*) = 0 THEN 100
                ELSE ROUND((COUNT(*) FILTER (WHERE status = 'up') * 100.0) / COUNT(*), 2)
            END
            FROM uptime_logs
            WHERE site_id = target_site_id
            AND status IN ('up', 'down')
            AND checked_at > NOW() - INTERVAL '1 day' * days_back
        ),
        'avg_response_time', (
            SELECT ROUND(AVG(response_time), 0)
            FROM uptime_logs
            WHERE site_id = target_site_id
            AND status IN ('up', 'down')
            AND response_time IS NOT NULL
            AND checked_at > NOW() - INTERVAL '1 day' * days_back
        ),
        'total_checks', (
            SELECT COUNT(*)
            FROM uptime_logs
            WHERE site_id = target_site_id
            AND status IN ('up', 'down')
            AND checked_at > NOW() - INTERVAL '1 day' * days_back
        ),
        'latest_speed_score', (
            SELECT status_code
            FROM uptime_logs
            WHERE site_id = target_site_id
            AND status = 'speed'
            ORDER BY checked_at DESC
            LIMIT 1
        ),
        'latest_broken_links', (
            SELECT status_code
            FROM uptime_logs
            WHERE site_id = target_site_id
            AND status = 'scan'
            ORDER BY checked_at DESC
            LIMIT 1
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_site_monitoring_summary(uuid, integer) TO authenticated;

-- Create function to update user last sign in
CREATE OR REPLACE FUNCTION update_user_last_sign_in(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE users
    SET last_sign_in_at = NOW()
    WHERE id = user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_last_sign_in(uuid) TO authenticated;