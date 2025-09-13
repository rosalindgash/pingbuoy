-- Create notification_settings table for user alert preferences
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Email notification preferences
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    email_downtime_alerts BOOLEAN NOT NULL DEFAULT true,
    email_recovery_alerts BOOLEAN NOT NULL DEFAULT true,
    email_maintenance_alerts BOOLEAN NOT NULL DEFAULT true,
    email_weekly_reports BOOLEAN NOT NULL DEFAULT true,
    email_monthly_reports BOOLEAN NOT NULL DEFAULT false,
    
    -- SMS notification preferences (Pro feature)
    sms_enabled BOOLEAN NOT NULL DEFAULT false,
    sms_phone_number TEXT,
    sms_phone_verified BOOLEAN NOT NULL DEFAULT false,
    sms_downtime_alerts BOOLEAN NOT NULL DEFAULT false,
    sms_recovery_alerts BOOLEAN NOT NULL DEFAULT false,
    sms_critical_alerts_only BOOLEAN NOT NULL DEFAULT true,
    
    -- Webhook notification preferences (Pro feature)
    webhook_enabled BOOLEAN NOT NULL DEFAULT false,
    webhook_url TEXT,
    webhook_secret TEXT,
    webhook_downtime_alerts BOOLEAN NOT NULL DEFAULT false,
    webhook_recovery_alerts BOOLEAN NOT NULL DEFAULT false,
    webhook_maintenance_alerts BOOLEAN NOT NULL DEFAULT false,
    
    -- Slack integration preferences (Pro feature)
    slack_enabled BOOLEAN NOT NULL DEFAULT false,
    slack_webhook_url TEXT,
    slack_channel TEXT,
    slack_downtime_alerts BOOLEAN NOT NULL DEFAULT false,
    slack_recovery_alerts BOOLEAN NOT NULL DEFAULT false,
    slack_daily_summaries BOOLEAN NOT NULL DEFAULT false,
    
    -- Discord integration preferences (Pro feature)
    discord_enabled BOOLEAN NOT NULL DEFAULT false,
    discord_webhook_url TEXT,
    discord_downtime_alerts BOOLEAN NOT NULL DEFAULT false,
    discord_recovery_alerts BOOLEAN NOT NULL DEFAULT false,
    
    -- Alert timing preferences
    alert_frequency TEXT NOT NULL DEFAULT 'immediate' CHECK (alert_frequency IN ('immediate', 'every_5min', 'every_15min', 'every_hour')),
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    quiet_hours_timezone TEXT DEFAULT 'UTC',
    
    -- Advanced preferences
    escalation_enabled BOOLEAN NOT NULL DEFAULT false,
    escalation_delay_minutes INTEGER DEFAULT 15 CHECK (escalation_delay_minutes >= 5 AND escalation_delay_minutes <= 240),
    escalation_email TEXT,
    escalation_sms_number TEXT,
    
    -- Notification filtering
    min_downtime_duration_seconds INTEGER DEFAULT 60 CHECK (min_downtime_duration_seconds >= 30 AND min_downtime_duration_seconds <= 1800),
    ignore_ssl_warnings BOOLEAN NOT NULL DEFAULT false,
    ignore_minor_errors BOOLEAN NOT NULL DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Constraints
    CONSTRAINT notification_settings_user_unique UNIQUE (user_id),
    CONSTRAINT sms_phone_format CHECK (
        sms_phone_number IS NULL OR 
        sms_phone_number ~ '^\+[1-9]\d{1,14}$'
    ),
    CONSTRAINT webhook_url_format CHECK (
        webhook_url IS NULL OR 
        webhook_url ~ '^https?://[^\s/$.?#].[^\s]*$'
    ),
    CONSTRAINT slack_webhook_format CHECK (
        slack_webhook_url IS NULL OR 
        slack_webhook_url ~ '^https://hooks\.slack\.com/services/[A-Z0-9/]+$'
    ),
    CONSTRAINT discord_webhook_format CHECK (
        discord_webhook_url IS NULL OR 
        discord_webhook_url ~ '^https://discord(app)?\.com/api/webhooks/[0-9]+/[A-Za-z0-9_-]+$'
    ),
    CONSTRAINT escalation_email_format CHECK (
        escalation_email IS NULL OR 
        escalation_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    CONSTRAINT escalation_sms_format CHECK (
        escalation_sms_number IS NULL OR 
        escalation_sms_number ~ '^\+[1-9]\d{1,14}$'
    ),
    CONSTRAINT quiet_hours_valid CHECK (
        (quiet_hours_enabled = false) OR 
        (quiet_hours_start IS NOT NULL AND quiet_hours_end IS NOT NULL)
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS notification_settings_user_id_idx ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS notification_settings_updated_at_idx ON notification_settings(updated_at DESC);
CREATE INDEX IF NOT EXISTS notification_settings_email_enabled_idx ON notification_settings(email_enabled) WHERE email_enabled = true;
CREATE INDEX IF NOT EXISTS notification_settings_sms_enabled_idx ON notification_settings(sms_enabled) WHERE sms_enabled = true;
CREATE INDEX IF NOT EXISTS notification_settings_webhook_enabled_idx ON notification_settings(webhook_enabled) WHERE webhook_enabled = true;

-- Enable Row Level Security
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own notification settings" ON notification_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings" ON notification_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings" ON notification_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification settings" ON notification_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Service role has full access for system operations
CREATE POLICY "Service role full access" ON notification_settings
    FOR ALL USING (auth.role() = 'service_role');

-- Create function to automatically create default notification settings for new users
CREATE OR REPLACE FUNCTION create_default_notification_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO notification_settings (
        user_id,
        email_enabled,
        email_downtime_alerts,
        email_recovery_alerts,
        email_maintenance_alerts,
        email_weekly_reports,
        alert_frequency,
        min_downtime_duration_seconds
    ) VALUES (
        NEW.id,
        true,
        true,
        true,
        false,
        true,
        'immediate',
        60
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail user creation
        RAISE WARNING 'Failed to create default notification settings for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Create trigger to auto-create notification settings for new users
CREATE OR REPLACE TRIGGER create_user_notification_settings
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_notification_settings();

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$;

-- Create trigger to auto-update timestamp
CREATE OR REPLACE TRIGGER update_notification_settings_timestamp
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_settings_updated_at();

-- Create notification_history table for audit trail
CREATE TABLE IF NOT EXISTS notification_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    website_id UUID, -- References websites table (to be created)
    notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'sms', 'webhook', 'slack', 'discord')),
    alert_type TEXT NOT NULL CHECK (alert_type IN ('downtime', 'recovery', 'maintenance', 'report')),
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'queued', 'delivered')),
    recipient TEXT NOT NULL,
    subject TEXT,
    message_preview TEXT,
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Constraints
    CONSTRAINT notification_history_recipient_format CHECK (
        (notification_type = 'email' AND recipient ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') OR
        (notification_type = 'sms' AND recipient ~ '^\+[1-9]\d{1,14}$') OR
        (notification_type IN ('webhook', 'slack', 'discord') AND recipient ~ '^https?://[^\s/$.?#].[^\s]*$')
    )
);

-- Create indexes for notification history
CREATE INDEX IF NOT EXISTS notification_history_user_id_idx ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS notification_history_sent_at_idx ON notification_history(sent_at DESC);
CREATE INDEX IF NOT EXISTS notification_history_status_idx ON notification_history(status);
CREATE INDEX IF NOT EXISTS notification_history_type_idx ON notification_history(notification_type, alert_type);

-- Enable RLS for notification history
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification history
CREATE POLICY "Users can view their own notification history" ON notification_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notification history" ON notification_history
    FOR INSERT WITH CHECK (true); -- System service inserts records

CREATE POLICY "Service role full access to notification history" ON notification_history
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON notification_settings TO authenticated;
GRANT ALL ON notification_history TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create cleanup function for old notification history
CREATE OR REPLACE FUNCTION cleanup_old_notification_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete notification history older than 90 days
    DELETE FROM notification_history 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    RAISE NOTICE 'Notification history cleanup completed at %', NOW();
END;
$$;

-- Add table comments
COMMENT ON TABLE notification_settings IS 'User notification preferences and alert configuration';
COMMENT ON TABLE notification_history IS 'Audit trail of all notifications sent to users';
COMMENT ON COLUMN notification_settings.user_id IS 'Reference to auth.users table';
COMMENT ON COLUMN notification_settings.alert_frequency IS 'How often to send repeat alerts for ongoing issues';
COMMENT ON COLUMN notification_settings.quiet_hours_enabled IS 'Whether to suppress non-critical alerts during quiet hours';
COMMENT ON COLUMN notification_settings.escalation_enabled IS 'Whether to send escalated alerts after delay';
COMMENT ON COLUMN notification_settings.min_downtime_duration_seconds IS 'Minimum downtime before sending alert (reduces false positives)';