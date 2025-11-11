# Database Schema Documentation

This document serves as a comprehensive reference for the database structure, generated from `migration.sql`.

## Table of Contents

- [Tables](#tables)
  - [1. public.profiles](#1-publicprofiles)
  - [2. public.user_details](#2-publicuser_details)
  - [3. public.attendance](#3-publicattendance)
  - [4. public.leaves](#4-publicleaves)
  - [5. public.department_leave_limits](#5-publicdepartment_leave_limits)
  - [6. public.system_settings](#6-publicsystem_settings)
  - [7. public.office_locations](#7-publicoffice_locations)
  - [8. public.department_policies](#8-publicdepartment_policies)
  - [9. public.holidays](#9-publicholidays)
- [RPC Functions](#rpc-functions)
- [Relationships](#relationships)
- [Security (RLS)](#security-rls)

---

## Tables

### 1. `public.profiles`

**Description**: Core user profile information.  
**Primary Key**: `id` (UUID, references `auth.users`)

| Column               | Type          | Constraints                                 | Description               |
| :------------------- | :------------ | :------------------------------------------ | :------------------------ |
| `id`                 | `uuid`        | PK, References `auth.users`                 | User ID                   |
| `username`           | `text`        | Unique, Not Null                            | Unique username           |
| `email`              | `text`        |                                             | User email address        |
| `full_name`          | `text`        | Not Null                                    | User's full name          |
| `avatar_url`         | `text`        |                                             | Profile picture URL       |
| `role`               | `text`        | Check: `admin`, `hr`, `manager`, `employee` | User role                 |
| `designation`        | `text`        |                                             | Job title                 |
| `department`         | `text`        |                                             | Department name           |
| `date_of_joining`    | `date`        |                                             | Date of joining           |
| `reporting_managers` | `uuid[]`      |                                             | Array of manager user IDs |
| `work_config`        | `jsonb`       |                                             | Working days/hours config |
| `employment_type`    | `text`        | Check: `full_time`, `part_time`, `intern`   | Employment status         |
| `created_at`         | `timestamptz` | Default: `now()`                            | Record creation timestamp |

### 2. `public.user_details`

**Description**: Sensitive user details (PII).  
**Primary Key**: `id` (UUID, references `public.profiles`)

| Column           | Type      | Constraints                      | Description            |
| :--------------- | :-------- | :------------------------------- | :--------------------- |
| `id`             | `uuid`    | PK, References `public.profiles` | User ID                |
| `personal_email` | `text`    |                                  | Personal email address |
| `phone_number`   | `text`    |                                  | Contact number         |
| `gender`         | `text`    | Check: `Male`, `Female`, `Other` | Gender                 |
| `dob`            | `date`    |                                  | Date of birth          |
| `address`        | `text`    |                                  | Residential address    |
| `city`           | `text`    |                                  | City                   |
| `state`          | `text`    |                                  | State                  |
| `pincode`        | `text`    |                                  | Pincode                |
| `pan_number`     | `text`    |                                  | PAN Number             |
| `aadhaar_number` | `text`    |                                  | Aadhaar Number         |
| `bank_name`      | `text`    |                                  | Bank Name              |
| `account_number` | `text`    |                                  | Bank Account Number    |
| `ifsc_code`      | `text`    |                                  | IFSC Code              |
| `salary`         | `numeric` |                                  | Salary amount          |

### 3. `public.attendance`

**Description**: Daily attendance records.  
**Primary Key**: `id` (UUID)

| Column              | Type          | Constraints                                       | Description                  |
| :------------------ | :------------ | :------------------------------------------------ | :--------------------------- |
| `id`                | `uuid`        | PK, Default: `gen_random_uuid()`                  | Record ID                    |
| `user_id`           | `uuid`        | References `public.profiles`                      | User ID                      |
| `date`              | `date`        | Not Null                                          | Attendance date              |
| `status`            | `text`        | Check: `available/remote/leave/absent/extra_work` | Attendance status            |
| `check_in`          | `timestamptz` |                                                   | Check-in time                |
| `check_out`         | `timestamptz` |                                                   | Check-out time               |
| `location_snapshot` | `jsonb`       |                                                   | Location coords for in/out   |
| `duration_minutes`  | `integer`     |                                                   | Total worked minutes         |
| `deviation_minutes` | `integer`     |                                                   | Variance from standard hours |
| `created_at`        | `timestamptz` | Default: `now()`                                  | Record creation timestamp    |

### 4. `public.leaves`

**Description**: Leave requests and status.  
**Primary Key**: `id` (UUID)

| Column        | Type          | Constraints                              | Description                   |
| :------------ | :------------ | :--------------------------------------- | :---------------------------- |
| `id`          | `uuid`        | PK, Default: `gen_random_uuid()`         | Record ID                     |
| `user_id`     | `uuid`        | References `public.profiles`             | User ID                       |
| `type`        | `text`        | Not Null                                 | Leave type (e.g., Sick, Paid) |
| `start_date`  | `date`        | Not Null                                 | Start date                    |
| `end_date`    | `date`        | Not Null                                 | End date                      |
| `reason`      | `text`        |                                          | Reason for leave              |
| `status`      | `text`        | Check: `pending`, `approved`, `rejected` | Approval status               |
| `approver_id` | `uuid`        | References `public.profiles`             | User ID of approver           |
| `session`     | `text`        |                                          | `first_half` or `second_half` |
| `duration`    | `numeric`     |                                          | Duration (e.g., 0.5, 1.0)     |
| `created_at`  | `timestamptz` | Default: `now()`                         | Record creation timestamp     |

### 5. `public.department_leave_limits`

**Description**: Leave quotas per department.  
**Primary Key**: `id` (UUID)

| Column       | Type          | Constraints                      | Description       |
| :----------- | :------------ | :------------------------------- | :---------------- |
| `id`         | `uuid`        | PK, Default: `gen_random_uuid()` | Record ID         |
| `department` | `text`        | Not Null                         | Department name   |
| `leave_type` | `text`        | Not Null                         | Leave type key    |
| `limit_days` | `integer`     | Default: 0                       | Max days allowed  |
| `color`      | `text`        | Default: `#3b82f6`               | UI Color          |
| `is_paid`    | `boolean`     | Default: `true`                  | Paid leave flag   |
| `created_at` | `timestamptz` | Default: `now()`                 | Created timestamp |
| `updated_at` | `timestamptz` | Default: `now()`                 | Updated timestamp |

**Constraint**: Unique combination of (`department`, `leave_type`).

### 6. `public.system_settings`

**Description**: Global system configuration.  
**Primary Key**: `key` (text)

| Column       | Type          | Constraints      | Description       |
| :----------- | :------------ | :--------------- | :---------------- |
| `key`        | `text`        | PK               | Setting key       |
| `value`      | `text`        | Not Null         | Setting value     |
| `created_at` | `timestamptz` | Default: `now()` | Created timestamp |
| `updated_at` | `timestamptz` | Default: `now()` | Updated timestamp |

### 7. `public.office_locations`

**Description**: Geofenced office locations.  
**Primary Key**: `id` (UUID)

| Column       | Type          | Constraints                      | Description              |
| :----------- | :------------ | :------------------------------- | :----------------------- |
| `id`         | `uuid`        | PK, Default: `gen_random_uuid()` | Record ID                |
| `name`       | `text`        | Not Null                         | Office name              |
| `latitude`   | `float`       | Not Null                         | Latitude                 |
| `longitude`  | `float`       | Not Null                         | Longitude                |
| `radius`     | `integer`     | Default: 100                     | Geofence radius (meters) |
| `created_at` | `timestamptz` | Default: `now()`                 | Created timestamp        |

### 8. `public.department_policies`

**Description**: Enabled/Disabled policies per department.  
**Primary Key**: `id` (UUID)

| Column       | Type          | Constraints                      | Description             |
| :----------- | :------------ | :------------------------------- | :---------------------- |
| `id`         | `uuid`        | PK, Default: `gen_random_uuid()` | Record ID               |
| `department` | `text`        | Not Null, Unique                 | Department name         |
| `is_enabled` | `boolean`     | Default: `false`                 | Policy enabled status   |
| `policy_url` | `text`        |                                  | Link to policy document |
| `created_at` | `timestamptz` | Default: `now()`                 | Created timestamp       |
| `updated_at` | `timestamptz` | Default: `now()`                 | Updated timestamp       |

### 9. `public.holidays`

**Description**: Public and department-specific holidays.  
**Primary Key**: `id` (UUID)

| Column        | Type          | Constraints                      | Description                  |
| :------------ | :------------ | :------------------------------- | :--------------------------- |
| `id`          | `uuid`        | PK, Default: `gen_random_uuid()` | Record ID                    |
| `name`        | `text`        | Not Null                         | Holiday name                 |
| `date`        | `date`        | Not Null                         | Holiday date                 |
| `departments` | `text[]`      | Nullable                         | Applicable deps (null = all) |
| `created_at`  | `timestamptz` | Default: `now()`                 | Created timestamp            |
| `updated_at`  | `timestamptz` | Default: `now()`                 | Updated timestamp            |

---

## RPC Functions

### 1. Session Management

- **`get_user_sessions(p_user_id)`**: Returns all active sessions for a specific user.
- **`delete_session(p_session_id)`**: Deletes a specific session by ID.
- **`delete_all_user_sessions(p_user_id)`**: Logs out a user from all devices.
- **`maintain_session_limit()`**: Trigger function to enforce max 4 sessions per user.

### 2. Utility

- **`check_user_exists(email_input)`**: Checks `auth.users` to verify if an account exists (used for login/pw recovery).
- **`get_all_birthdays()`**: Fetches upcoming birthdays by joining `profiles` and `user_details`.

---

## Relationships

- **1:1**: `profiles.id` ↔ `auth.users.id`
- **1:1**: `user_details.id` ↔ `profiles.id`
- **M:1**: `attendance.user_id` → `profiles.id`
- **M:1**: `leaves.user_id` → `profiles.id`
- **M:1**: `leaves.approver_id` → `profiles.id`

---

## Security (RLS)

Row Level Security is enabled on **all tables**.

| Table                       | Read Access                    | Write Access |
| :-------------------------- | :----------------------------- | :----------- |
| **profiles**                | Public (Authenticated)         | Self Only    |
| **user_details**            | Self Only                      | Self Only    |
| **attendance**              | Public (Authenticated)         | Self Only    |
| **leaves**                  | Public (Authenticated)         | Self Only    |
| **department_leave_limits** | Public (Authenticated)         | Admin Only   |
| **system_settings**         | Public (Authenticated)         | Admin Only   |
| **office_locations**        | Public (Authenticated)         | Admin Only   |
| **department_policies**     | Public (if enabled/dept match) | Admin Only   |
| **holidays**                | Public (Authenticated)         | Admin Only   |
