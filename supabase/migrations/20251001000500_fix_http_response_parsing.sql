-- Fix HTTP response parsing in SSL monitoring function

CREATE OR REPLACE FUNCTION real_tiered_uptime_monitoring_with_ssl()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    site_record RECORD;
    http_response RECORD;
    response_status INTEGER;
    response_time INTEGER;
    ssl_valid BOOLEAN;
    error_msg TEXT;
    check_time TIMESTAMP WITH TIME ZONE;
    http_success BOOLEAN;
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
            -- Founder: unlimited sites, 3-minute intervals
            (u.plan = 'founder' AND (s.last_checked IS NULL OR s.last_checked <= check_time - INTERVAL '3 minutes'))
            OR
            -- Pro: 15 sites max, 3-minute intervals (SSL monitoring included)
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
            SELECT status_code, response_time_milliseconds
            INTO http_response
            FROM net.http_get(
                site_record.url,
                headers := jsonb_build_object('User-Agent', 'PingBuoy Monitor/1.0'),
                timeout_milliseconds := 10000
            );

            -- Parse response safely
            response_status := COALESCE(http_response.status_code, 500);
            response_time := COALESCE(http_response.response_time_milliseconds, 10000);
            http_success := (response_status BETWEEN 200 AND 399);

            -- Determine SSL status for HTTPS sites
            ssl_valid := NULL;
            IF site_record.url LIKE 'https://%' THEN
                -- For HTTPS sites, successful response indicates working SSL
                ssl_valid := http_success;
            END IF;

            -- Determine if site is up or down
            IF http_success THEN
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
                       'HTTP ' || response_status::text, check_time, ssl_valid,
                       CASE WHEN ssl_valid IS NOT NULL THEN check_time ELSE NULL END);
            END IF;

        EXCEPTION WHEN OTHERS THEN
            -- Handle errors with proper status code
            error_msg := SQLERRM;

            -- For HTTPS sites, connection errors usually indicate SSL issues
            ssl_valid := NULL;
            IF site_record.url LIKE 'https://%' THEN
                ssl_valid := false;
            END IF;

            UPDATE sites
            SET status = 'down',
                last_checked = check_time,
                ssl_status = CASE WHEN ssl_valid IS NOT NULL THEN ssl_valid ELSE ssl_status END,
                ssl_last_checked = CASE WHEN ssl_valid IS NOT NULL THEN check_time ELSE ssl_last_checked END
            WHERE id = site_record.id;

            -- Use 500 (Internal Server Error) instead of 0 for constraint compliance
            INSERT INTO uptime_logs (site_id, status, response_time, status_code, error_message, checked_at, ssl_valid, ssl_checked_at)
            VALUES (site_record.id, 'down', 10000, 500, error_msg, check_time, ssl_valid,
                   CASE WHEN ssl_valid IS NOT NULL THEN check_time ELSE NULL END);

            -- Log error for debugging
            RAISE LOG 'Monitoring error for site % (URL: %): %', site_record.id, site_record.url, error_msg;
        END;
    END LOOP;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION real_tiered_uptime_monitoring_with_ssl() TO service_role;

-- Update comments
COMMENT ON FUNCTION real_tiered_uptime_monitoring_with_ssl IS 'Enhanced monitoring with SSL checks for Pro+ plans (3min intervals) and Free plans (10min intervals) - Fixed HTTP response parsing';