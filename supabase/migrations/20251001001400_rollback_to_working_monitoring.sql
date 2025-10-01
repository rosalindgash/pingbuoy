-- Roll back to the working uptime monitoring from before SSL implementation
-- This restores the simple working version that was functioning properly

-- Unschedule any current monitoring jobs (ignore errors if they don't exist)
DO $$
BEGIN
    PERFORM cron.unschedule('tiered-uptime-monitoring-3min');
EXCEPTION WHEN OTHERS THEN
    NULL;
END
$$;

DO $$
BEGIN
    PERFORM cron.unschedule('tiered-uptime-monitoring-with-ssl');
EXCEPTION WHEN OTHERS THEN
    NULL;
END
$$;

-- Restore the original working monitoring function (with the timestamp bug fixed)
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
            -- Pro/Founder users: check if 1+ minutes have passed
            (u.plan IN ('pro', 'founder') AND (s.last_checked IS NULL OR s.last_checked <= check_time - INTERVAL '1 minute'))
            OR
            -- Free users: check if 5+ minutes have passed
            (u.plan = 'free' AND (s.last_checked IS NULL OR s.last_checked <= check_time - INTERVAL '5 minutes'))
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
                -- Site is down (fixed the bug: was check_timestamp, now check_time)
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

-- Schedule the original working monitoring function to run every minute
SELECT cron.schedule(
    'tiered-uptime-monitoring',
    '* * * * *',  -- Every minute
    $$SELECT real_tiered_uptime_monitoring();$$
);

-- Grant permissions
GRANT EXECUTE ON FUNCTION real_tiered_uptime_monitoring() TO service_role;

-- Restore original user monitoring frequency function
CREATE OR REPLACE FUNCTION get_user_monitoring_frequency(user_plan TEXT)
RETURNS INTERVAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    CASE user_plan
        WHEN 'pro', 'founder' THEN
            RETURN INTERVAL '1 minute';
        ELSE
            RETURN INTERVAL '5 minutes';
    END CASE;
END;
$$;

-- Drop and recreate the user monitoring info view to restore original structure
DROP VIEW IF EXISTS user_monitoring_info;

CREATE VIEW user_monitoring_info AS
SELECT
    u.id,
    u.email,
    u.plan,
    get_user_monitoring_frequency(u.plan) as monitoring_frequency,
    CASE
        WHEN u.plan IN ('pro', 'founder') THEN '1 minute'
        ELSE '5 minutes'
    END as frequency_display
FROM users u;

-- Add comments
COMMENT ON FUNCTION real_tiered_uptime_monitoring IS 'Original working uptime monitoring: Pro/Founder=1min, Free=5min. No SSL monitoring.';
COMMENT ON FUNCTION get_user_monitoring_frequency IS 'Returns monitoring frequency interval based on user plan';
COMMENT ON VIEW user_monitoring_info IS 'User monitoring frequency information for frontend display';