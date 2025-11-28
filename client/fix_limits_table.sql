-- Create Department Leave Limits Table if it doesn't exist
create table if not exists public.department_leave_limits (
  id uuid default gen_random_uuid() primary key,
  department text not null,
  leave_type text not null,
  limit_days integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(department, leave_type)
);

-- Enable RLS
alter table public.department_leave_limits enable row level security;

-- Policies
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

create policy "Only admins can delete leave limits."
  on department_leave_limits for delete
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );
