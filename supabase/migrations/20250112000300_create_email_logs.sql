-- Create email_logs table for secure email tracking
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_email TEXT NOT NULL,
    template_name TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Add constraints
    CONSTRAINT email_logs_recipient_email_check CHECK (
        recipient_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    CONSTRAINT email_logs_template_name_check CHECK (
        LENGTH(template_name) <= 100
    ),
    CONSTRAINT email_logs_error_message_check CHECK (
        error_message IS NULL OR LENGTH(error_message) <= 1000
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS email_logs_recipient_email_idx ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS email_logs_sent_at_idx ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS email_logs_template_name_idx ON email_logs(template_name);
CREATE INDEX IF NOT EXISTS email_logs_success_idx ON email_logs(success);

-- Create composite index for rate limiting queries
CREATE INDEX IF NOT EXISTS email_logs_rate_limiting_idx ON email_logs(recipient_email, sent_at DESC) WHERE success = true;

-- Add Row Level Security (RLS)
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access only (no user access to email logs)
CREATE POLICY "Service role can manage email logs" ON email_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Create policy to prevent regular users from accessing email logs
CREATE POLICY "No user access to email logs" ON email_logs
    FOR ALL USING (false);

-- Grant permissions
GRANT ALL ON email_logs TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Create function to clean old email logs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_email_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete email logs older than 90 days
    DELETE FROM email_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Log cleanup operation
    RAISE NOTICE 'Email logs cleanup completed at %', NOW();
END;
$$;

-- Create a scheduled job to run cleanup weekly (if pg_cron is available)
-- Note: This would need to be enabled by Supabase support
-- SELECT cron.schedule('cleanup-email-logs', '0 2 * * 0', 'SELECT cleanup_old_email_logs();');

-- Add comments for documentation
COMMENT ON TABLE email_logs IS 'Secure logging table for email sending activities with PII protection';
COMMENT ON COLUMN email_logs.recipient_email IS 'Email address of recipient (validated format)';
COMMENT ON COLUMN email_logs.template_name IS 'Name of email template used';
COMMENT ON COLUMN email_logs.sent_at IS 'Timestamp when email was sent';
COMMENT ON COLUMN email_logs.success IS 'Whether email was sent successfully';
COMMENT ON COLUMN email_logs.error_message IS 'Error details if sending failed';
COMMENT ON COLUMN email_logs.ip_address IS 'IP address of sending server';
COMMENT ON COLUMN email_logs.user_agent IS 'User agent of email client/service';