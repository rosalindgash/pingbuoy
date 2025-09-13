-- Seed data for PingBuoy development
-- Founder account: Rosalind Gash (pingbuoy@gmail.com)

-- Founder user in public.users table
INSERT INTO public.users (id, email, plan, created_at, stripe_customer_id, full_name)
VALUES (
  '5b6eaa8d-8eaa-499e-8dd1-cd1919283fab',
  'pingbuoy@gmail.com',
  'founder',
  '2025-09-09 08:51:43.534808+00',
  'cus_T1RXjfvswly6wu',
  'Rosalind Gash'
)
ON CONFLICT (id) DO UPDATE SET
  plan = 'founder',
  email = 'pingbuoy@gmail.com',
  stripe_customer_id = 'cus_T1RXjfvswly6wu',
  full_name = 'Rosalind Gash';

-- Default notification settings for founder
INSERT INTO public.notification_settings (
  user_id,
  email_enabled,
  email_downtime_alerts,
  email_recovery_alerts,
  email_maintenance_alerts,
  email_weekly_reports,
  alert_frequency,
  min_downtime_duration_seconds
) VALUES (
  '5b6eaa8d-8eaa-499e-8dd1-cd1919283fab',
  true,
  true,
  true,
  true,
  true,
  'immediate',
  30
)
ON CONFLICT (user_id) DO UPDATE SET
  email_enabled = true,
  email_downtime_alerts = true,
  email_recovery_alerts = true;

-- Example test sites for development
INSERT INTO public.sites (user_id, url, name, is_active) VALUES
('5b6eaa8d-8eaa-499e-8dd1-cd1919283fab', 'https://pingbuoy.com', 'PingBuoy Main Site', true),
('5b6eaa8d-8eaa-499e-8dd1-cd1919283fab', 'https://api.pingbuoy.com', 'PingBuoy API', true),
('5b6eaa8d-8eaa-499e-8dd1-cd1919283fab', 'https://example.com', 'Test Site 1', true),
('5b6eaa8d-8eaa-499e-8dd1-cd1919283fab', 'https://httpstat.us/200', 'Test Site 2 (Always Up)', true),
('5b6eaa8d-8eaa-499e-8dd1-cd1919283fab', 'https://httpstat.us/500', 'Test Site 3 (Always Down)', false)
ON CONFLICT DO NOTHING;