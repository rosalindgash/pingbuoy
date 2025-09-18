-- Create performance logs table for Core Web Vitals monitoring
CREATE TABLE IF NOT EXISTS performance_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Device and strategy
    strategy TEXT NOT NULL CHECK (strategy IN ('mobile', 'desktop')) DEFAULT 'mobile',

    -- Core Web Vitals (in milliseconds or score)
    lcp DECIMAL(8,2), -- Largest Contentful Paint (ms)
    fid DECIMAL(8,2), -- First Input Delay (ms)
    cls DECIMAL(8,4), -- Cumulative Layout Shift (score 0-1)

    -- Additional Performance Metrics
    fcp DECIMAL(8,2), -- First Contentful Paint (ms)
    ttfb DECIMAL(8,2), -- Time to First Byte (ms)
    speed_index DECIMAL(8,2), -- Speed Index (ms)

    -- Overall scores (0-100)
    performance_score INTEGER CHECK (performance_score >= 0 AND performance_score <= 100),

    -- PageSpeed Insights specific data
    page_stats JSONB DEFAULT '{}', -- Raw PSI data for future use

    -- Field data (real user metrics from Chrome UX Report)
    has_field_data BOOLEAN DEFAULT false,
    field_lcp DECIMAL(8,2),
    field_fid DECIMAL(8,2),
    field_cls DECIMAL(8,4),

    -- Status and metadata
    status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'timeout', 'error')),
    error_message TEXT,

    -- Timestamps
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS performance_logs_site_id_idx ON performance_logs(site_id);
CREATE INDEX IF NOT EXISTS performance_logs_user_id_idx ON performance_logs(user_id);
CREATE INDEX IF NOT EXISTS performance_logs_checked_at_idx ON performance_logs(checked_at DESC);
CREATE INDEX IF NOT EXISTS performance_logs_site_strategy_idx ON performance_logs(site_id, strategy);
CREATE INDEX IF NOT EXISTS performance_logs_site_checked_at_idx ON performance_logs(site_id, checked_at DESC);

-- Enable Row Level Security
ALTER TABLE performance_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view performance logs for own sites" ON performance_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sites
            WHERE sites.id = performance_logs.site_id
            AND sites.user_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can insert own performance logs" ON performance_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to performance logs" ON performance_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Add table comments for documentation
COMMENT ON TABLE performance_logs IS 'Core Web Vitals and performance metrics from PageSpeed Insights API';
COMMENT ON COLUMN performance_logs.lcp IS 'Largest Contentful Paint in milliseconds';
COMMENT ON COLUMN performance_logs.fid IS 'First Input Delay in milliseconds';
COMMENT ON COLUMN performance_logs.cls IS 'Cumulative Layout Shift score (0-1)';
COMMENT ON COLUMN performance_logs.fcp IS 'First Contentful Paint in milliseconds';
COMMENT ON COLUMN performance_logs.ttfb IS 'Time to First Byte in milliseconds';
COMMENT ON COLUMN performance_logs.performance_score IS 'Overall PageSpeed Insights performance score (0-100)';
COMMENT ON COLUMN performance_logs.has_field_data IS 'Whether Chrome UX Report field data was available';
COMMENT ON COLUMN performance_logs.page_stats IS 'Raw PageSpeed Insights data for detailed analysis';

-- Function to clean up old performance logs (keep 90 days for Pro users, 7 days for Free users)
CREATE OR REPLACE FUNCTION cleanup_old_performance_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete performance logs older than 90 days for Pro users
    DELETE FROM performance_logs
    WHERE checked_at < NOW() - INTERVAL '90 days'
    AND user_id IN (
        SELECT id FROM users WHERE plan IN ('pro', 'founder')
    );

    -- Delete performance logs older than 7 days for Free users
    DELETE FROM performance_logs
    WHERE checked_at < NOW() - INTERVAL '7 days'
    AND user_id IN (
        SELECT id FROM users WHERE plan = 'free'
    );

    RAISE NOTICE 'Performance logs cleanup completed at %', NOW();
END;
$$;

-- Grant necessary permissions
GRANT ALL ON performance_logs TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;