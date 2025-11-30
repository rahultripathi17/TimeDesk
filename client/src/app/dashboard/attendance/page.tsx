"use client";

import { AppShell } from "@/components/layout/AppShell";
import { AttendanceCalendar } from "@/components/attendance/AttendanceCalendar";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/client";

export default function MyAttendancePage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  if (!userId) return null; // Or a loading spinner

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

          <AttendanceCalendar userId={userId} />
        </div>
      </main>
    </AppShell>
  );
}
