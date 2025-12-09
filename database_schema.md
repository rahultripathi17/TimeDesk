# Database Schema Documentation

This document is generated from `migration.sql` and serves as a reference for the database structure.

## Tables

### 1. `public.profiles`

- **Description**: Core user profile information.
- **Primary Key**: `id` (UUID, references `auth.users`)
- **Columns**:
  - `username` (text, unique, not null)
  - `email` (text)
  - `full_name` (text, not null)
  - `avatar_url` (text)
  - `role` (text, check: 'admin', 'hr', 'manager', 'employee')
  - `designation` (text)
  - `department` (text)
  - `date_of_joining` (date)
  - `reporting_managers` (uuid[])
  - `work_config` (jsonb)
  - `employment_type` (text, check: 'full_time', 'part_time', 'intern')
  - `created_at` (timestamptz, default: now())

### 2. `public.user_details`

- **Description**: Sensitive user details (PII).
- **Primary Key**: `id` (UUID, references `public.profiles`)
- **Columns**:
  - `personal_email` (text)
  - `phone_number` (text)
  - `gender` (text, check: 'Male', 'Female', 'Other')
  - `dob` (date)
  - `address` (text)
  - `city` (text)
  - `state` (text)
  - `pincode` (text)
  - `pan_number` (text)
  - `aadhaar_number` (text)
  - `bank_name` (text)
  - `account_number` (text)
  - `ifsc_code` (text)
  - `salary` (numeric)

### 3. `public.attendance`

- **Description**: Daily attendance records.
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `user_id` (UUID, references `public.profiles`)
  - `date` (date, not null)
  - `status` (text, check: 'available', 'remote', 'leave', 'absent')
  - `check_in` (timestamptz)
  - `check_out` (timestamptz)
  - `location_snapshot` (jsonb) - Store `{ check_in: { lat, lng }, check_out: { ... } }`
  - `duration_minutes` (integer)
  - `deviation_minutes` (integer)
  - `created_at` (timestamptz, default: now())

### 4. `public.leaves`

- **Description**: Leave requests and status.
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `user_id` (UUID, references `public.profiles`)
  - `type` (text, not null)
  - `start_date` (date, not null)
  - `end_date` (date, not null)
  - `reason` (text)
  - `status` (text, default: 'pending', check: 'pending', 'approved', 'rejected')
  - `approver_id` (UUID, references `public.profiles`)
  - `created_at` (timestamptz, default: now())

### 5. `public.department_leave_limits`

- **Description**: Leave quotas per department.
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `department` (text, not null)
  - `leave_type` (text, not null)
  - `limit_days` (integer, not null, default: 0)
  - `color` (text, default: '#3b82f6')
  - `created_at` (timestamptz, default: now())
  - `updated_at` (timestamptz, default: now())
- **Constraints**: Unique(`department`, `leave_type`)

### 6. `public.system_settings`

- **Description**: Global system configuration.
- **Primary Key**: `key` (text)
- **Columns**:
  - `value` (text, not null)
  - `created_at` (timestamptz, default: now())
  - `updated_at` (timestamptz, default: now())

### 7. `public.office_locations`

- **Description**: Geofenced office locations.
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `name` (text, not null)
  - `latitude` (float, not null)
  - `longitude` (float, not null)
  - `radius` (integer, default: 100)
  - `created_at` (timestamptz, default: now())

## Relationships

- `profiles.id` -> `auth.users.id` (1:1)
- `user_details.id` -> `profiles.id` (1:1)
- `attendance.user_id` -> `profiles.id` (M:1)
- `leaves.user_id` -> `profiles.id` (M:1)
- `leaves.approver_id` -> `profiles.id` (M:1)

## Security (RLS)

Row Level Security is enabled on all tables.

- **Profiles**: Public read, Self write.
- **User Details**: Self read/write.
- **Attendance**: Public read, Self write.
- **Leaves**: Public read, Self write.
- **Department Limits**: Public read, Admin write.
- **System Settings**: Public read, Admin write.
- **Office Locations**: Public read, Admin write.
