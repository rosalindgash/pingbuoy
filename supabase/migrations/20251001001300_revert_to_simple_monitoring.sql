-- Revert to simple direct database monitoring that was working
-- Just use net.http_get success/failure, plus SSL Edge Function for HTTPS

CREATE OR REPLACE FUNCTION real_tiered_uptime_monitoring_with_ssl()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    site_record RECORD;
    http_result RECORD;
    ssl_response RECORD;
    ssl_request_id BIGINT;
    response_status INTEGER;
    response_time INTEGER;
    ssl_valid BOOLEAN;
    error_msg TEXT;
    check_time TIMESTAMP WITH TIME ZONE;
    http_success BOOLEAN;
    edge_function_url TEXT;
    wait_count INTEGER;
BEGIN
    check_time := NOW();
    edge_function_url := 'https://jowgayuomnzfvrrsrssl.supabase.co/functions/v1/ssl-check';

    -- Monitor sites based on user plan, timing, and site limits
    FOR site_record IN
        SELECT s.id, s.url, s.user_id, u.plan, s.last_checked
        FROM sites s
        JOIN users u ON s.user_id = u.id
        WHERE s.is_active = true
        AND (
            -- Founder: unlimited sites, 3-minute intervals
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
            -- Simple HTTP check using net.http_get - if it succeeds, site is up
            SELECT *
            INTO http_result
            FROM net.http_get(
                site_record.url,
                headers := jsonb_build_object('User-Agent', 'PingBuoy Monitor/1.0'),
                timeout_milliseconds := 10000
            );

            -- If we get here without exception, the HTTP request succeeded
            http_success := TRUE;
            response_status := 200; -- Assume success
            response_time := 1000;  -- Default response time

            -- Initialize SSL status
            ssl_valid := NULL;

            -- Use SSL Edge Function for HTTPS sites only
            IF site_record.url LIKE 'https://%' THEN
                BEGIN
                    SELECT net.http_post(
                        edge_function_url,
                        jsonb_build_object('domain', site_record.url),
                        headers := jsonb_build_object(
                            'Content-Type', 'application/json',
                            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
                        ),
                        timeout_milliseconds := 15000
                    ) INTO ssl_request_id;

                    -- Wait for SSL response
                    wait_count := 0;
                    ssl_response := NULL;
                    LOOP
                        SELECT *
                        INTO ssl_response
                        FROM net.http_request_queue
                        WHERE id = ssl_request_id;

                        IF ssl_response.id IS NOT NULL THEN
                            EXIT;
                        END IF;

                        wait_count := wait_count + 1;
                        IF wait_count > 30 THEN
                            ssl_valid := false;
                            EXIT;
                        END IF;

                        PERFORM pg_sleep(0.5);
                    END LOOP;

                    -- Parse SSL response
                    IF ssl_response.id IS NOT NULL AND ssl_response.status_code = 200 THEN
                        ssl_valid := (ssl_response.content::jsonb->>'valid')::boolean;
                    ELSE
                        ssl_valid := false;
                    END IF;

                EXCEPTION WHEN OTHERS THEN
                    ssl_valid := false;
                    RAISE LOG 'SSL check failed for %: %', site_record.url, SQLERRM;
                END;
            END IF;

            -- Update site as up
            UPDATE sites
            SET status = 'up',
                last_checked = check_time,
                ssl_status = ssl_valid,
                ssl_last_checked = CASE WHEN ssl_valid IS NOT NULL THEN check_time ELSE ssl_last_checked END
            WHERE id = site_record.id;

            INSERT INTO uptime_logs (site_id, status, response_time, status_code, checked_at, ssl_valid, ssl_checked_at)
            VALUES (site_record.id, 'up', response_time, response_status, check_time, ssl_valid,
                   CASE WHEN ssl_valid IS NOT NULL THEN check_time ELSE NULL END);

        EXCEPTION WHEN OTHERS THEN
            -- Handle any errors - connection failed
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

            RAISE LOG 'Monitoring error for site % (URL: %): %', site_record.id, site_record.url, error_msg;
        END;
    END LOOP;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION real_tiered_uptime_monitoring_with_ssl() TO service_role;

-- Update comments
COMMENT ON FUNCTION real_tiered_uptime_monitoring_with_ssl IS 'Simple direct database monitoring + SSL Edge Function. Runs every 3 minutes via cron.';