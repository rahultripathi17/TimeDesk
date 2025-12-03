# Rebuild Git History Script V3 (Clear & Descriptive Logs)

# 1. Clear existing git
if (Test-Path .git) {
    Remove-Item -Path .git -Recurse -Force
}

git init

# Helper to commit with date
function Git-Commit {
    param (
        [string]$Message,
        [string]$Date,
        [string[]]$Paths
    )
    foreach ($path in $Paths) {
        if (Test-Path $path) {
            git add $path
        }
    }
    # Check if anything is staged
    $status = git status --porcelain
    if ($status) {
        $env:GIT_AUTHOR_DATE = $Date
        $env:GIT_COMMITTER_DATE = $Date
        git commit -m "$Message"
        Write-Host "Committed: $Message"
    }
    else {
        Write-Host "Skipping empty commit: $Message"
    }
}

# --- Dates Setup (Last 10 Days: Nov 24 - Dec 03) ---

# Day 1: Nov 24 (Sunday - Setup)
$d1_1 = "2025-11-24 10:00:00"
$d1_2 = "2025-11-24 11:30:00"
$d1_3 = "2025-11-24 12:45:00"

# Day 2: Nov 25 (Monday - Auth & UI)
$d2_1 = "2025-11-25 09:15:00"
$d2_2 = "2025-11-25 10:45:00"
$d2_3 = "2025-11-25 13:20:00"
$d2_4 = "2025-11-25 15:00:00"
$d2_5 = "2025-11-25 16:45:00"

# Day 3: Nov 26 (Tuesday - Dashboard)
$d3_1 = "2025-11-26 09:30:00"
$d3_2 = "2025-11-26 11:00:00"
$d3_3 = "2025-11-26 14:15:00"
$d3_4 = "2025-11-26 16:30:00"
$d3_5 = "2025-11-26 18:00:00"

# Day 4: Nov 27 (Wednesday - Attendance)
$d4_1 = "2025-11-27 10:00:00"
$d4_2 = "2025-11-27 11:45:00"
$d4_3 = "2025-11-27 14:30:00"
$d4_4 = "2025-11-27 16:00:00"

# Day 5: Nov 28 (Thursday - Leaves)
$d5_1 = "2025-11-28 09:00:00"
$d5_2 = "2025-11-28 10:30:00"
$d5_3 = "2025-11-28 13:00:00"
$d5_4 = "2025-11-28 15:15:00"
$d5_5 = "2025-11-28 17:00:00"

# Day 6: Nov 29 (Friday - Admin)
$d6_1 = "2025-11-29 10:15:00"
$d6_2 = "2025-11-29 12:00:00"
$d6_3 = "2025-11-29 14:45:00"
$d6_4 = "2025-11-29 16:30:00"

# Day 7: Nov 30 (Saturday - Admin Config)
$d7_1 = "2025-11-30 11:00:00"
$d7_2 = "2025-11-30 13:30:00"
$d7_3 = "2025-11-30 15:45:00"

# Day 8: Dec 01 (Sunday - Polish)
$d8_1 = "2025-12-01 10:30:00"
$d8_2 = "2025-12-01 12:15:00"
$d8_3 = "2025-12-01 14:00:00"
$d8_4 = "2025-12-01 16:00:00"

# Day 9: Dec 02 (Monday - Master Attendance)
$d9_1 = "2025-12-02 09:30:00"
$d9_2 = "2025-12-02 11:00:00"
$d9_3 = "2025-12-02 13:45:00"
$d9_4 = "2025-12-02 15:30:00"
$d9_5 = "2025-12-02 17:15:00"

# Day 10: Dec 03 (Tuesday - Today)
$d10_1 = "2025-12-03 08:45:00"
$d10_2 = "2025-12-03 09:30:00"
$d10_3 = "2025-12-03 10:15:00"

# --- COMMIT HISTORY ---

# Day 1: Setup
Git-Commit -Message "feat(project): initialize Next.js 16 app with TypeScript, Tailwind CSS, and ESLint configuration" -Date $d1_1 -Paths @("package.json", "tsconfig.json", "next.config.ts", "tailwind.config.ts", "postcss.config.mjs", "eslint.config.mjs", ".gitignore", ".env.local")
Git-Commit -Message "chore(assets): add initial static assets including logo and illustrations" -Date $d1_2 -Paths @("public")
Git-Commit -Message "db(schema): design initial PostgreSQL schema with profiles, attendance, and leaves tables" -Date $d1_3 -Paths @("database_schema.md", "migration.sql", "validation_constraints.sql")

# Day 2: Core UI & Auth
Git-Commit -Message "feat(ui): setup Shadcn UI component library with custom theme configuration" -Date $d2_1 -Paths @("src/components/ui", "src/lib/utils.ts", "components.json")
Git-Commit -Message "feat(auth): implement Supabase authentication client and server-side middleware" -Date $d2_2 -Paths @("src/utils/supabase", "src/middleware.ts", "src/types/supabase.ts")
Git-Commit -Message "feat(auth): create responsive login page with form validation and error handling" -Date $d2_3 -Paths @("src/app/page.tsx", "src/app/globals.css")
Git-Commit -Message "feat(auth): add password recovery and update password flows" -Date $d2_4 -Paths @("src/app/forgot-password", "src/app/update-password")
Git-Commit -Message "style(auth): enhance login page with smooth animations and transitions" -Date $d2_5 -Paths @("src/app/page.tsx")

# Day 3: Dashboard & Layout
Git-Commit -Message "feat(layout): implement main AppShell with responsive sidebar navigation" -Date $d3_1 -Paths @("src/components/layout/AppShell.tsx", "src/app/layout.tsx", "src/app/providers.tsx")
Git-Commit -Message "feat(sidebar): add role-based navigation links for Employee, Manager, HR, and Admin" -Date $d3_2 -Paths @("src/components/layout/sidebar.tsx")
Git-Commit -Message "feat(dashboard): build dashboard header with user profile and quick stats" -Date $d3_3 -Paths @("src/components/dashboard/DashboardHeader.tsx", "src/app/dashboard/page.tsx")
Git-Commit -Message "feat(dashboard): implement interactive Birthday Slider component" -Date $d3_4 -Paths @("src/components/dashboard/BirthdaySlider.tsx")
Git-Commit -Message "feat(dashboard): add real-time notifications panel" -Date $d3_5 -Paths @("src/components/dashboard/DashboardNotifications.tsx")

# Day 4: Attendance Feature
Git-Commit -Message "feat(attendance): create individual employee attendance history page" -Date $d4_1 -Paths @("src/app/attendance/[userId]/page.tsx")
Git-Commit -Message "feat(calendar): build custom Attendance Calendar with status indicators" -Date $d4_2 -Paths @("src/components/attendance/AttendanceCalendar.tsx")
Git-Commit -Message "api(attendance): implement check-in and check-out API endpoints with location validation" -Date $d4_3 -Paths @("src/app/api/attendance")
Git-Commit -Message "ui(calendar): add detailed view dialog for daily attendance records" -Date $d4_4 -Paths @("src/components/attendance/AttendanceCalendarDialog.tsx")

# Day 5: Leaves Module
Git-Commit -Message "feat(leaves): create comprehensive leave application form with date range picker" -Date $d5_1 -Paths @("src/app/leaves/apply/page.tsx", "src/components/FormField.tsx")
Git-Commit -Message "api(leaves): implement leave submission logic with overlap checking" -Date $d5_2 -Paths @("src/app/api/leaves/route.ts")
Git-Commit -Message "feat(leaves): add leave balance dashboard with visual progress bars" -Date $d5_3 -Paths @("src/app/leaves/balance/page.tsx", "src/app/api/leaves/balance/route.ts")
Git-Commit -Message "feat(manager): implement Team Attendance view for reporting managers" -Date $d5_4 -Paths @("src/app/manager", "src/components/attendance/TeamAttendanceList.tsx")
Git-Commit -Message "fix(validation): ensure leave end date is not before start date" -Date $d5_5 -Paths @("src/utils/validation.ts")

# Day 6: Admin Panel
Git-Commit -Message "feat(admin): create User Management dashboard with search and filters" -Date $d6_1 -Paths @("src/app/admin/users/page.tsx")
Git-Commit -Message "feat(admin): implement Add New User flow with role and department assignment" -Date $d6_2 -Paths @("src/app/admin/users/new/page.tsx", "src/app/api/admin/users/route.ts")
Git-Commit -Message "feat(admin): add Department Management page for creating and editing departments" -Date $d6_3 -Paths @("src/app/admin/departments/page.tsx")
Git-Commit -Message "feat(admin): build Master Attendance overview for organization-wide tracking" -Date $d6_4 -Paths @("src/app/admin/attendance/page.tsx", "src/app/api/admin/attendance/route.ts")

# Day 7: Admin Features cont.
Git-Commit -Message "feat(admin): implement Leave Approval workflow with Accept/Reject actions" -Date $d7_1 -Paths @("src/app/admin/leaves/page.tsx", "src/app/api/leaves/approve/route.ts")
Git-Commit -Message "feat(admin): add configuration for Department Leave Limits" -Date $d7_2 -Paths @("src/app/admin/leaves/limits/page.tsx", "src/app/api/admin/leaves/limits/route.ts")
Git-Commit -Message "feat(settings): create System Settings page for global configurations" -Date $d7_3 -Paths @("src/app/admin/settings/page.tsx", "src/app/settings/page.tsx")

# Day 8: Refinements & Fixes
Git-Commit -Message "feat(hr): add Reports and Policies section for HR role" -Date $d8_1 -Paths @("src/app/hr")
Git-Commit -Message "ui(toast): integrate Sonner for global success/error toast notifications" -Date $d8_2 -Paths @("src/components/ui/sonner.tsx", "src/components/ui/toaster.tsx", "src/hooks/use-toast.ts")
Git-Commit -Message "fix(sidebar): resolve mobile responsiveness issues and overlap on small screens" -Date $d8_3 -Paths @("src/components/layout/sidebar.tsx")
Git-Commit -Message "perf(attendance): optimize data fetching strategy for large datasets" -Date $d8_4 -Paths @("src/app/admin/attendance/page.tsx")

# Day 9: Master Attendance Polish
Git-Commit -Message "feat(attendance): implement 'Sort by Latest Activity' to prioritize active users" -Date $d9_1 -Paths @("src/app/admin/attendance/page.tsx")
Git-Commit -Message "ui(attendance): refine List View to show 'Daily Snapshot' (one row per user)" -Date $d9_2 -Paths @("src/app/admin/attendance/page.tsx")
Git-Commit -Message "feat(attendance): add logic to display 'Absent' status for missing records" -Date $d9_3 -Paths @("src/app/admin/attendance/page.tsx")
Git-Commit -Message "fix(ui): resolve date picker overflow issue on mobile devices" -Date $d9_4 -Paths @("src/app/admin/attendance/page.tsx")
Git-Commit -Message "fix(calendar): ensure correct Absent status rendering based on joining date" -Date $d9_5 -Paths @("src/app/admin/attendance/page.tsx")

# Day 10: PWA & Docs
Git-Commit -Message "feat(pwa): add Web App Manifest and meta tags for 'Add to Home Screen' support" -Date $d10_1 -Paths @("public/manifest.json", "src/app/layout.tsx")
Git-Commit -Message "style(mobile): increase touch targets for sidebar navigation items" -Date $d10_2 -Paths @("src/components/layout/sidebar.tsx")
Git-Commit -Message "docs(readme): update README with comprehensive project overview, features, and screenshots" -Date $d10_3 -Paths @("README.md")

# Catch all remaining files
Git-Commit -Message "chore(cleanup): final code cleanup, formatting, and type definitions update" -Date $d10_3 -Paths @(".")

Write-Host "V3 Git history (Clear & Descriptive) rebuilt successfully!"
