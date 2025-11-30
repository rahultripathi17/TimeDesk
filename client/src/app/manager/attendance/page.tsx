"use client";

import { AppShell } from "@/components/layout/AppShell";
import { TeamAttendanceList } from "@/components/attendance/TeamAttendanceList";

export default function ManagerAttendancePage() {
    return (
        <AppShell role="manager">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">Team Attendance</h1>
                    <p className="text-sm text-slate-500">
                        View attendance status and history for your team members.
                    </p>
                </div>

                <TeamAttendanceList role="manager" />
            </div>
        </AppShell>
    );
}
