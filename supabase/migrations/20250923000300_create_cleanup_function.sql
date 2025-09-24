-- Create cleanup function for data retention based on user plans
CREATE OR REPLACE FUNCTION cleanup_old_data() RETURNS void AS $$
BEGIN
  -- Free users: keep uptime logs for 30 days, Pro users: keep for 90 days
  DELETE FROM uptime_logs
  WHERE checked_at < NOW() - INTERVAL '30 days'
  AND site_id IN (
    SELECT s.id FROM sites s
    JOIN users u ON s.user_id = u.id
    WHERE u.plan = 'free' OR u.plan IS NULL
  );

  DELETE FROM uptime_logs
  WHERE checked_at < NOW() - INTERVAL '90 days'
  AND site_id IN (
    SELECT s.id FROM sites s
    JOIN users u ON s.user_id = u.id
    WHERE u.plan = 'pro'
  );

  -- Clean up very old scan and speed test data (marked with status 'scan' and 'speed')
  -- Free users: keep for 7 days, Pro users: keep for 30 days
  DELETE FROM uptime_logs
  WHERE checked_at < NOW() - INTERVAL '7 days'
  AND status IN ('scan', 'speed')
  AND site_id IN (
    SELECT s.id FROM sites s
    JOIN users u ON s.user_id = u.id
    WHERE u.plan = 'free' OR u.plan IS NULL
  );

  DELETE FROM uptime_logs
  WHERE checked_at < NOW() - INTERVAL '30 days'
  AND status IN ('scan', 'speed')
  AND site_id IN (
    SELECT s.id FROM sites s
    JOIN users u ON s.user_id = u.id
    WHERE u.plan = 'pro'
  );

  -- Clean up inactive user data (users who haven't logged in for 6 months)
  -- But keep the user record, just clean their monitoring data
  DELETE FROM uptime_logs
  WHERE checked_at < NOW() - INTERVAL '6 months'
  AND site_id IN (
    SELECT s.id FROM sites s
    JOIN users u ON s.user_id = u.id
    WHERE u.last_sign_in_at < NOW() - INTERVAL '6 months'
  );

  -- Log cleanup completion
  INSERT INTO uptime_logs (site_id, status, response_time, status_code, error_message, checked_at)
  SELECT
    (SELECT id FROM sites LIMIT 1), -- Use first site as cleanup marker
    'cleanup',
    EXTRACT(EPOCH FROM NOW())::INTEGER,
    200,
    'Data cleanup completed',
    NOW()
  WHERE EXISTS (SELECT 1 FROM sites LIMIT 1);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role for cron jobs
GRANT EXECUTE ON FUNCTION cleanup_old_data() TO service_role;