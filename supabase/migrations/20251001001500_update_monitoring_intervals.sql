-- Update monitoring intervals to 3 minutes for Pro/Founder and 10 minutes for Free
-- Also update cron job to run every 3 minutes instead of every minute for efficiency

-- Update the monitoring frequency function
CREATE OR REPLACE FUNCTION get_user_monitoring_frequency(user_plan TEXT)
RETURNS INTERVAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    CASE user_plan
        WHEN 'pro', 'founder' THEN
            RETURN INTERVAL '3 minutes';
        ELSE
            RETURN INTERVAL '10 minutes';
    END CASE;
END;
$$;

-- Update the monitoring function with new intervals
CREATE OR REPLACE FUNCTION real_tiered_uptime_monitoring()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    site_record RECORD;
    request_record RECORD;
    response_status INTEGER;
    response_time INTEGER;
    error_msg TEXT;
    check_time TIMESTAMP WITH TIME ZONE;
BEGIN
    check_time := NOW();

    -- Monitor sites based on user plan and last check timing
    FOR site_record IN
        SELECT s.id, s.url, s.user_id, u.plan, s.last_checked
        FROM sites s
        JOIN users u ON s.user_id = u.id
        WHERE s.is_active = true
        AND (
            -- Pro/Founder users: check if 3+ minutes have passed
            (u.plan IN ('pro', 'founder') AND (s.last_checked IS NULL OR s.last_checked <= check_time - INTERVAL '3 minutes'))
            OR
            -- Free users: check if 10+ minutes have passed
            (u.plan = 'free' AND (s.last_checked IS NULL OR s.last_checked <= check_time - INTERVAL '10 minutes'))
        )
    LOOP
        BEGIN
            -- Make HTTP request to the site
            SELECT status, content::json->>'status_code' as status_code,
                   (content::json->>'response_time')::integer as resp_time
            INTO request_record
            FROM net.http_get(
                site_record.url,
                headers := jsonb_build_object('User-Agent', 'PingBuoy Monitor/1.0'),
                timeout_milliseconds := 10000
            );

            -- Parse response
            response_status := COALESCE((request_record.status_code)::integer, 100);
            response_time := COALESCE(request_record.resp_time, 10000);

            -- Determine if site is up or down
            IF request_record.status = 'SUCCESS' AND response_status BETWEEN 200 AND 399 THEN
                -- Site is up
                UPDATE sites
                SET status = 'up', last_checked = check_time
                WHERE id = site_record.id;

                INSERT INTO uptime_logs (site_id, status, response_time, status_code, checked_at)
                VALUES (site_record.id, 'up', response_time, response_status, check_time);

            ELSE
                -- Site is down
                UPDATE sites
                SET status = 'down', last_checked = check_time
                WHERE id = site_record.id;

                INSERT INTO uptime_logs (site_id, status, response_time, status_code, error_message, checked_at)
                VALUES (site_record.id, 'down', response_time, response_status,
                       COALESCE(request_record.status, 'Unknown error'), check_time);
            END IF;

        EXCEPTION WHEN OTHERS THEN
            -- Handle errors
            error_msg := SQLERRM;

            UPDATE sites
            SET status = 'down', last_checked = check_time
            WHERE id = site_record.id;

            INSERT INTO uptime_logs (site_id, status, response_time, status_code, error_message, checked_at)
            VALUES (site_record.id, 'down', 10000, 500, error_msg, check_time);

            -- Log error for debugging
            RAISE LOG 'Monitoring error for site % (URL: %): %', site_record.id, site_record.url, error_msg;
        END;
    END LOOP;
END;
$$;

-- Unschedule the current every-minute job
DO $$
BEGIN
    PERFORM cron.unschedule('tiered-uptime-monitoring');
EXCEPTION WHEN OTHERS THEN
    NULL;
END
$$;

-- Schedule new job to run every 3 minutes (more efficient)
SELECT cron.schedule(
    'tiered-uptime-monitoring-3min',
    '*/3 * * * *',  -- Every 3 minutes
    $$SELECT real_tiered_uptime_monitoring();$$
);

-- Drop and recreate the user monitoring info view with updated intervals
DROP VIEW IF EXISTS user_monitoring_info;

CREATE VIEW user_monitoring_info AS
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

-- Grant permissions
GRANT SELECT ON user_monitoring_info TO authenticated;

-- Add comments
COMMENT ON FUNCTION real_tiered_uptime_monitoring IS 'Updated uptime monitoring: Pro/Founder=3min, Free=10min. Runs every 3 minutes.';
COMMENT ON FUNCTION get_user_monitoring_frequency IS 'Returns monitoring frequency: Pro/Founder=3min, Free=10min';
COMMENT ON VIEW user_monitoring_info IS 'User monitoring frequency: Pro/Founder=3min, Free=10min';