-- Create core tenant tables with proper RLS
-- This migration creates the foundational tables that other migrations depend on

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'founder')),
    full_name TEXT,
    stripe_customer_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

    -- Constraints
    CONSTRAINT users_email_format CHECK (
        email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    )
);

-- Sites table - the main tenant resource
CREATE TABLE IF NOT EXISTS public.sites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    last_checked TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'unknown' CHECK (status IN ('up', 'down', 'unknown')),

    -- Constraints
    CONSTRAINT sites_url_format CHECK (
        url ~ '^https?://[^\s/$.?#].[^\s]*$'
    ),
    CONSTRAINT sites_name_length CHECK (
        LENGTH(name) >= 1 AND LENGTH(name) <= 100
    )
);

-- Uptime logs table
CREATE TABLE IF NOT EXISTS public.uptime_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('up', 'down')),
    response_time INTEGER CHECK (response_time >= 0 AND response_time <= 300000), -- Max 5 minutes
    status_code INTEGER CHECK (status_code >= 100 AND status_code <= 599),
    error_message TEXT,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('uptime', 'dead_links', 'performance')),
    message TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

    -- Constraints
    CONSTRAINT alerts_resolved_after_sent CHECK (
        resolved_at IS NULL OR resolved_at >= sent_at
    )
);

-- Dead links table
CREATE TABLE IF NOT EXISTS public.dead_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    source_url TEXT NOT NULL,
    status_code INTEGER NOT NULL CHECK (status_code >= 400 AND status_code <= 599),
    error_message TEXT,
    found_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    fixed BOOLEAN DEFAULT false,
    fixed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

    -- Constraints
    CONSTRAINT dead_links_url_format CHECK (
        url ~ '^https?://[^\s/$.?#].[^\s]*$'
    ),
    CONSTRAINT dead_links_source_url_format CHECK (
        source_url ~ '^https?://[^\s/$.?#].[^\s]*$'
    ),
    CONSTRAINT dead_links_fixed_after_found CHECK (
        fixed_at IS NULL OR fixed_at >= found_at
    )
);

-- Scans table
CREATE TABLE IF NOT EXISTS public.scans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    scan_type TEXT NOT NULL DEFAULT 'dead_links' CHECK (scan_type IN ('dead_links', 'performance', 'security')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    total_links INTEGER DEFAULT 0 CHECK (total_links >= 0),
    broken_links INTEGER DEFAULT 0 CHECK (broken_links >= 0),
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

    -- Constraints
    CONSTRAINT scans_completed_after_started CHECK (
        completed_at IS NULL OR completed_at >= started_at
    ),
    CONSTRAINT scans_broken_links_lte_total CHECK (
        broken_links <= total_links
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);
CREATE INDEX IF NOT EXISTS users_plan_idx ON public.users(plan);
CREATE INDEX IF NOT EXISTS users_stripe_customer_id_idx ON public.users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS sites_user_id_idx ON public.sites(user_id);
CREATE INDEX IF NOT EXISTS sites_url_idx ON public.sites(url);
CREATE INDEX IF NOT EXISTS sites_active_idx ON public.sites(is_active, updated_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS sites_status_idx ON public.sites(status, last_checked DESC);

CREATE INDEX IF NOT EXISTS uptime_logs_site_id_idx ON public.uptime_logs(site_id);
CREATE INDEX IF NOT EXISTS uptime_logs_checked_at_idx ON public.uptime_logs(checked_at DESC);
CREATE INDEX IF NOT EXISTS uptime_logs_site_checked_idx ON public.uptime_logs(site_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS uptime_logs_status_idx ON public.uptime_logs(status, checked_at DESC);

CREATE INDEX IF NOT EXISTS alerts_site_id_idx ON public.alerts(site_id);
CREATE INDEX IF NOT EXISTS alerts_sent_at_idx ON public.alerts(sent_at DESC);
CREATE INDEX IF NOT EXISTS alerts_resolved_idx ON public.alerts(resolved, sent_at DESC);
CREATE INDEX IF NOT EXISTS alerts_type_idx ON public.alerts(type, sent_at DESC);

CREATE INDEX IF NOT EXISTS dead_links_site_id_idx ON public.dead_links(site_id);
CREATE INDEX IF NOT EXISTS dead_links_found_at_idx ON public.dead_links(found_at DESC);
CREATE INDEX IF NOT EXISTS dead_links_fixed_idx ON public.dead_links(fixed, found_at DESC);

CREATE INDEX IF NOT EXISTS scans_site_id_idx ON public.scans(site_id);
CREATE INDEX IF NOT EXISTS scans_started_at_idx ON public.scans(started_at DESC);
CREATE INDEX IF NOT EXISTS scans_status_idx ON public.scans(status, started_at DESC);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uptime_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dead_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

-- Users table RLS policies
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role full access to users" ON public.users
    FOR ALL USING (auth.role() = 'service_role');

-- Sites table RLS policies
CREATE POLICY "Users can view own sites" ON public.sites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sites" ON public.sites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sites" ON public.sites
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sites" ON public.sites
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to sites" ON public.sites
    FOR ALL USING (auth.role() = 'service_role');

-- Uptime logs RLS policies
CREATE POLICY "Users can view logs for own sites" ON public.uptime_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = uptime_logs.site_id
            AND sites.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert uptime logs" ON public.uptime_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = uptime_logs.site_id
        )
    );

CREATE POLICY "Service role full access to uptime logs" ON public.uptime_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Alerts RLS policies
CREATE POLICY "Users can view alerts for own sites" ON public.alerts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = alerts.site_id
            AND sites.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert alerts" ON public.alerts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = alerts.site_id
        )
    );

CREATE POLICY "Users can update alerts for own sites" ON public.alerts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = alerts.site_id
            AND sites.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role full access to alerts" ON public.alerts
    FOR ALL USING (auth.role() = 'service_role');

-- Dead links RLS policies
CREATE POLICY "Users can view dead links for own sites" ON public.dead_links
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = dead_links.site_id
            AND sites.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert dead links" ON public.dead_links
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = dead_links.site_id
        )
    );

CREATE POLICY "Users can update dead links for own sites" ON public.dead_links
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = dead_links.site_id
            AND sites.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role full access to dead links" ON public.dead_links
    FOR ALL USING (auth.role() = 'service_role');

-- Scans RLS policies
CREATE POLICY "Users can view scans for own sites" ON public.scans
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = scans.site_id
            AND sites.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert scans" ON public.scans
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = scans.site_id
        )
    );

CREATE POLICY "Users can update scans for own sites" ON public.scans
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = scans.site_id
            AND sites.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role full access to scans" ON public.scans
    FOR ALL USING (auth.role() = 'service_role');

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$;

-- Create triggers for auto-updating timestamps
CREATE OR REPLACE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_sites_updated_at
    BEFORE UPDATE ON public.sites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail user creation
        RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to calculate uptime percentage
CREATE OR REPLACE FUNCTION public.get_uptime_percentage(site_uuid UUID, days INTEGER DEFAULT 30)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    total_checks INTEGER;
    up_checks INTEGER;
    uptime_percentage NUMERIC;
BEGIN
    SELECT COUNT(*) INTO total_checks
    FROM public.uptime_logs
    WHERE site_id = site_uuid
    AND checked_at >= NOW() - INTERVAL '1 day' * days;

    SELECT COUNT(*) INTO up_checks
    FROM public.uptime_logs
    WHERE site_id = site_uuid
    AND status = 'up'
    AND checked_at >= NOW() - INTERVAL '1 day' * days;

    IF total_checks = 0 THEN
        RETURN 100;
    END IF;

    uptime_percentage := (up_checks::NUMERIC / total_checks::NUMERIC) * 100;
    RETURN ROUND(uptime_percentage, 2);
END;
$$;

-- Grant necessary permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.sites TO authenticated;
GRANT ALL ON public.uptime_logs TO authenticated;
GRANT ALL ON public.alerts TO authenticated;
GRANT ALL ON public.dead_links TO authenticated;
GRANT ALL ON public.scans TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add table comments
COMMENT ON TABLE public.users IS 'User profiles extending auth.users with plan and billing information';
COMMENT ON TABLE public.sites IS 'Websites being monitored by users';
COMMENT ON TABLE public.uptime_logs IS 'Historical uptime monitoring data for sites';
COMMENT ON TABLE public.alerts IS 'Alert notifications sent to users for site issues';
COMMENT ON TABLE public.dead_links IS 'Broken links found during site scans';
COMMENT ON TABLE public.scans IS 'Scan jobs for dead links and other site analysis';

COMMENT ON COLUMN public.users.plan IS 'User subscription plan: free, pro, or founder';
COMMENT ON COLUMN public.sites.user_id IS 'Owner of the site (tenant isolation key)';
COMMENT ON COLUMN public.uptime_logs.site_id IS 'Site being monitored (joins to sites.id for tenant isolation)';
COMMENT ON COLUMN public.alerts.site_id IS 'Site that triggered the alert (joins to sites.id for tenant isolation)';