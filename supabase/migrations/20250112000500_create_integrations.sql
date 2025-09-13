-- Create integrations table for third-party service connections
CREATE TABLE IF NOT EXISTS integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Integration identification
    name TEXT NOT NULL CHECK (LENGTH(name) <= 100),
    integration_type TEXT NOT NULL CHECK (integration_type IN ('slack', 'discord', 'webhook', 'zapier', 'microsoft_teams', 'custom')),
    status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error', 'testing')),
    
    -- Configuration data (encrypted JSON)
    config_data JSONB NOT NULL DEFAULT '{}',
    
    -- Slack-specific fields
    slack_team_id TEXT,
    slack_team_name TEXT,
    slack_channel_id TEXT,
    slack_channel_name TEXT,
    slack_webhook_url TEXT,
    slack_access_token TEXT, -- Encrypted
    
    -- Discord-specific fields
    discord_guild_id TEXT,
    discord_guild_name TEXT,
    discord_channel_id TEXT,
    discord_channel_name TEXT,
    discord_webhook_url TEXT,
    
    -- Webhook-specific fields
    webhook_url TEXT,
    webhook_method TEXT DEFAULT 'POST' CHECK (webhook_method IN ('POST', 'PUT', 'PATCH')),
    webhook_headers JSONB DEFAULT '{}',
    webhook_secret TEXT, -- For signature verification
    webhook_timeout_seconds INTEGER DEFAULT 30 CHECK (webhook_timeout_seconds >= 5 AND webhook_timeout_seconds <= 120),
    
    -- Authentication fields
    auth_type TEXT DEFAULT 'none' CHECK (auth_type IN ('none', 'bearer', 'basic', 'api_key', 'oauth2')),
    auth_credentials JSONB DEFAULT '{}', -- Encrypted
    
    -- Event filtering
    enabled_events JSONB DEFAULT '["downtime", "recovery"]'::jsonb,
    event_filters JSONB DEFAULT '{}', -- Custom filtering rules
    
    -- Rate limiting and retry configuration
    rate_limit_per_hour INTEGER DEFAULT 100 CHECK (rate_limit_per_hour >= 1 AND rate_limit_per_hour <= 1000),
    retry_attempts INTEGER DEFAULT 3 CHECK (retry_attempts >= 0 AND retry_attempts <= 10),
    retry_delay_seconds INTEGER DEFAULT 60 CHECK (retry_delay_seconds >= 5 AND retry_delay_seconds <= 3600),
    
    -- Health monitoring
    last_test_at TIMESTAMP WITH TIME ZONE,
    last_test_status TEXT CHECK (last_test_status IN ('success', 'failed', 'timeout')),
    last_test_error TEXT,
    last_notification_at TIMESTAMP WITH TIME ZONE,
    total_notifications_sent INTEGER DEFAULT 0,
    failed_notifications_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Constraints
    CONSTRAINT integrations_user_name_unique UNIQUE (user_id, name),
    CONSTRAINT slack_webhook_format CHECK (
        integration_type != 'slack' OR 
        slack_webhook_url ~ '^https://hooks\.slack\.com/services/[A-Z0-9/]+$'
    ),
    CONSTRAINT discord_webhook_format CHECK (
        integration_type != 'discord' OR 
        discord_webhook_url ~ '^https://discord(app)?\.com/api/webhooks/[0-9]+/[A-Za-z0-9_-]+$'
    ),
    CONSTRAINT webhook_url_format CHECK (
        integration_type NOT IN ('webhook', 'custom') OR 
        webhook_url ~ '^https?://[^\s/$.?#].[^\s]*$'
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS integrations_user_id_idx ON integrations(user_id);
CREATE INDEX IF NOT EXISTS integrations_type_status_idx ON integrations(integration_type, status);
CREATE INDEX IF NOT EXISTS integrations_last_test_idx ON integrations(last_test_at DESC);
CREATE INDEX IF NOT EXISTS integrations_created_at_idx ON integrations(created_at DESC);
CREATE INDEX IF NOT EXISTS integrations_enabled_events_idx ON integrations USING gin (enabled_events);

-- Enable Row Level Security
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own integrations" ON integrations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own integrations" ON integrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations" ON integrations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integrations" ON integrations
    FOR DELETE USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role full access to integrations" ON integrations
    FOR ALL USING (auth.role() = 'service_role');

-- Create integration_logs table for activity tracking
CREATE TABLE IF NOT EXISTS integration_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Event details
    event_type TEXT NOT NULL CHECK (event_type IN ('test', 'notification', 'error', 'config_change')),
    alert_type TEXT CHECK (alert_type IN ('downtime', 'recovery', 'maintenance', 'report')),
    website_id UUID, -- Reference to monitored website
    
    -- Request/Response data
    request_data JSONB,
    response_data JSONB,
    response_status INTEGER,
    response_time_ms INTEGER,
    
    -- Status and error tracking
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'timeout', 'retry')),
    error_message TEXT,
    error_code TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT integration_logs_status_code CHECK (
        (status = 'success' AND response_status >= 200 AND response_status < 300) OR
        (status != 'success') OR
        (response_status IS NULL)
    )
);

-- Create indexes for integration logs
CREATE INDEX IF NOT EXISTS integration_logs_integration_id_idx ON integration_logs(integration_id);
CREATE INDEX IF NOT EXISTS integration_logs_user_id_idx ON integration_logs(user_id);
CREATE INDEX IF NOT EXISTS integration_logs_created_at_idx ON integration_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS integration_logs_status_idx ON integration_logs(status);
CREATE INDEX IF NOT EXISTS integration_logs_event_type_idx ON integration_logs(event_type);

-- Enable RLS for integration logs
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for integration logs
CREATE POLICY "Users can view their own integration logs" ON integration_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert integration logs" ON integration_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role full access to integration logs" ON integration_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Create API keys table for user API access
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Key details
    name TEXT NOT NULL CHECK (LENGTH(name) <= 100),
    key_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of the actual key
    key_prefix TEXT NOT NULL, -- First 8 characters for identification
    
    -- Permissions and scoping
    permissions JSONB NOT NULL DEFAULT '["read"]'::jsonb,
    rate_limit_per_hour INTEGER DEFAULT 1000 CHECK (rate_limit_per_hour >= 100 AND rate_limit_per_hour <= 10000),
    allowed_ips JSONB DEFAULT '[]'::jsonb, -- IP whitelist (empty = allow all)
    
    -- Usage tracking
    last_used_at TIMESTAMP WITH TIME ZONE,
    last_used_ip INET,
    total_requests INTEGER DEFAULT 0,
    
    -- Status and expiry
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Constraints
    CONSTRAINT api_keys_user_name_unique UNIQUE (user_id, name),
    CONSTRAINT api_keys_permissions_valid CHECK (
        jsonb_typeof(permissions) = 'array' AND
        permissions ?| ARRAY['read', 'write', 'admin']
    )
);

-- Create indexes for API keys
CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS api_keys_key_hash_idx ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS api_keys_status_idx ON api_keys(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS api_keys_expires_at_idx ON api_keys(expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS for API keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- RLS policies for API keys
CREATE POLICY "Users can view their own API keys" ON api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own API keys" ON api_keys
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to API keys" ON api_keys
    FOR ALL USING (auth.role() = 'service_role');

-- Create functions for maintenance and cleanup
CREATE OR REPLACE FUNCTION update_integration_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$;

-- Create trigger for auto-updating timestamps
CREATE OR REPLACE TRIGGER update_integrations_timestamp
    BEFORE UPDATE ON integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_integration_updated_at();

CREATE OR REPLACE TRIGGER update_api_keys_timestamp
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_integration_updated_at();

-- Function to clean up old integration logs
CREATE OR REPLACE FUNCTION cleanup_old_integration_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete integration logs older than 90 days
    DELETE FROM integration_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Delete expired API keys
    UPDATE api_keys 
    SET status = 'expired'
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW() 
    AND status = 'active';
    
    RAISE NOTICE 'Integration logs cleanup completed at %', NOW();
END;
$$;

-- Function to encrypt sensitive integration data (placeholder)
CREATE OR REPLACE FUNCTION encrypt_integration_secrets(data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- In production, this would use proper encryption
    -- For now, it's a placeholder that returns the data unchanged
    -- Integration with pgcrypto or external encryption service needed
    RETURN data;
END;
$$;

-- Function to decrypt sensitive integration data (placeholder)
CREATE OR REPLACE FUNCTION decrypt_integration_secrets(data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- In production, this would decrypt the data
    -- For now, it's a placeholder that returns the data unchanged
    RETURN data;
END;
$$;

-- Grant necessary permissions
GRANT ALL ON integrations TO authenticated;
GRANT ALL ON integration_logs TO authenticated;
GRANT ALL ON api_keys TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add table comments for documentation
COMMENT ON TABLE integrations IS 'Third-party service integrations for users';
COMMENT ON TABLE integration_logs IS 'Activity log for integration events and notifications';
COMMENT ON TABLE api_keys IS 'User-generated API keys for programmatic access';

COMMENT ON COLUMN integrations.config_data IS 'Encrypted JSON configuration specific to integration type';
COMMENT ON COLUMN integrations.enabled_events IS 'Array of event types this integration should handle';
COMMENT ON COLUMN integrations.event_filters IS 'Custom filtering rules for events';
COMMENT ON COLUMN integrations.auth_credentials IS 'Encrypted authentication credentials';

COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the actual API key for secure storage';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 8 characters of key for user identification';
COMMENT ON COLUMN api_keys.permissions IS 'Array of permissions: read, write, admin';
COMMENT ON COLUMN api_keys.allowed_ips IS 'IP whitelist for additional security (empty = allow all)';