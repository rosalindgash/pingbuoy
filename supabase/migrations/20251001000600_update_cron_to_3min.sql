-- Update cron job to run every 3 minutes instead of every minute
-- This is more efficient since Pro plans check every 3 minutes anyway

-- Unschedule the existing every-minute job
SELECT cron.unschedule('tiered-uptime-monitoring-with-ssl');

-- Schedule the new 3-minute interval job
SELECT cron.schedule(
    'tiered-uptime-monitoring-3min',
    '*/3 * * * *',  -- Every 3 minutes
    $$SELECT real_tiered_uptime_monitoring_with_ssl();$$
);

-- Update comments
COMMENT ON FUNCTION real_tiered_uptime_monitoring_with_ssl IS 'Enhanced monitoring with SSL checks - runs every 3 minutes via cron. Pro/Founder: 3min intervals, Free: 10min intervals';