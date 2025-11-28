-- Create System Settings Table
create table if not exists public.system_settings (
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
