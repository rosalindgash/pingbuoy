-- Enable required extensions for scheduled functions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper function to get the current database URL for edge functions
-- This will need to be updated with your actual Supabase project reference
CREATE OR REPLACE FUNCTION get_edge_function_url(function_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- You'll need to replace 'your-project-ref' with your actual project reference
  -- Get this from your Supabase dashboard: Settings > API > Project URL
  RETURN 'https://your-project-ref.supabase.co/functions/v1/' || function_name;
END;
$$;

-- Helper function to call edge functions with service role authentication
CREATE OR REPLACE FUNCTION call_edge_function(function_name TEXT, payload JSONB DEFAULT '{}')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response_data JSONB;
BEGIN
  SELECT INTO response_data
    net.http_post(
      url := get_edge_function_url(function_name),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase.service_role_key', true)
      ),
      body := payload
    );

  RETURN response_data;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the cron job
    RAISE LOG 'Failed to call edge function %: %', function_name, SQLERRM;
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Schedule uptime monitoring every 5 minutes
SELECT cron.schedule(
  'uptime-monitoring',
  '*/5 * * * *',
  $$SELECT call_edge_function('uptime-monitor');$$
);

-- Schedule page speed monitoring every 6 hours
SELECT cron.schedule(
  'page-speed-monitoring',
  '0 */6 * * *',
  $$SELECT call_edge_function('page-speed-monitor');$$
);

-- Schedule dead link scanning every 3 days at 2 AM
SELECT cron.schedule(
  'dead-link-scanning',
  '0 2 */3 * *',
  $$SELECT call_edge_function('dead-link-batch-scanner');$$
);

-- Schedule data cleanup daily at 1 AM
SELECT cron.schedule(
  'data-cleanup',
  '0 1 * * *',
  $$SELECT call_edge_function('data-cleanup');$$
);

-- Set up configuration (to be run manually after deployment)
-- You need to set your service role key:
-- ALTER DATABASE postgres SET app.supabase.service_role_key = 'your-service-role-key';

-- Instructions for setup:
-- 1. Replace 'your-project-ref' in get_edge_function_url() with your actual project reference
-- 2. Set your service role key using: ALTER DATABASE postgres SET app.supabase.service_role_key = 'your-actual-service-role-key';
-- 3. The scheduled functions will automatically start running according to their schedules

-- View scheduled jobs
-- SELECT * FROM cron.job;