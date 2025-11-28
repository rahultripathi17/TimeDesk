-- Add color column to department_leave_limits table
alter table public.department_leave_limits
add column if not exists color text default '#3b82f6'; -- Default to blue-500
