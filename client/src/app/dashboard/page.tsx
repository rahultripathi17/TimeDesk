"use client";

import { AppShell } from "@/components/layout/AppShell";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, Home, MapPin, Globe, Palmtree, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { format, isToday } from "date-fns";
import { supabase } from "@/utils/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useRouter } from "next/navigation";

import { BirthdaySlider } from "@/components/dashboard/BirthdaySlider";

export default function DashboardPage() {
  const [status, setStatus] = useState<"available" | "remote" | "leave" | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<"available" | "remote" | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchedDate, setFetchedDate] = useState<string | null>(null);
  const [commonInfo, setCommonInfo] = useState<string | null>(null);
  const [role, setRole] = useState<"employee" | "manager" | "hr" | "admin">("employee");
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    fetchUserRole();
    fetchTodayStatus();
    fetchCommonInfo();

    // Poll for status updates every minute
    const interval = setInterval(() => {
      // This will handle both day changes (by fetching new date) and status updates
      fetchTodayStatus();
    }, 60000);

    // Also check on window focus
    const handleFocus = () => {
      const currentToday = format(new Date(), 'yyyy-MM-dd');
      if (fetchedDate && currentToday !== fetchedDate) {
        fetchTodayStatus();
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchedDate]);

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile) {
        setRole(profile.role);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    } finally {
      setRoleLoading(false);
    }
  };

  const fetchCommonInfo = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'common_info')
        .maybeSingle();

      if (data) {
        setCommonInfo(data.value);
      }
    } catch (error) {
      console.error("Error fetching common info:", error);
    }
  };

  const handleStatusSelect = (newStatus: "available" | "remote") => {
    setSelectedStatus(newStatus);
  };

  const confirmStatus = () => {
    if (selectedStatus) {
      updateStatus(selectedStatus);
    }
  };

  const fetchTodayStatus = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const todayDate = format(new Date(), 'yyyy-MM-dd');
      setFetchedDate(todayDate);

      // 1. Check Attendance Table First
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('status, created_at')
        .eq('user_id', user.id)
        .eq('date', todayDate)
        .maybeSingle();

      if (attendanceData) {
        setStatus(attendanceData.status as any);
        const date = new Date(attendanceData.created_at);
        setLastUpdated(isToday(date) ? format(date, "h:mm a") : format(date, "MMM d, h:mm a"));
        return;
      }

      // 2. Fallback: Check Leaves Table if no attendance record
      const { data: leaveData, error: leaveError } = await supabase
        .from('leaves')
        .select('status, updated_at, created_at')
        .eq('user_id', user.id)
        .lte('start_date', todayDate)
        .gte('end_date', todayDate)
        .eq('status', 'approved')
        .maybeSingle();

      if (leaveData) {
        setStatus('leave');
        // Use updated_at if available, else created_at
        const date = new Date(leaveData.updated_at || leaveData.created_at);
        setLastUpdated(isToday(date) ? format(date, "h:mm a") : format(date, "MMM d, h:mm a"));
      } else {
        // 3. No Status Found - Reset State
        setStatus(null);
        setLastUpdated(null);
      }

    } catch (error) {
      console.error('Error fetching status:', error);
    } finally {
      setLoading(false);
    }
  };

  const router = useRouter();

  const updateStatus = async (newStatus: "available" | "remote" | "leave") => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("You must be logged in to update status.");
        return;
      }

      const todayDate = format(new Date(), 'yyyy-MM-dd');

      if (newStatus === "leave") {
        // Check if leave is applied for today
        const { data: leaveData, error: leaveError } = await supabase
          .from('leaves')
          .select('id, status')
          .eq('user_id', user.id)
          .lte('start_date', todayDate)
          .gte('end_date', todayDate)
          .in('status', ['approved', 'pending']) // Check for approved or pending leaves
          .maybeSingle();

        if (leaveError) {
          console.error("Error checking leave status:", leaveError);
          // Continue to redirect if error? Or stop? Let's stop and alert.
          alert("Error checking leave status. Please try again.");
          return;
        }

        if (!leaveData) {
          // No leave found, redirect to apply
          router.push("/leaves/apply");
          return;
        }
        // If leave exists, proceed to update status to 'leave'
      }

      // Upsert attendance record
      const { error } = await supabase
        .from('attendance')
        .upsert({
          user_id: user.id,
          date: todayDate,
          status: newStatus,
          created_at: new Date().toISOString()
        }, { onConflict: 'user_id, date' });

      if (error) throw error;

      setStatus(newStatus);
      setLastUpdated(format(new Date(), "h:mm a"));
    } catch (error: any) {
      console.error('Error updating status:', error);
      alert("Failed to update status: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = () => {
    if (!status) {
      return {
        label: "No Status Updated",
        icon: AlertCircle,
        color: "text-slate-500",
        bgColor: "bg-slate-50",
        borderColor: "border-slate-200"
      };
    }
    switch (status) {
      case "available":
        return {
          label: "Working from Office",
          icon: MapPin,
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
          borderColor: "border-emerald-100"
        };
      case "remote":
        return {
          label: "Working Remotely",
          icon: Globe,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-100"
        };
      case "leave":
        return {
          label: "On Leave",
          icon: Palmtree,
          color: "text-amber-600",
          bgColor: "bg-amber-50",
          borderColor: "border-amber-100"
        };
    }
  };

  const currentStatus = getStatusDisplay();
  const StatusIcon = currentStatus.icon;

  const getDashboardTitle = () => {
    switch (role) {
      case "admin": return "Admin Dashboard";
      case "manager": return "Manager Dashboard";
      case "hr": return "HR Dashboard";
      default: return "My Dashboard";
    }
  };

  if (roleLoading) {
    return null; // Or a loading spinner
  }



  return (
    <AppShell role={role}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <DashboardHeader title={getDashboardTitle()} />

        {role !== 'admin' && (
          <section className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] mb-6">
            {/* Today's status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Home className="h-5 w-5" />
                  Today&apos;s Status
                </CardTitle>
                <CardDescription className="text-xs">
                  View or update your work location.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs ${currentStatus.bgColor} ${currentStatus.borderColor}`}>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                      Current
                    </p>
                    <p className={`mt-1 flex items-center gap-1.5 text-sm font-semibold ${currentStatus.color}`}>
                      <StatusIcon className="h-4 w-4" />
                      {currentStatus.label}
                    </p>
                  </div>
                  {lastUpdated && (
                    <span className="text-[11px] text-slate-400">
                      Last updated {lastUpdated}
                    </span>
                  )}
                </div>

                {!status && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <Button
                        variant={selectedStatus === "available" ? "default" : "outline"}
                        className={cn(
                          "justify-start transition-all",
                          selectedStatus === "available" ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600" : "hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                        )}
                        onClick={() => handleStatusSelect("available")}
                        disabled={loading}
                      >
                        <Home className="mr-2 h-4 w-4" />
                        Office
                      </Button>
                      <Button
                        variant={selectedStatus === "remote" ? "default" : "outline"}
                        className={cn(
                          "justify-start transition-all",
                          selectedStatus === "remote" ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600" : "hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        )}
                        onClick={() => handleStatusSelect("remote")}
                        disabled={loading}
                      >
                        <Globe className="mr-2 h-4 w-4" />
                        Remote
                      </Button>
                      <Button
                        variant="outline"
                        className="justify-start hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                        onClick={() => updateStatus("leave")}
                        disabled={loading}
                      >
                        <Palmtree className="mr-2 h-4 w-4" />
                        On leave
                      </Button>
                    </div>

                    {selectedStatus && (
                      <div className="flex animate-in fade-in slide-in-from-top-2">
                        <Button
                          className="w-full gap-2 bg-slate-900 text-white hover:bg-slate-800"
                          onClick={confirmStatus}
                          disabled={loading}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Confirm & Mark Attendance
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {status && (
                  <div className="rounded-lg bg-slate-50 p-4 text-center">
                    <p className="text-xs text-slate-500 mb-1">Attendance marked for today</p>
                    <p className="text-sm font-medium text-slate-900">You cannot change your status once marked.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-5 w-5" />
                  Last 7 days
                </CardTitle>
                <CardDescription className="text-xs">
                  Quick snapshot of your week.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">Office</p>
                  <p className="mt-1 text-lg font-semibold">3</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">WFH</p>
                  <p className="mt-1 text-lg font-semibold">2</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">Leave</p>
                  <p className="mt-1 text-lg font-semibold">1</p>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {commonInfo && (
          <div className="mb-6">
            <Card className="overflow-hidden border-l-4 border-l-indigo-500 shadow-sm transition-all hover:shadow-md">
              <CardHeader className="bg-slate-50/50 pb-3 pt-4">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <Info className="h-3.5 w-3.5" />
                  </div>
                  Notice Board
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="prose prose-sm max-w-none text-slate-600">
                  <p className="whitespace-pre-wrap leading-relaxed">{commonInfo}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <BirthdaySlider role={role} />


      </div>
    </AppShell>
  );
}
