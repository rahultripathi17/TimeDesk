"use client";

import { AppShell } from "@/components/layout/AppShell";
import { AttendanceCalendar } from "@/components/attendance/AttendanceCalendar";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/client";

export default function MyAttendancePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<"employee" | "manager" | "hr" | "admin">("employee");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);

          // Fetch role
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (profile) {
            setRole(profile.role);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return null; // Or a loading spinner

  return (
    <AppShell role={role}>
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

          {userId && <AttendanceCalendar userId={userId} />}
        </div>
      </main>
    </AppShell>
  );
}
