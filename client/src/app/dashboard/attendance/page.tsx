"use client";

import { AppShell } from "@/components/layout/AppShell";
import { AttendanceCalendar } from "@/components/attendance/AttendanceCalendar";

export default function MyAttendancePage() {
  // later: replace with logged-in user's employeeId from auth
  const employeeId = "EMP-001";

  return (
    <AppShell role="employee">
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                Attendance Info
              </h1>
              <p className="text-xs text-slate-500">
                View your monthly attendance history and work locations.
              </p>
            </div>
          </header>

          {/* You can add summary cards here later (Avg hours, etc.) */}

          <AttendanceCalendar employeeId={employeeId} />
        </div>
      </main>
    </AppShell>
  );
}
