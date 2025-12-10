-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique not null,
  email text,
  full_name text not null,
  avatar_url text,
  role text check (role in ('admin', 'hr', 'manager', 'employee')),
  designation text,
  department text,
  date_of_joining date,
  reporting_managers uuid[],
  created_at timestamptz default now()
);

-- 2. User Details Table (Sensitive)
create table public.user_details (
  id uuid references public.profiles(id) on delete cascade not null primary key,
  personal_email text,
  phone_number text,
  gender text check (gender in ('Male', 'Female', 'Other')),
  dob date,
  address text,
  city text,
  state text,
  pincode text,
  pan_number text,
  aadhaar_number text,
  bank_name text,
  account_number text,
  ifsc_code text
);

-- 3. Attendance Table
create table public.attendance (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  status text check (status in ('available', 'remote', 'leave', 'absent')),
  check_in timestamptz,
  check_out timestamptz,
  created_at timestamptz default now()
);

-- 4. Leaves Table
create table public.leaves (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null,
  start_date date not null,
  end_date date not null,
  reason text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approver_id uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- 5. Department Leave Limits Table
create table public.department_leave_limits (
  id uuid default gen_random_uuid() primary key,
  department text not null,
  leave_type text not null,
  limit_days integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(department, leave_type)
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.user_details enable row level security;
alter table public.attendance enable row level security;
alter table public.leaves enable row level security;
alter table public.department_leave_limits enable row level security;

-- Policies (Simplified for initial setup)
-- Profiles: Readable by everyone (authenticated), Writable by self (for now, or admin)
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- User Details: Readable by self
create policy "User details are viewable by owner."
  on user_details for select
  using ( auth.uid() = id );

create policy "Users can insert their own details."
  on user_details for insert
  with check ( auth.uid() = id );

-- Attendance: Readable by everyone (for dashboard stats), Writable by self
create policy "Attendance is viewable by everyone."
  on attendance for select
  using ( true );

create policy "Users can insert their own attendance."
  on attendance for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own attendance."
  on attendance for update
  using ( auth.uid() = user_id );

-- Leaves: Readable by everyone (for calendar), Writable by self
create policy "Leaves are viewable by everyone."
  on leaves for select
  using ( true );

create policy "Users can insert their own leaves."
  on leaves for insert
  with check ( auth.uid() = user_id );

-- Department Leave Limits: Readable by everyone, Writable by admin
create policy "Leave limits are viewable by everyone."
  on department_leave_limits for select
  using ( true );

create policy "Only admins can insert leave limits."
  on department_leave_limits for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Only admins can update leave limits."
  on department_leave_limits for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 6. System Settings Table
create table public.system_settings (
  key text primary key,
  value text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.system_settings enable row level security;

-- Policies
create policy "System settings are viewable by everyone."
  on system_settings for select
  using ( true );

create policy "Only admins can insert system settings."
  on system_settings for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Only admins can update system settings."
  on system_settings for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Initial Seed
insert into public.system_settings (key, value)
values ('leave_reset_date', '2024-01-01')
on conflict (key) do nothing;

-- 7. Add work_config to profiles
alter table public.profiles 
add column if not exists work_config jsonb;

-- 8. Add employment_type to profiles
alter table public.profiles
add column if not exists employment_type text check (employment_type in ('full_time', 'part_time', 'intern'));

-- 9. Add salary to user_details
alter table public.user_details
add column if not exists salary numeric;

-- 10. Add color to department_leave_limits
alter table public.department_leave_limits
add column if not exists color text default '#3b82f6';

-- 11. Additional Policies
create policy "Only admins can delete leave limits."
  on department_leave_limits for delete
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 12. Additional Seed Data
insert into public.system_settings (key, value)
values ('common_info', 'Welcome to the Notice Board! Important announcements will appear here.')
on conflict (key) do nothing;

-- 13. Office Locations Table
create table public.office_locations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  radius integer not null default 100, -- in meters
  created_at timestamptz default now()
);

-- Enable RLS for Office Locations
alter table public.office_locations enable row level security;

create policy "Office locations are viewable by everyone."
  on office_locations for select
  using ( true );

create policy "Only admins can insert office locations."
  on office_locations for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Only admins can update office locations."
  on office_locations for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Only admins can delete office locations."
  on office_locations for delete
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 14. Update Attendance Table with Location columns
alter table public.attendance
add column if not exists location_snapshot jsonb, -- Stores { check_in: {lat, lng}, check_out: {lat, lng} }
add column if not exists duration_minutes integer, -- Total session minutes
add column if not exists deviation_minutes integer; -- Difference from min working hours


-- 15. Session Management Functions
-- Get Sessions (Fixes ambiguous column name issue)
create or replace function get_user_sessions(p_user_id uuid)
returns setof auth.sessions
language sql
security definer
set search_path = ''
as $$
  select * from auth.sessions where user_id = p_user_id order by created_at desc;
$$;

-- Delete specific session
create or replace function delete_session(p_session_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.sessions where id = p_session_id;
$$;

-- Delete all sessions for user
create or replace function delete_all_user_sessions(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.sessions where user_id = p_user_id;
$$;

-- 16. Max 4 Sessions Trigger
create or replace function maintain_session_limit()
returns trigger
language plpgsql
security definer
as $$
declare
  v_count integer;
begin
  -- Check session count for the user
  select count(*) into v_count from auth.sessions where user_id = NEW.user_id;
  
  -- If more than 4, delete the oldest ones
  if v_count > 4 then
    delete from auth.sessions
    where id in (
      select id from auth.sessions
      where user_id = NEW.user_id
      order by created_at asc
      limit (v_count - 4)
    );
  end if;
  return NEW;
end;
$$;

-- Create the trigger (dropped first to ensure idempotency)
drop trigger if exists on_auth_session_created on auth.sessions;
create trigger on_auth_session_created
  after insert on auth.sessions
  for each row execute procedure maintain_session_limit();

