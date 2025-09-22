-- Add page speed and SSL monitoring columns to uptime_logs
ALTER TABLE public.uptime_logs
ADD COLUMN page_speed_score INTEGER,
ADD COLUMN load_time_ms INTEGER,
ADD COLUMN ssl_expires_at TIMESTAMPTZ,
ADD COLUMN ssl_valid BOOLEAN;

-- Add comments for clarity
COMMENT ON COLUMN public.uptime_logs.page_speed_score IS 'Google PageSpeed Insights score (0-100), only for Pro users';
COMMENT ON COLUMN public.uptime_logs.load_time_ms IS 'Full page load time in milliseconds, only for Pro users';
COMMENT ON COLUMN public.uptime_logs.ssl_expires_at IS 'SSL certificate expiry date, only for Pro users';
COMMENT ON COLUMN public.uptime_logs.ssl_valid IS 'Whether SSL certificate is valid, only for Pro users';

-- Add index for efficient querying of SSL expiry
CREATE INDEX IF NOT EXISTS idx_uptime_logs_ssl_expires
ON public.uptime_logs(site_id, ssl_expires_at)
WHERE ssl_expires_at IS NOT NULL;

-- Add index for page speed queries
CREATE INDEX IF NOT EXISTS idx_uptime_logs_page_speed
ON public.uptime_logs(site_id, checked_at, page_speed_score)
WHERE page_speed_score IS NOT NULL;

-- Add data retention function for plan-based limits
CREATE OR REPLACE FUNCTION public.cleanup_old_uptime_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete logs older than 7 days for free users
  DELETE FROM public.uptime_logs ul
  WHERE ul.checked_at < NOW() - INTERVAL '7 days'
  AND EXISTS (
    SELECT 1 FROM public.sites s
    JOIN public.users u ON s.user_id = u.id
    WHERE s.id = ul.site_id
    AND u.plan = 'free'
  );

  -- Delete logs older than 90 days for pro/founder users
  DELETE FROM public.uptime_logs ul
  WHERE ul.checked_at < NOW() - INTERVAL '90 days'
  AND EXISTS (
    SELECT 1 FROM public.sites s
    JOIN public.users u ON s.user_id = u.id
    WHERE s.id = ul.site_id
    AND u.plan IN ('pro', 'founder')
  );
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.cleanup_old_uptime_logs() TO service_role;