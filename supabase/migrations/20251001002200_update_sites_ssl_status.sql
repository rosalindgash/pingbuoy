-- Update the monitoring function to write SSL status to sites table
-- Fix both UPDATE statements to include ssl_status and ssl_last_checked

-- Ensure sites table has the SSL columns
ALTER TABLE sites ADD COLUMN IF NOT EXISTS ssl_status BOOLEAN DEFAULT NULL;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS ssl_last_checked TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Update the monitoring function to write SSL status to sites table
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

            -- Update sites table with status AND SSL status
            UPDATE sites SET
                status = site_status,
                last_checked = NOW(),
                ssl_status = ssl_valid,
                ssl_last_checked = CASE WHEN ssl_valid IS NOT NULL THEN NOW() ELSE ssl_last_checked END
            WHERE id = site_record.id;

            INSERT INTO uptime_logs (site_id, status, response_time, status_code, ssl_valid, checked_at)
            VALUES (site_record.id, site_status, response_time_ms, http_response.status, ssl_valid, NOW());

            total_checked := total_checked + 1;

        EXCEPTION WHEN OTHERS THEN
            -- Update sites table with down status AND set SSL to NULL for failures
            UPDATE sites SET
                status = 'down',
                last_checked = NOW(),
                ssl_status = NULL,
                ssl_last_checked = CASE WHEN site_record.url LIKE 'https://%' THEN NOW() ELSE ssl_last_checked END
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

-- Add comment
COMMENT ON FUNCTION real_uptime_monitoring IS 'Simple SSL monitoring: updates both uptime_logs and sites table with SSL status. HTTPS success = SSL valid.';