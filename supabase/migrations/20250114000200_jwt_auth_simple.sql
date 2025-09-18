-- Simple JWT-based service authentication
-- This replaces service_role with scoped JWT authentication

-- Create function to check if current user is a valid service
CREATE OR REPLACE FUNCTION public.is_service()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    token TEXT;
    claims JSONB;
BEGIN
    -- Get the JWT token from the Authorization header
    token := current_setting('request.jwt.claims', true);

    -- Parse the token claims
    IF token IS NULL OR token = '' THEN
        RETURN FALSE;
    END IF;

    -- Convert the claims to JSONB
    claims := token::jsonb;

    -- Validate it's a service token
    IF claims->>'iss' != 'pingbuoy-service' THEN
        RETURN FALSE;
    END IF;

    -- Validate service type is allowed
    IF (claims->>'service_type') NOT IN ('uptime_monitor', 'dead_link_scanner', 'email_sender',
                                        'notification_system', 'analytics_collector', 'maintenance_worker') THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Create function to get current service type
CREATE OR REPLACE FUNCTION public.service_type()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    token TEXT;
    claims JSONB;
BEGIN
    token := current_setting('request.jwt.claims', true);
    IF token IS NULL OR token = '' THEN
        RETURN NULL;
    END IF;
    claims := token::jsonb;
    RETURN claims->>'service_type';
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;

-- Drop old service_role policies and create simple JWT-based policies

-- Users table
DROP POLICY IF EXISTS "Service role full access to users" ON public.users;
CREATE POLICY "Service JWT access users" ON public.users
    FOR ALL USING (public.is_service());

-- Sites table
DROP POLICY IF EXISTS "Service role full access to sites" ON public.sites;
CREATE POLICY "Service JWT access sites" ON public.sites
    FOR ALL USING (public.is_service());

-- Uptime logs
DROP POLICY IF EXISTS "Service role full access to uptime logs" ON public.uptime_logs;
CREATE POLICY "Service JWT access uptime_logs" ON public.uptime_logs
    FOR ALL USING (public.is_service());

-- Alerts
DROP POLICY IF EXISTS "Service role full access to alerts" ON public.alerts;
CREATE POLICY "Service JWT access alerts" ON public.alerts
    FOR ALL USING (public.is_service());

-- Dead links
DROP POLICY IF EXISTS "Service role full access to dead links" ON public.dead_links;
CREATE POLICY "Service JWT access dead_links" ON public.dead_links
    FOR ALL USING (public.is_service());

-- Scans
DROP POLICY IF EXISTS "Service role full access to scans" ON public.scans;
CREATE POLICY "Service JWT access scans" ON public.scans
    FOR ALL USING (public.is_service());

-- Performance logs
DROP POLICY IF EXISTS "Service role full access to performance logs" ON public.performance_logs;
CREATE POLICY "Service JWT access performance_logs" ON public.performance_logs
    FOR ALL USING (public.is_service());

-- Email logs (most restrictive - only email_sender service)
DROP POLICY IF EXISTS "Service role can manage email logs" ON public.email_logs;
CREATE POLICY "Email sender service access" ON public.email_logs
    FOR ALL USING (public.is_service() AND public.service_type() = 'email_sender');

-- Notification settings
DROP POLICY IF EXISTS "Service role full access" ON public.notification_settings;
CREATE POLICY "Service JWT access notification_settings" ON public.notification_settings
    FOR ALL USING (public.is_service());

-- Notification history
DROP POLICY IF EXISTS "Service role full access to notification history" ON public.notification_history;
CREATE POLICY "Service JWT access notification_history" ON public.notification_history
    FOR ALL USING (public.is_service());

-- Integrations
DROP POLICY IF EXISTS "Service role full access to integrations" ON public.integrations;
CREATE POLICY "Service JWT access integrations" ON public.integrations
    FOR ALL USING (public.is_service());

-- Integration logs
DROP POLICY IF EXISTS "Service role full access to integration logs" ON public.integration_logs;
CREATE POLICY "Service JWT access integration_logs" ON public.integration_logs
    FOR ALL USING (public.is_service());

-- API keys
DROP POLICY IF EXISTS "Service role full access to API keys" ON public.api_keys;
CREATE POLICY "Service JWT access api_keys" ON public.api_keys
    FOR ALL USING (public.is_service());

-- Create audit table for service operations
CREATE TABLE IF NOT EXISTS public.service_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_type TEXT NOT NULL,
    service_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for audit log
CREATE INDEX IF NOT EXISTS service_audit_log_service_type_idx ON public.service_audit_log(service_type, created_at DESC);
CREATE INDEX IF NOT EXISTS service_audit_log_created_at_idx ON public.service_audit_log(created_at DESC);

-- Enable RLS for audit log
ALTER TABLE public.service_audit_log ENABLE ROW LEVEL SECURITY;

-- Only services can insert audit logs
CREATE POLICY "Services can insert audit logs" ON public.service_audit_log
    FOR INSERT WITH CHECK (public.is_service());

-- Admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON public.service_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.plan = 'founder'
        )
    );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;

-- Comment the migration
COMMENT ON FUNCTION public.is_service IS 'Returns true if current user is authenticated as a service via JWT';
COMMENT ON FUNCTION public.service_type IS 'Returns the service type from JWT claims';
COMMENT ON TABLE public.service_audit_log IS 'Audit log for service operations on the database';