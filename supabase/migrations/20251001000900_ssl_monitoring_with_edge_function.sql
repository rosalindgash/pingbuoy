-- SSL monitoring using dedicated Edge Function

CREATE OR REPLACE FUNCTION real_tiered_uptime_monitoring_with_ssl()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    site_record RECORD;
    uptime_response RECORD;
    ssl_response RECORD;
    response_status INTEGER;
    response_time INTEGER;
    ssl_valid BOOLEAN;
    error_msg TEXT;
    check_time TIMESTAMP WITH TIME ZONE;
    http_success BOOLEAN;
    edge_function_url TEXT;
BEGIN
    check_time := NOW();

    -- Get the Edge Function URL from environment/settings
    edge_function_url := 'https://jowgayuomnzfvrrsrssl.supabase.co/functions/v1/ssl-check';

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
            -- Check uptime using basic HTTP request
            SELECT status, content
            INTO uptime_response
            FROM net.http_get(
                site_record.url,
                headers := jsonb_build_object('User-Agent', 'PingBuoy Monitor/1.0'),
                timeout_milliseconds := 10000
            );

            -- Determine if the site is up
            http_success := (uptime_response.status = 'SUCCESS');
            response_status := CASE WHEN http_success THEN 200 ELSE 500 END;
            response_time := 1000; -- Default response time

            -- Initialize SSL status
            ssl_valid := NULL;

            -- Check SSL for HTTPS sites using Edge Function
            IF site_record.url LIKE 'https://%' THEN
                BEGIN
                    SELECT status, content
                    INTO ssl_response
                    FROM net.http_post(
                        edge_function_url,
                        jsonb_build_object('domain', site_record.url),
                        headers := jsonb_build_object(
                            'Content-Type', 'application/json',
                            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
                        ),
                        timeout_milliseconds := 15000
                    );

                    -- Parse SSL response
                    IF ssl_response.status = 'SUCCESS' AND ssl_response.content IS NOT NULL THEN
                        ssl_valid := (ssl_response.content::jsonb->>'valid')::boolean;
                    ELSE
                        ssl_valid := false; -- Edge function call failed
                    END IF;

                EXCEPTION WHEN OTHERS THEN
                    ssl_valid := false; -- SSL check failed
                END;
            END IF;

            -- Update site status
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
                       'HTTP request failed', check_time, ssl_valid,
                       CASE WHEN ssl_valid IS NOT NULL THEN check_time ELSE NULL END);
            END IF;

        EXCEPTION WHEN OTHERS THEN
            -- Handle errors
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
COMMENT ON FUNCTION real_tiered_uptime_monitoring_with_ssl IS 'Enhanced monitoring with SSL checks via Edge Function. Runs every 3 minutes via cron. Pro/Founder: 3min intervals, Free: 10min intervals';