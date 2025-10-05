-- Implement the simple SSL monitoring strategy
-- Replace existing function and update cron job

-- Ensure uptime_logs table has ssl_valid column
ALTER TABLE uptime_logs ADD COLUMN IF NOT EXISTS ssl_valid BOOLEAN DEFAULT NULL;

-- Replace the existing monitoring function with the new simplified approach
CREATE OR REPLACE FUNCTION real_uptime_monitoring()
RETURNS TABLE(checked_count INTEGER, results JSONB)
LANGUAGE plpgsql
AS $$
DECLARE
    site_record RECORD;
    http_response RECORD;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    site_status TEXT;
    response_time_ms INTEGER;
    ssl_valid BOOLEAN;
    check_results JSONB := '[]'::jsonb;
    total_checked INTEGER := 0;
BEGIN
    FOR site_record IN
        SELECT s.id, s.name, s.url, s.user_id, u.plan
        FROM sites s
        JOIN users u ON s.user_id = u.id
        WHERE s.is_active = true
        AND (
            (u.plan IN ('pro', 'founder') AND (s.last_checked IS NULL OR s.last_checked <= NOW() - INTERVAL '3 minutes'))
            OR
            (u.plan = 'free' AND (s.last_checked IS NULL OR s.last_checked <= NOW() - INTERVAL '10 minutes'))
        )
    LOOP
        BEGIN
            start_time := clock_timestamp();

            SELECT * INTO http_response
            FROM http_get(site_record.url);

            end_time := clock_timestamp();
            response_time_ms := EXTRACT(milliseconds FROM (end_time - start_time))::INTEGER;
            site_status := CASE WHEN http_response.status < 400 THEN 'up' ELSE 'down' END;

            -- Simple SSL check: if it's HTTPS and the request succeeded, SSL is working
            ssl_valid := NULL;
            IF site_record.url LIKE 'https://%' THEN
                ssl_valid := (http_response.status < 400);
            END IF;

            UPDATE sites SET
                status = site_status,
                last_checked = NOW()
            WHERE id = site_record.id;

            INSERT INTO uptime_logs (site_id, status, response_time, status_code, ssl_valid, checked_at)
            VALUES (site_record.id, site_status, response_time_ms, http_response.status, ssl_valid, NOW());

            total_checked := total_checked + 1;

        EXCEPTION WHEN OTHERS THEN
            UPDATE sites SET
                status = 'down',
                last_checked = NOW()
            WHERE id = site_record.id;

            -- Set ssl_valid to NULL for HTTPS sites when request fails (can't determine if SSL issue or other issue)
            INSERT INTO uptime_logs (site_id, status, response_time, status_code, ssl_valid, checked_at)
            VALUES (site_record.id, 'down', NULL, NULL, NULL, NOW());

            total_checked := total_checked + 1;
        END;
    END LOOP;

    checked_count := total_checked;
    results := check_results;
    RETURN NEXT;
END;
$$;

-- Unschedule the old cron job
DO $$
BEGIN
    PERFORM cron.unschedule('tiered-uptime-monitoring-3min');
EXCEPTION WHEN OTHERS THEN
    NULL;
END
$$;

-- Schedule new cron job with the updated function name
SELECT cron.schedule(
    'simple-uptime-monitoring-3min',
    '*/3 * * * *',  -- Every 3 minutes
    $$SELECT real_uptime_monitoring();$$
);

-- Grant permissions
GRANT EXECUTE ON FUNCTION real_uptime_monitoring() TO service_role;

-- Add comment
COMMENT ON FUNCTION real_uptime_monitoring IS 'Simple SSL monitoring: HTTPS success = SSL valid, uses http_get() function. Pro/Founder=3min, Free=10min intervals';