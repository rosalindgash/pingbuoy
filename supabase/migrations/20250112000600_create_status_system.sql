-- Create status page tables for PingBuoy's own uptime tracking
CREATE TABLE IF NOT EXISTS status_services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Service details
    name TEXT NOT NULL CHECK (LENGTH(name) <= 100),
    description TEXT CHECK (LENGTH(description) <= 500),
    service_type TEXT NOT NULL CHECK (service_type IN ('website', 'api', 'database', 'cdn', 'monitoring')),
    
    -- Service configuration
    check_url TEXT, -- URL to monitor (if applicable)
    check_method TEXT DEFAULT 'GET' CHECK (check_method IN ('GET', 'POST', 'HEAD')),
    expected_status_codes INTEGER[] DEFAULT ARRAY[200],
    timeout_seconds INTEGER DEFAULT 30 CHECK (timeout_seconds >= 5 AND timeout_seconds <= 120),
    check_interval_minutes INTEGER DEFAULT 5 CHECK (check_interval_minutes >= 1 AND check_interval_minutes <= 60),
    
    -- Current status
    current_status TEXT NOT NULL DEFAULT 'operational' CHECK (current_status IN ('operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance')),
    last_checked_at TIMESTAMP WITH TIME ZONE,
    last_incident_at TIMESTAMP WITH TIME ZONE,
    
    -- Display settings
    display_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create status incidents table
CREATE TABLE IF NOT EXISTS status_incidents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Incident details
    title TEXT NOT NULL CHECK (LENGTH(title) <= 200),
    description TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
    impact TEXT NOT NULL CHECK (impact IN ('none', 'minor', 'major', 'critical')),
    
    -- Affected services
    affected_services UUID[] DEFAULT ARRAY[]::UUID[], -- References status_services.id
    
    -- Timeline
    started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- External communication
    is_public BOOLEAN DEFAULT true,
    notify_subscribers BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by TEXT DEFAULT 'system',
    
    -- Constraints
    CONSTRAINT incidents_resolved_after_started CHECK (
        resolved_at IS NULL OR resolved_at >= started_at
    )
);

-- Create incident updates table
CREATE TABLE IF NOT EXISTS status_incident_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    incident_id UUID NOT NULL REFERENCES status_incidents(id) ON DELETE CASCADE,
    
    -- Update details
    status TEXT NOT NULL CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
    message TEXT NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by TEXT DEFAULT 'system'
);

-- Create status checks table for monitoring history
CREATE TABLE IF NOT EXISTS status_checks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES status_services(id) ON DELETE CASCADE,
    
    -- Check results
    status TEXT NOT NULL CHECK (status IN ('up', 'down', 'degraded')),
    response_time_ms INTEGER,
    status_code INTEGER,
    error_message TEXT,
    
    -- Check metadata
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    check_location TEXT DEFAULT 'primary',
    
    -- Constraints
    CONSTRAINT status_checks_response_time CHECK (
        response_time_ms IS NULL OR 
        (response_time_ms >= 0 AND response_time_ms <= 300000) -- Max 5 minutes
    )
);

-- Create maintenance schedules table
CREATE TABLE IF NOT EXISTS status_maintenance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Maintenance details
    title TEXT NOT NULL CHECK (LENGTH(title) <= 200),
    description TEXT NOT NULL,
    maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('scheduled', 'emergency')),
    
    -- Affected services
    affected_services UUID[] DEFAULT ARRAY[]::UUID[], -- References status_services.id
    
    -- Schedule
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    
    -- Communication
    is_public BOOLEAN DEFAULT true,
    notify_subscribers BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by TEXT DEFAULT 'system',
    
    -- Constraints
    CONSTRAINT maintenance_end_after_start CHECK (scheduled_end > scheduled_start),
    CONSTRAINT maintenance_actual_end_after_start CHECK (
        actual_end IS NULL OR actual_start IS NULL OR actual_end >= actual_start
    )
);

-- Create status subscribers table
CREATE TABLE IF NOT EXISTS status_subscribers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Subscriber details
    email TEXT NOT NULL CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    
    -- Subscription preferences
    subscribed_services UUID[] DEFAULT ARRAY[]::UUID[], -- Empty means all services
    incident_notifications BOOLEAN DEFAULT true,
    maintenance_notifications BOOLEAN DEFAULT true,
    
    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verification_token TEXT,
    verification_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    unsubscribe_token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Constraints
    CONSTRAINT status_subscribers_email_unique UNIQUE (email)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS status_services_active_idx ON status_services(is_active, display_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS status_services_visible_idx ON status_services(is_visible, display_order) WHERE is_visible = true;

CREATE INDEX IF NOT EXISTS status_incidents_public_idx ON status_incidents(is_public, started_at DESC) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS status_incidents_status_idx ON status_incidents(status, started_at DESC);
CREATE INDEX IF NOT EXISTS status_incidents_impact_idx ON status_incidents(impact, started_at DESC);

CREATE INDEX IF NOT EXISTS status_incident_updates_incident_idx ON status_incident_updates(incident_id, created_at DESC);

CREATE INDEX IF NOT EXISTS status_checks_service_time_idx ON status_checks(service_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS status_checks_time_idx ON status_checks(checked_at DESC);
CREATE INDEX IF NOT EXISTS status_checks_status_idx ON status_checks(status, checked_at DESC);

CREATE INDEX IF NOT EXISTS status_maintenance_public_idx ON status_maintenance(is_public, scheduled_start DESC) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS status_maintenance_schedule_idx ON status_maintenance(scheduled_start, scheduled_end);

CREATE INDEX IF NOT EXISTS status_subscribers_active_idx ON status_subscribers(is_active, email) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS status_subscribers_verified_idx ON status_subscribers(is_verified, email) WHERE is_verified = true;

-- Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_status_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER update_status_services_timestamp
    BEFORE UPDATE ON status_services
    FOR EACH ROW
    EXECUTE FUNCTION update_status_updated_at();

CREATE OR REPLACE TRIGGER update_status_incidents_timestamp
    BEFORE UPDATE ON status_incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_status_updated_at();

CREATE OR REPLACE TRIGGER update_status_maintenance_timestamp
    BEFORE UPDATE ON status_maintenance
    FOR EACH ROW
    EXECUTE FUNCTION update_status_updated_at();

CREATE OR REPLACE TRIGGER update_status_subscribers_timestamp
    BEFORE UPDATE ON status_subscribers
    FOR EACH ROW
    EXECUTE FUNCTION update_status_updated_at();

-- Function to calculate uptime percentage
CREATE OR REPLACE FUNCTION calculate_uptime_percentage(
    service_uuid UUID,
    time_period INTERVAL DEFAULT INTERVAL '30 days'
)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    total_checks INTEGER;
    successful_checks INTEGER;
    uptime_percentage DECIMAL(5,2);
BEGIN
    -- Get total checks in the time period
    SELECT COUNT(*) INTO total_checks
    FROM status_checks
    WHERE service_id = service_uuid
    AND checked_at >= NOW() - time_period;
    
    -- Return 100% if no checks (new service)
    IF total_checks = 0 THEN
        RETURN 100.00;
    END IF;
    
    -- Get successful checks
    SELECT COUNT(*) INTO successful_checks
    FROM status_checks
    WHERE service_id = service_uuid
    AND checked_at >= NOW() - time_period
    AND status = 'up';
    
    -- Calculate percentage
    uptime_percentage := (successful_checks::DECIMAL / total_checks::DECIMAL) * 100;
    
    RETURN ROUND(uptime_percentage, 2);
END;
$$;

-- Function to get current overall status
CREATE OR REPLACE FUNCTION get_overall_status()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    major_outages INTEGER;
    partial_outages INTEGER;
    degraded_services INTEGER;
    maintenance_count INTEGER;
BEGIN
    -- Count services by status
    SELECT 
        COUNT(*) FILTER (WHERE current_status = 'major_outage'),
        COUNT(*) FILTER (WHERE current_status = 'partial_outage'),
        COUNT(*) FILTER (WHERE current_status = 'degraded'),
        COUNT(*) FILTER (WHERE current_status = 'maintenance')
    INTO major_outages, partial_outages, degraded_services, maintenance_count
    FROM status_services
    WHERE is_active = true AND is_visible = true;
    
    -- Determine overall status
    IF major_outages > 0 THEN
        RETURN 'major_outage';
    ELSIF partial_outages > 0 THEN
        RETURN 'partial_outage';
    ELSIF degraded_services > 0 THEN
        RETURN 'degraded';
    ELSIF maintenance_count > 0 THEN
        RETURN 'maintenance';
    ELSE
        RETURN 'operational';
    END IF;
END;
$$;

-- Insert default services for PingBuoy
INSERT INTO status_services (name, description, service_type, check_url, display_order) VALUES
('Website', 'Main PingBuoy website and user interface', 'website', 'https://pingbuoy.com', 1),
('API', 'PingBuoy REST API for monitoring and integrations', 'api', 'https://api.pingbuoy.com/health', 2),
('Monitoring Engine', 'Website monitoring and alerting system', 'monitoring', NULL, 3),
('Database', 'Primary database cluster', 'database', NULL, 4),
('CDN', 'Content delivery network for global performance', 'cdn', 'https://cdn.pingbuoy.com/health', 5);

-- Create cleanup function for old status data
CREATE OR REPLACE FUNCTION cleanup_old_status_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete status checks older than 90 days
    DELETE FROM status_checks 
    WHERE checked_at < NOW() - INTERVAL '90 days';
    
    -- Delete resolved incidents older than 1 year
    DELETE FROM status_incidents 
    WHERE status = 'resolved' 
    AND resolved_at < NOW() - INTERVAL '1 year';
    
    -- Delete completed maintenance older than 1 year
    DELETE FROM status_maintenance 
    WHERE status = 'completed' 
    AND actual_end < NOW() - INTERVAL '1 year';
    
    -- Delete unverified subscribers older than 30 days
    DELETE FROM status_subscribers 
    WHERE is_verified = false 
    AND created_at < NOW() - INTERVAL '30 days';
    
    RAISE NOTICE 'Status data cleanup completed at %', NOW();
END;
$$;

-- Grant permissions (public read access for status page)
GRANT SELECT ON status_services TO anon, authenticated;
GRANT SELECT ON status_incidents TO anon, authenticated;
GRANT SELECT ON status_incident_updates TO anon, authenticated;
GRANT SELECT ON status_maintenance TO anon, authenticated;
GRANT SELECT ON status_checks TO anon, authenticated;

-- Subscribers table needs special permissions
GRANT INSERT ON status_subscribers TO anon, authenticated;
GRANT SELECT, UPDATE ON status_subscribers TO authenticated;

-- Service role has full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Add table comments
COMMENT ON TABLE status_services IS 'PingBuoy service components for status monitoring';
COMMENT ON TABLE status_incidents IS 'Service incidents and outages';
COMMENT ON TABLE status_incident_updates IS 'Timeline updates for incidents';
COMMENT ON TABLE status_checks IS 'Historical monitoring data for services';
COMMENT ON TABLE status_maintenance IS 'Scheduled and emergency maintenance windows';
COMMENT ON TABLE status_subscribers IS 'Email subscribers for status notifications';

COMMENT ON FUNCTION calculate_uptime_percentage IS 'Calculate uptime percentage for a service over time period';
COMMENT ON FUNCTION get_overall_status IS 'Get overall system status based on all services';
COMMENT ON FUNCTION cleanup_old_status_data IS 'Clean up old status monitoring data';