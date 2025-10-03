-- Setup nightly backfill cron job for analytics
-- Recomputes the last 7 days of daily facts every night at 2 AM CST

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a stored procedure for backfill
CREATE OR REPLACE FUNCTION run_analytics_backfill()
RETURNS void AS $$
DECLARE
    target_day DATE;
BEGIN
    -- Backfill last 7 days
    FOR i IN 0..6 LOOP
        target_day := CURRENT_DATE - i;
        PERFORM recompute_daily_facts(target_day);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a stored procedure for quality checks
CREATE OR REPLACE FUNCTION run_analytics_quality_check()
RETURNS void AS $$
DECLARE
    target_day DATE;
    check_result BOOLEAN;
BEGIN
    -- Check last 7 days
    FOR i IN 0..6 LOOP
        target_day := CURRENT_DATE - i;
        check_result := check_daily_metrics_quality(target_day);

        IF NOT check_result THEN
            -- Update the data_quality_check_passed flag
            UPDATE public.facts_daily
            SET data_quality_check_passed = false
            WHERE day = target_day;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create backfill job that runs nightly at 2 AM
SELECT cron.schedule(
    'analytics-nightly-backfill',
    '0 2 * * *',
    'SELECT run_analytics_backfill();'
);

-- Create quality check job that runs at 3 AM
SELECT cron.schedule(
    'analytics-quality-check',
    '0 3 * * *',
    'SELECT run_analytics_quality_check();'
);

-- Comments
COMMENT ON FUNCTION run_analytics_backfill IS 'Backfills last 7 days of analytics data nightly';
COMMENT ON FUNCTION run_analytics_quality_check IS 'Runs data quality checks on last 7 days nightly';
