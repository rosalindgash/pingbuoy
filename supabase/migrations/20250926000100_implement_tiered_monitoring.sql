-- Implement tiered monitoring system based on user plans
-- Pro/Founder users: 1-minute monitoring
-- Free users: 5-minute monitoring

-- First, unschedule existing monitoring job
SELECT cron.unschedule('uptime-monitoring');

-- Create enhanced monitoring function that respects user tiers
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
            response_status := COALESCE((request_record.status_code)::integer, 0);
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
                SET status = 'down', last_checked = check_timestamp
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
            VALUES (site_record.id, 'down', 10000, 0, error_msg, check_time);

            -- Log error for debugging
            RAISE LOG 'Monitoring error for site % (URL: %): %', site_record.id, site_record.url, error_msg;
        END;
    END LOOP;
END;
$$;

-- Schedule the new tiered monitoring function to run every minute
-- The function itself will determine which sites to check based on user plan
SELECT cron.schedule(
    'tiered-uptime-monitoring',
    '* * * * *',  -- Every minute
    $$SELECT real_tiered_uptime_monitoring();$$
);

-- Create function to get monitoring frequency for a user
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

-- Create function to get next check time for a site
CREATE OR REPLACE FUNCTION get_next_check_time(site_uuid UUID)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    site_data RECORD;
    frequency INTERVAL;
BEGIN
    SELECT s.last_checked, u.plan
    INTO site_data
    FROM sites s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = site_uuid;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    frequency := get_user_monitoring_frequency(site_data.plan);

    IF site_data.last_checked IS NULL THEN
        RETURN NOW();
    ELSE
        RETURN site_data.last_checked + frequency;
    END IF;
END;
$$;

-- Add monitoring frequency info to users view for frontend
CREATE OR REPLACE VIEW user_monitoring_info AS
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

-- Grant permissions
GRANT SELECT ON user_monitoring_info TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_monitoring_frequency(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_check_time(UUID) TO authenticated;

-- Add comments
COMMENT ON FUNCTION real_tiered_uptime_monitoring IS 'Monitors sites based on user plan: Pro/Founder=1min, Free=5min';
COMMENT ON FUNCTION get_user_monitoring_frequency IS 'Returns monitoring frequency interval based on user plan';
COMMENT ON FUNCTION get_next_check_time IS 'Returns the next scheduled check time for a site';
COMMENT ON VIEW user_monitoring_info IS 'User monitoring frequency information for frontend display';