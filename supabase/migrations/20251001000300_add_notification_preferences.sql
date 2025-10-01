-- Add notification preferences column to users table

-- Add notification_preferences column to store user notification settings
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"uptime_alerts": true, "dead_link_reports": true, "recovery_notifications": true}';

-- Add comment explaining the column
COMMENT ON COLUMN public.users.notification_preferences IS 'User notification preferences stored as JSON with settings for uptime_alerts, dead_link_reports, and recovery_notifications';

-- Create index for querying notification preferences
CREATE INDEX IF NOT EXISTS users_notification_preferences_idx ON public.users USING GIN (notification_preferences);