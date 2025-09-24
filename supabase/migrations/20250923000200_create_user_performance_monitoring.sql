-- Create table for real-time user performance monitoring
create table if not exists user_performance_logs (
  id uuid default gen_random_uuid() primary key,
  site_id uuid not null references sites(id) on delete cascade,

  -- Core Web Vitals
  lcp numeric, -- Largest Contentful Paint (ms)
  fid numeric, -- First Input Delay (ms)
  cls numeric, -- Cumulative Layout Shift (score)
  fcp numeric, -- First Contentful Paint (ms)
  ttfb numeric, -- Time to First Byte (ms)

  -- Additional Performance Metrics
  dom_content_loaded numeric, -- DOMContentLoaded (ms)
  load_event numeric, -- window.load event (ms)
  navigation_type text, -- navigate, reload, back_forward

  -- User Context
  user_agent text,
  device_type text, -- mobile, tablet, desktop
  connection_type text, -- 4g, 3g, 2g, wifi, etc
  screen_resolution text, -- 1920x1080

  -- Geographic Data
  country_code text,
  region text,
  city text,

  -- Page Context
  page_url text not null,
  referrer_url text,

  -- Timestamps
  recorded_at timestamp with time zone not null, -- when performance was measured on client
  received_at timestamp with time zone default now() not null, -- when received by API

  created_at timestamp with time zone default now() not null
);

-- Create indexes for efficient querying
create index if not exists idx_user_performance_logs_site_id on user_performance_logs(site_id);
create index if not exists idx_user_performance_logs_recorded_at on user_performance_logs(recorded_at desc);
create index if not exists idx_user_performance_logs_page_url on user_performance_logs(page_url);
create index if not exists idx_user_performance_logs_device_type on user_performance_logs(device_type);
create index if not exists idx_user_performance_logs_country on user_performance_logs(country_code);

-- Composite index for dashboard queries
create index if not exists idx_user_performance_logs_site_recorded on user_performance_logs(site_id, recorded_at desc);

-- Enable RLS
alter table user_performance_logs enable row level security;

-- Create policy to allow users to view their own site performance data
create policy "Users can view their own site performance logs" on user_performance_logs
  for select using (
    site_id in (
      select id from sites where user_id = auth.uid()
    )
  );

-- Create policy to allow service role to insert performance data
create policy "Service role can insert performance logs" on user_performance_logs
  for insert to service_role with check (true);

-- Create policy to allow authenticated users to insert performance data for their sites
create policy "Users can insert performance logs for their sites" on user_performance_logs
  for insert using (
    site_id in (
      select id from sites where user_id = auth.uid()
    )
  );

-- Create function to get recent performance summary
create or replace function get_performance_summary(
  target_site_id uuid,
  hours_back integer default 24
)
returns table (
  avg_lcp numeric,
  avg_fid numeric,
  avg_cls numeric,
  avg_fcp numeric,
  avg_ttfb numeric,
  total_pageviews bigint,
  unique_visitors bigint,
  top_countries json,
  device_breakdown json
)
language plpgsql
security definer
as $$
begin
  return query
  select
    round(avg(lcp), 2) as avg_lcp,
    round(avg(fid), 2) as avg_fid,
    round(avg(cls), 4) as avg_cls,
    round(avg(fcp), 2) as avg_fcp,
    round(avg(ttfb), 2) as avg_ttfb,
    count(*) as total_pageviews,
    count(distinct user_agent) as unique_visitors,

    -- Top countries as JSON
    (
      select json_agg(json_build_object('country', country_code, 'count', cnt))
      from (
        select country_code, count(*) as cnt
        from user_performance_logs
        where site_id = target_site_id
          and recorded_at > now() - interval '1 hour' * hours_back
          and country_code is not null
        group by country_code
        order by cnt desc
        limit 5
      ) countries
    ) as top_countries,

    -- Device breakdown as JSON
    (
      select json_agg(json_build_object('device', device_type, 'count', cnt))
      from (
        select device_type, count(*) as cnt
        from user_performance_logs
        where site_id = target_site_id
          and recorded_at > now() - interval '1 hour' * hours_back
          and device_type is not null
        group by device_type
        order by cnt desc
      ) devices
    ) as device_breakdown

  from user_performance_logs
  where site_id = target_site_id
    and recorded_at > now() - interval '1 hour' * hours_back;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function get_performance_summary(uuid, integer) to authenticated;