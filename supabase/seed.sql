-- Seed data for PingBuoy development
-- Note: Production accounts should be created manually via Supabase Studio or proper registration flow
-- This file can be used for development environment setup if needed

-- Example: Uncomment below to create test data for development
-- DO NOT include real user credentials, emails, or sensitive data

/*
-- Example development user (replace with your dev user ID if needed)
INSERT INTO public.users (id, email, plan) VALUES
('00000000-0000-0000-0000-000000000000', 'dev@example.com', 'free')
ON CONFLICT (id) DO NOTHING;

-- Example test sites
INSERT INTO public.sites (user_id, url, name, is_active) VALUES
('00000000-0000-0000-0000-000000000000', 'https://httpstat.us/200', 'Test Site (Always Up)', true),
('00000000-0000-0000-0000-000000000000', 'https://httpstat.us/500', 'Test Site (Always Down)', false)
ON CONFLICT DO NOTHING;
*/