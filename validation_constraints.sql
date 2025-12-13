-- Validation Constraints Reference
-- Generated from migration.sql

-- Profiles
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'hr', 'manager', 'employee'));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_employment_type_check CHECK (employment_type IN ('full_time', 'part_time', 'intern'));

-- User Details
ALTER TABLE public.user_details ADD CONSTRAINT user_details_gender_check CHECK (gender IN ('Male', 'Female', 'Other'));

-- Attendance
ALTER TABLE public.attendance ADD CONSTRAINT attendance_status_check CHECK (status IN ('available', 'remote', 'leave', 'absent', 'extra_work', 'regularization'));

-- Leaves
ALTER TABLE public.leaves ADD CONSTRAINT leaves_status_check CHECK (status IN ('pending', 'approved', 'rejected'));

-- Department Leave Limits
ALTER TABLE public.department_leave_limits ADD CONSTRAINT department_leave_limits_department_leave_type_key UNIQUE (department, leave_type);

-- Department Policies
ALTER TABLE public.department_policies ADD CONSTRAINT department_policies_department_key UNIQUE (department);
