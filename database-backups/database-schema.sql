-- Users table (extends auth.users)
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  plan text not null default 'free' check (plan in ('free', 'pro', 'founder')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  stripe_customer_id text
);

-- Sites table
create table public.sites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  url text not null,
  name text not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_checked timestamp with time zone,
  status text default 'unknown' check (status in ('up', 'down', 'unknown'))
);

-- Uptime logs table
create table public.uptime_logs (
  id uuid default gen_random_uuid() primary key,
  site_id uuid references public.sites(id) on delete cascade not null,
  status text not null check (status in ('up', 'down')),
  response_time integer,
  status_code integer,
  checked_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Alerts table
create table public.alerts (
  id uuid default gen_random_uuid() primary key,
  site_id uuid references public.sites(id) on delete cascade not null,
  type text not null check (type in ('uptime', 'dead_links')),
  message text not null,
  sent_at timestamp with time zone default timezone('utc'::text, now()) not null,
  resolved boolean default false
);

-- Dead links table
create table public.dead_links (
  id uuid default gen_random_uuid() primary key,
  site_id uuid references public.sites(id) on delete cascade not null,
  url text not null,
  source_url text not null,
  status_code integer not null,
  found_at timestamp with time zone default timezone('utc'::text, now()) not null,
  fixed boolean default false
);

-- Scans table
create table public.scans (
  id uuid default gen_random_uuid() primary key,
  site_id uuid references public.sites(id) on delete cascade not null,
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone,
  total_links integer default 0,
  broken_links integer default 0,
  status text default 'running' check (status in ('running', 'completed', 'failed'))
);


-- Row Level Security Policies

-- Users table policies
alter table public.users enable row level security;

create policy "Users can view own data" on public.users
  for select using (auth.uid() = id);

create policy "Users can update own data" on public.users
  for update using (auth.uid() = id);

-- Sites table policies
alter table public.sites enable row level security;

create policy "Users can view own sites" on public.sites
  for select using (auth.uid() = user_id);

create policy "Users can insert own sites" on public.sites
  for insert with check (auth.uid() = user_id);

create policy "Users can update own sites" on public.sites
  for update using (auth.uid() = user_id);

create policy "Users can delete own sites" on public.sites
  for delete using (auth.uid() = user_id);

-- Uptime logs table policies
alter table public.uptime_logs enable row level security;

create policy "Users can view logs for own sites" on public.uptime_logs
  for select using (
    exists (
      select 1 from public.sites
      where sites.id = uptime_logs.site_id
      and sites.user_id = auth.uid()
    )
  );

-- Alerts table policies
alter table public.alerts enable row level security;

create policy "Users can view alerts for own sites" on public.alerts
  for select using (
    exists (
      select 1 from public.sites
      where sites.id = alerts.site_id
      and sites.user_id = auth.uid()
    )
  );

-- Dead links table policies
alter table public.dead_links enable row level security;

create policy "Users can view dead links for own sites" on public.dead_links
  for select using (
    exists (
      select 1 from public.sites
      where sites.id = dead_links.site_id
      and sites.user_id = auth.uid()
    )
  );

create policy "Users can update dead links for own sites" on public.dead_links
  for update using (
    exists (
      select 1 from public.sites
      where sites.id = dead_links.site_id
      and sites.user_id = auth.uid()
    )
  );

-- Scans table policies
alter table public.scans enable row level security;

create policy "Users can view scans for own sites" on public.scans
  for select using (
    exists (
      select 1 from public.sites
      where sites.id = scans.site_id
      and sites.user_id = auth.uid()
    )
  );


-- Functions
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to calculate uptime percentage
create or replace function public.get_uptime_percentage(site_uuid uuid, days integer default 30)
returns numeric as $$
declare
  total_checks integer;
  up_checks integer;
  uptime_percentage numeric;
begin
  select count(*) into total_checks
  from public.uptime_logs
  where site_id = site_uuid
  and checked_at >= now() - interval '1 day' * days;

  select count(*) into up_checks
  from public.uptime_logs
  where site_id = site_uuid
  and status = 'up'
  and checked_at >= now() - interval '1 day' * days;

  if total_checks = 0 then
    return 100;
  end if;

  uptime_percentage := (up_checks::numeric / total_checks::numeric) * 100;
  return round(uptime_percentage, 2);
end;
$$ language plpgsql;