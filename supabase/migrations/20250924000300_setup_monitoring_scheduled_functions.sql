-- Set up scheduled functions for monitoring (safe version)
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
  -- Replace 'jowgayuomnzfvrrsrssl' with your actual project reference
  RETURN 'https://jowgayuomnzfvrrsrssl.supabase.co/functions/v1/' || function_name;
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

-- Remove any existing scheduled jobs to avoid conflicts
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname IN (
  'uptime-monitoring',
  'page-speed-monitoring',
  'dead-link-scanning',
  'data-cleanup'
);

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

-- Create page_speed_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS page_speed_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  load_time INTEGER NOT NULL, -- Total page load time in milliseconds
  first_byte_time INTEGER NOT NULL, -- Time to first byte in milliseconds
  page_size INTEGER NOT NULL, -- Page size in bytes
  status_code INTEGER NOT NULL, -- HTTP status code
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for page_speed_logs if they don't exist
CREATE INDEX IF NOT EXISTS idx_page_speed_logs_site_id ON page_speed_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_page_speed_logs_checked_at ON page_speed_logs(checked_at);
CREATE INDEX IF NOT EXISTS idx_page_speed_logs_load_time ON page_speed_logs(load_time);

-- Enable row level security on page_speed_logs
ALTER TABLE page_speed_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for page_speed_logs (safe creation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'page_speed_logs'
    AND policyname = 'Users can view their own page speed logs'
  ) THEN
    CREATE POLICY "Users can view their own page speed logs" ON page_speed_logs
      FOR SELECT USING (
        site_id IN (
          SELECT id FROM sites WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'page_speed_logs'
    AND policyname = 'Service role can manage all page speed logs'
  ) THEN
    CREATE POLICY "Service role can manage all page speed logs" ON page_speed_logs
      FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END
$$;