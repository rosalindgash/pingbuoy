-- Enable RLS on status page tables that were showing as "Unrestricted"
-- These are the PingBuoy system status tables, not user monitoring tables

-- Enable RLS on all status tables
ALTER TABLE IF EXISTS status_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS status_incident_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS status_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS status_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS status_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS status_subscribers ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view visible status services" ON status_services;
DROP POLICY IF EXISTS "Service role can manage status services" ON status_services;
DROP POLICY IF EXISTS "Anyone can view status checks for visible services" ON status_checks;
DROP POLICY IF EXISTS "Service role can manage status checks" ON status_checks;
DROP POLICY IF EXISTS "Anyone can view public incidents" ON status_incidents;
DROP POLICY IF EXISTS "Service role can manage incidents" ON status_incidents;
DROP POLICY IF EXISTS "Anyone can view updates for public incidents" ON status_incident_updates;
DROP POLICY IF EXISTS "Service role can manage incident updates" ON status_incident_updates;
DROP POLICY IF EXISTS "Anyone can view public maintenance" ON status_maintenance;
DROP POLICY IF EXISTS "Service role can manage maintenance" ON status_maintenance;
DROP POLICY IF EXISTS "Anyone can subscribe to status updates" ON status_subscribers;
DROP POLICY IF EXISTS "Users can update own subscription" ON status_subscribers;
DROP POLICY IF EXISTS "Service role can manage subscribers" ON status_subscribers;
DROP POLICY IF EXISTS "Users can view own subscription" ON status_subscribers;

-- STATUS_SERVICES policies (PingBuoy's own services)
-- Allow public read access (for public status page)
CREATE POLICY "Anyone can view visible status services" ON status_services
FOR SELECT USING (is_visible = true);

-- System can manage all services
CREATE POLICY "Service role can manage status services" ON status_services
FOR ALL USING (auth.role() = 'service_role');

-- STATUS_CHECKS policies (service monitoring data)
-- Allow public read for visible services
CREATE POLICY "Anyone can view status checks for visible services" ON status_checks
FOR SELECT USING (
  service_id IN (
    SELECT id FROM status_services WHERE is_visible = true
  )
);

-- System can manage all status checks
CREATE POLICY "Service role can manage status checks" ON status_checks
FOR ALL USING (auth.role() = 'service_role');

-- STATUS_INCIDENTS policies
-- Allow public read for public incidents
CREATE POLICY "Anyone can view public incidents" ON status_incidents
FOR SELECT USING (is_public = true);

-- System can manage all incidents
CREATE POLICY "Service role can manage incidents" ON status_incidents
FOR ALL USING (auth.role() = 'service_role');

-- STATUS_INCIDENT_UPDATES policies
-- Allow public read for updates on public incidents
CREATE POLICY "Anyone can view updates for public incidents" ON status_incident_updates
FOR SELECT USING (
  incident_id IN (
    SELECT id FROM status_incidents WHERE is_public = true
  )
);

-- System can manage all incident updates
CREATE POLICY "Service role can manage incident updates" ON status_incident_updates
FOR ALL USING (auth.role() = 'service_role');

-- STATUS_MAINTENANCE policies
-- Allow public read for public maintenance
CREATE POLICY "Anyone can view public maintenance" ON status_maintenance
FOR SELECT USING (is_public = true);

-- System can manage all maintenance
CREATE POLICY "Service role can manage maintenance" ON status_maintenance
FOR ALL USING (auth.role() = 'service_role');

-- STATUS_SUBSCRIBERS policies
-- Anyone can subscribe (insert)
CREATE POLICY "Anyone can subscribe to status updates" ON status_subscribers
FOR INSERT WITH CHECK (true);

-- Subscribers can update their own subscription (by email match)
CREATE POLICY "Users can update own subscription" ON status_subscribers
FOR UPDATE USING (email = current_setting('request.jwt.claims', true)::json->>'email');

-- System can manage all subscriptions
CREATE POLICY "Service role can manage subscribers" ON status_subscribers
FOR ALL USING (auth.role() = 'service_role');

-- Subscribers can view their own subscription for unsubscribe
CREATE POLICY "Users can view own subscription" ON status_subscribers
FOR SELECT USING (
  email = current_setting('request.jwt.claims', true)::json->>'email' OR
  auth.role() = 'service_role'
);

-- Note: The 'uptime_logs' table is for user site monitoring and already has proper RLS
-- from the core tables migration. It's separate from the PingBuoy status system tables.