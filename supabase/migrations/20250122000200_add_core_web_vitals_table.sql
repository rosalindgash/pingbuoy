-- Create table for Core Web Vitals monitoring (for PingBuoy's internal monitoring)
create table if not exists core_web_vitals (
  id uuid default gen_random_uuid() primary key,
  site_url text not null,
  lcp numeric, -- Largest Contentful Paint (ms)
  fid numeric, -- First Input Delay (ms)
  cls numeric, -- Cumulative Layout Shift (score)
  fcp numeric, -- First Contentful Paint (ms)
  ttfb numeric, -- Time to First Byte (ms)
  checked_at timestamp with time zone default now() not null,
  created_at timestamp with time zone default now() not null
);

-- Create index for efficient querying
create index if not exists idx_core_web_vitals_checked_at on core_web_vitals(checked_at desc);
create index if not exists idx_core_web_vitals_site_url on core_web_vitals(site_url);

-- Enable RLS
alter table core_web_vitals enable row level security;

-- Create policy to allow service role access (for internal monitoring)
create policy "Service role can manage core web vitals" on core_web_vitals
  using (auth.jwt() ->> 'role' = 'service_role');

-- Add some sample data for PingBuoy's own sites
insert into core_web_vitals (site_url, lcp, fid, cls, fcp, ttfb, checked_at) values
('https://pingbuoy.com', 1250, 85, 0.08, 1100, 245, now() - interval '5 minutes'),
('https://pingbuoy.com/dashboard', 1650, 125, 0.12, 1450, 320, now() - interval '10 minutes'),
('https://pingbuoy.com/status', 980, 45, 0.05, 850, 180, now() - interval '15 minutes');