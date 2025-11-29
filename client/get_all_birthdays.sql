-- Function to fetch birthday data for all users, bypassing RLS
-- Run this in the Supabase SQL Editor

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
language plpgsql
security definer -- Bypasses RLS
as $$
begin
  return query
  select
    p.id,
    p.full_name,
    p.avatar_url,
    p.role,
    p.designation,
    p.department,
    p.date_of_joining,
    ud.dob
  from profiles p
  join user_details ud on p.id = ud.id
  where ud.dob is not null;
end;
$$;
