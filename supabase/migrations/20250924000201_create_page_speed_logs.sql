-- Create page_speed_logs table for tracking page performance metrics
CREATE TABLE IF NOT EXISTS page_speed_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  load_time INTEGER NOT NULL, -- Total page load time in milliseconds
  first_byte_time INTEGER NOT NULL, -- Time to first byte in milliseconds
  page_size INTEGER NOT NULL, -- Page size in bytes
  status_code INTEGER NOT NULL, -- HTTP status code
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_page_speed_logs_site_id ON page_speed_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_page_speed_logs_checked_at ON page_speed_logs(checked_at);
CREATE INDEX IF NOT EXISTS idx_page_speed_logs_load_time ON page_speed_logs(load_time);

-- Enable row level security
ALTER TABLE page_speed_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own page speed logs" ON page_speed_logs
  FOR SELECT USING (
    site_id IN (
      SELECT id FROM sites WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all page speed logs" ON page_speed_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Add comments
COMMENT ON TABLE page_speed_logs IS 'Stores page speed performance metrics for monitored sites';
COMMENT ON COLUMN page_speed_logs.load_time IS 'Total page load time in milliseconds';
COMMENT ON COLUMN page_speed_logs.first_byte_time IS 'Time to first byte (TTFB) in milliseconds';
COMMENT ON COLUMN page_speed_logs.page_size IS 'Total page size in bytes';
COMMENT ON COLUMN page_speed_logs.status_code IS 'HTTP response status code';