"use client";

import { AppShell } from "@/components/layout/AppShell";
import { TeamAttendanceList } from "@/components/attendance/TeamAttendanceList";

export default function EmployeeTeamAttendancePage() {
    return (
        <AppShell role="employee">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">Team Attendance</h1>
                    <p className="text-sm text-slate-500">
                        View attendance status for your department colleagues.
                    </p>
                </div>

                <TeamAttendanceList role="employee" />
            </div>
        </AppShell>
    );
}
