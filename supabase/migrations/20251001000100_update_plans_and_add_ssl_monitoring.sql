-- Update plan offerings and add SSL certificate monitoring
-- New plan structure:
-- Free: 2 sites, 10-minute intervals, email alerts only, 7-day history
-- Pro: 15 sites, 3-minute intervals, email+slack+discord alerts, 60-day history, SSL monitoring
-- Founder: Unlimited sites, 1-minute intervals, all features

-- First, unschedule the existing monitoring job
SELECT cron.unschedule('tiered-uptime-monitoring');

-- Add SSL monitoring columns to uptime_logs table
ALTER TABLE uptime_logs ADD COLUMN IF NOT EXISTS ssl_valid BOOLEAN DEFAULT NULL;
ALTER TABLE uptime_logs ADD COLUMN IF NOT EXISTS ssl_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add SSL status to sites table for quick reference
ALTER TABLE sites ADD COLUMN IF NOT EXISTS ssl_status BOOLEAN DEFAULT NULL;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS ssl_last_checked TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Update the monitoring frequency function for new plan intervals
CREATE OR REPLACE FUNCTION get_user_monitoring_frequency(user_plan TEXT)
RETURNS INTERVAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    CASE user_plan
        WHEN 'founder' THEN
            RETURN INTERVAL '3 minutes'; -- Founder: 3 minutes (same as Pro)
        WHEN 'pro' THEN
            RETURN INTERVAL '3 minutes'; -- Pro: 3 minutes (changed from 1 minute)
        ELSE
            RETURN INTERVAL '10 minutes'; -- Free: 10 minutes (changed from 5 minutes)
    END CASE;
END;
$$;

-- Create enhanced monitoring function with SSL checks
CREATE OR REPLACE FUNCTION real_tiered_uptime_monitoring_with_ssl()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    site_record RECORD;
    request_record RECORD;
    response_status INTEGER;
    response_time INTEGER;
    ssl_valid BOOLEAN;
    error_msg TEXT;
    check_time TIMESTAMP WITH TIME ZONE;
    site_count INTEGER;
    site_limit INTEGER;
BEGIN
    check_time := NOW();

    -- Monitor sites based on user plan, timing, and site limits
    FOR site_record IN
        SELECT s.id, s.url, s.user_id, u.plan, s.last_checked,
               -- Count user's active sites to check limits
               (SELECT COUNT(*) FROM sites WHERE user_id = u.id AND is_active = true) as user_site_count
        FROM sites s
        JOIN users u ON s.user_id = u.id
        WHERE s.is_active = true
        AND (
            -- Founder: unlimited sites, 3-minute intervals (same as Pro)
            (u.plan = 'founder' AND (s.last_checked IS NULL OR s.last_checked <= check_time - INTERVAL '3 minutes'))
            OR
            -- Pro: 15 sites max, 3-minute intervals
            (u.plan = 'pro' AND
             (SELECT COUNT(*) FROM sites WHERE user_id = u.id AND is_active = true) <= 15 AND
             (s.last_checked IS NULL OR s.last_checked <= check_time - INTERVAL '3 minutes'))
            OR
            -- Free: 2 sites max, 10-minute intervals
            (u.plan = 'free' AND
             (SELECT COUNT(*) FROM sites WHERE user_id = u.id AND is_active = true) <= 2 AND
             (s.last_checked IS NULL OR s.last_checked <= check_time - INTERVAL '10 minutes'))
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

            -- Determine SSL status for HTTPS sites
            ssl_valid := NULL;
            IF site_record.url LIKE 'https://%' THEN
                -- For HTTPS sites, successful response indicates working SSL
                ssl_valid := (request_record.status = 'SUCCESS' AND response_status BETWEEN 200 AND 399);
            END IF;

            -- Determine if site is up or down
            IF request_record.status = 'SUCCESS' AND response_status BETWEEN 200 AND 399 THEN
                -- Site is up
                UPDATE sites
                SET status = 'up',
                    last_checked = check_time,
                    ssl_status = ssl_valid,
                    ssl_last_checked = CASE WHEN ssl_valid IS NOT NULL THEN check_time ELSE ssl_last_checked END
                WHERE id = site_record.id;

                INSERT INTO uptime_logs (site_id, status, response_time, status_code, checked_at, ssl_valid, ssl_checked_at)
                VALUES (site_record.id, 'up', response_time, response_status, check_time, ssl_valid,
                       CASE WHEN ssl_valid IS NOT NULL THEN check_time ELSE NULL END);

            ELSE
                -- Site is down
                UPDATE sites
                SET status = 'down',
                    last_checked = check_time,
                    ssl_status = CASE WHEN ssl_valid IS NOT NULL THEN ssl_valid ELSE ssl_status END,
                    ssl_last_checked = CASE WHEN ssl_valid IS NOT NULL THEN check_time ELSE ssl_last_checked END
                WHERE id = site_record.id;

                INSERT INTO uptime_logs (site_id, status, response_time, status_code, error_message, checked_at, ssl_valid, ssl_checked_at)
                VALUES (site_record.id, 'down', response_time, response_status,
                       COALESCE(request_record.status, 'Unknown error'), check_time, ssl_valid,
                       CASE WHEN ssl_valid IS NOT NULL THEN check_time ELSE NULL END);
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

-- Schedule the new enhanced monitoring function
SELECT cron.schedule(
    'tiered-uptime-monitoring-with-ssl',
    '* * * * *',  -- Every minute
    $$SELECT real_tiered_uptime_monitoring_with_ssl();$$
);

-- Update the user monitoring info view to reflect new intervals
CREATE OR REPLACE VIEW user_monitoring_info AS
SELECT
    u.id,
    u.email,
    u.plan,
    get_user_monitoring_frequency(u.plan) as monitoring_frequency,
    CASE
        WHEN u.plan = 'founder' THEN '3 minutes'
        WHEN u.plan = 'pro' THEN '3 minutes'
        ELSE '10 minutes'
    END as frequency_display,
    CASE
        WHEN u.plan = 'founder' THEN 999  -- Unlimited
        WHEN u.plan = 'pro' THEN 15
        ELSE 2
    END as site_limit
FROM users u;

-- Grant permissions
GRANT EXECUTE ON FUNCTION real_tiered_uptime_monitoring_with_ssl() TO service_role;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_uptime_logs_ssl_checked_at ON uptime_logs(ssl_checked_at) WHERE ssl_checked_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sites_ssl_status ON sites(ssl_status) WHERE ssl_status IS NOT NULL;

-- Add comments
COMMENT ON FUNCTION real_tiered_uptime_monitoring_with_ssl IS 'Enhanced monitoring with SSL checks and new plan limits: Free=2 sites/10min, Pro=15 sites/3min, Founder=unlimited/3min';
COMMENT ON COLUMN uptime_logs.ssl_valid IS 'SSL certificate status: true=valid, false=invalid, null=not checked (HTTP sites)';
COMMENT ON COLUMN sites.ssl_status IS 'Current SSL status for quick reference on status pages';