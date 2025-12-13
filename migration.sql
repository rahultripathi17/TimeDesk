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
  employment_type text check (employment_type in ('full_time', 'part_time', 'intern')),
  work_config jsonb, -- { "weekly_off": ["Saturday", "Sunday"], "shift_start": "09:30", "shift_end": "18:30" }
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
  ifsc_code text,
  salary numeric
);

-- 3. Attendance Table
create table public.attendance (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  status text check (status in ('available', 'remote', 'leave', 'absent', 'extra_work', 'regularization')),
  check_in timestamptz,
  check_out timestamptz,
  location_snapshot jsonb, -- Stores { check_in: {lat, lng}, check_out: {lat, lng} }
  duration_minutes integer, -- Total session minutes
  deviation_minutes integer, -- Difference from min working hours
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
  session text, -- 'first_half', 'second_half' for half days
  duration numeric, -- Number of days (e.g. 0.5, 1, 2)
  created_at timestamptz default now()
);

-- 5. Department Leave Limits Table
create table public.department_leave_limits (
  id uuid default gen_random_uuid() primary key,
  department text not null,
  leave_type text not null,
  limit_days integer not null default 0,
  color text default '#3b82f6',
  is_paid boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(department, leave_type)
);

-- 6. System Settings Table
create table public.system_settings (
  key text primary key,
  value text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 7. Office Locations Table
create table public.office_locations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  radius integer not null default 100, -- in meters
  created_at timestamptz default now()
);

-- 8. Department Policies Management
create table public.department_policies (
    id uuid default gen_random_uuid() primary key,
    department text not null unique,
    is_enabled boolean default false,
    policy_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Holiday Calendar Table
create table public.holidays (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    date date not null,
    departments text[], -- Array of department names. If null/empty, applies to all.
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ==========================================
-- Row Level Security (RLS) & Policies
-- ==========================================

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.user_details enable row level security;
alter table public.attendance enable row level security;
alter table public.leaves enable row level security;
alter table public.department_leave_limits enable row level security;
alter table public.system_settings enable row level security;
alter table public.office_locations enable row level security;
alter table public.department_policies enable row level security;
alter table public.holidays enable row level security;

-- Profiles Policies
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- User Details Policies
create policy "User details are viewable by owner." on user_details for select using (auth.uid() = id);
create policy "Users can insert their own details." on user_details for insert with check (auth.uid() = id);

-- Attendance Policies
create policy "Attendance is viewable by everyone." on attendance for select using (true);
create policy "Users can insert their own attendance." on attendance for insert with check (auth.uid() = user_id);
create policy "Users can update their own attendance." on attendance for update using (auth.uid() = user_id);

-- Leaves Policies
create policy "Leaves are viewable by everyone." on leaves for select using (true);
create policy "Users can insert their own leaves." on leaves for insert with check (auth.uid() = user_id);

-- Department Leave Limits Policies
create policy "Leave limits are viewable by everyone." on department_leave_limits for select using (true);
create policy "Only admins can insert leave limits." on department_leave_limits for insert with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Only admins can update leave limits." on department_leave_limits for update using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Only admins can delete leave limits." on department_leave_limits for delete using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- System Settings Policies
create policy "System settings are viewable by everyone." on system_settings for select using (true);
create policy "Only admins can insert system settings." on system_settings for insert with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Only admins can update system settings." on system_settings for update using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Office Locations Policies
create policy "Office locations are viewable by everyone." on office_locations for select using (true);
create policy "Only admins can insert office locations." on office_locations for insert with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Only admins can update office locations." on office_locations for update using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Only admins can delete office locations." on office_locations for delete using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Department Policies Policies
create policy "Admins can manage policies" on department_policies for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Users can view enabled policies for their department" on department_policies for select using (is_enabled = true and department = (select department from profiles where id = auth.uid()));

-- Holiday Policies
create policy "Enable read access for all users" on holidays for select to authenticated using (true);
create policy "Enable write access for admins" on holidays for all to authenticated using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));


-- ==========================================
-- Functions & Triggers
-- ==========================================

-- Get User Sessions
create or replace function get_user_sessions(p_user_id uuid)
returns setof auth.sessions
language sql security definer set search_path = ''
as $$
  select * from auth.sessions where user_id = p_user_id order by created_at desc;
$$;

-- Delete Session
create or replace function delete_session(p_session_id uuid)
returns void
language sql security definer set search_path = ''
as $$
  delete from auth.sessions where id = p_session_id;
$$;

-- Delete All User Sessions
create or replace function delete_all_user_sessions(p_user_id uuid)
returns void
language sql security definer set search_path = ''
as $$
  delete from auth.sessions where user_id = p_user_id;
$$;

-- Max Usage (4 Sessions) Trigger
create or replace function maintain_session_limit()
returns trigger
language plpgsql security definer
as $$
declare
  v_count integer;
begin
  select count(*) into v_count from auth.sessions where user_id = NEW.user_id;
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

drop trigger if exists on_auth_session_created on auth.sessions;
  after insert on auth.sessions
  for each row execute procedure maintain_session_limit();


-- Get All Birthdays (RPC for Birthday Slider)
create or replace function get_all_birthdays()
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  role text,
  designation text,
  department text,
  date_of_joining date,
  dob date
)
language sql
security definer
set search_path = ''
as $$
  select 
    p.id,
    p.full_name,
    p.avatar_url,
    p.role,
    p.designation,
    p.department,
    p.date_of_joining,
    ud.dob
  from public.profiles p
  join public.user_details ud on p.id = ud.id
  where ud.dob is not null
  -- Optional: active employees only? usually yes
  -- and p.role != 'term' -- if we had a status
  ;
$$;


-- Check User Exists (RPC for Login Page)
create or replace function check_user_exists(email_input text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  _exists boolean;
begin
  select exists(
    select 1 from auth.users
    where email ilike email_input
  ) into _exists;
  
  return _exists;
end;
$$;


-- ==========================================
-- Seed Data
-- ==========================================

-- System Settings
insert into public.system_settings (key, value) values 
('leave_reset_date', '2025-01-01'),
('common_info', 'Welcome to the Notice Board! Important announcements will appear here.')
on conflict (key) do nothing;

-- Holidays (2025)
insert into public.holidays (name, date, departments) values
('New Year''s Day', '2025-01-01', NULL),
('Republic Day', '2025-01-26', NULL),
('Holi', '2025-03-14', NULL),
('Independence Day', '2025-08-15', NULL),
('Gandhi Jayanti', '2025-10-02', NULL),
('Diwali', '2025-10-20', NULL),
('Christmas', '2025-12-25', NULL);
