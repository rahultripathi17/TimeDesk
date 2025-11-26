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
  const [status, setStatus] = useState<"available" | "remote" | "leave" | "leave_first_half" | "available_after_leave" | "available_before_leave" | "leave_second_half" | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<"available" | "remote" | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchedDate, setFetchedDate] = useState<string | null>(null);
  const [commonInfo, setCommonInfo] = useState<string | null>(null);
  const [role, setRole] = useState<"employee" | "manager" | "hr" | "admin">("employee");
  const [roleLoading, setRoleLoading] = useState(true);

  const [workConfig, setWorkConfig] = useState<any>(null);

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

      // 1. Fetch User Profile for Work Config
      const { data: profile } = await supabase
        .from('profiles')
        .select('work_config')
        .eq('id', user.id)
        .single();

      const config = profile?.work_config;
      setWorkConfig(config);

      // 2. Check Approved Leaves for Today
      // Fetch ALL leaves for today and filter in JS to avoid DB query issues
      const { data: allLeaves } = await supabase
        .from('leaves')
        .select('type, session, status, created_at') // Removed updated_at
        .eq('user_id', user.id)
        .lte('start_date', todayDate)
        .gte('end_date', todayDate);

      const leaveData = allLeaves?.find(l => l.status === 'approved');

      if (leaveData) {
        // LEAVE PRIORITY LOGIC
        // Check for 'Half Day' type OR presence of session (which implies half day)
        if (leaveData.type === 'Half Day' || leaveData.session) {
          // Calculate Midpoint dynamically
          let midpointTime = "13:00"; // Default fallback

          if (config?.fixed) {
            const start = config.fixed.start_time || "09:00";
            const end = config.fixed.end_time || "17:00";

            const [startH, startM] = start.split(':').map(Number);
            const [endH, endM] = end.split(':').map(Number);

            const startDate = new Date();
            startDate.setHours(startH, startM, 0, 0);

            const endDate = new Date();
            endDate.setHours(endH, endM, 0, 0);

            // Calculate midpoint timestamp
            const midTimestamp = (startDate.getTime() + endDate.getTime()) / 2;
            const midDate = new Date(midTimestamp);

            midpointTime = format(midDate, 'HH:mm');
          }

          const now = new Date();
          const currentTimeStr = format(now, 'HH:mm');

          if (leaveData.session === 'first_half') {
            // Scenario B: First Half Leave (Late Start)
            // Before Midpoint: "Available after [Midpoint]" (Amber)
            // After Midpoint: "Available" (Green)
            if (currentTimeStr < midpointTime) {
              setStatus('leave_first_half'); // "Available after..."
            } else {
              setStatus('available_after_leave'); // "Available"
            }
          } else if (leaveData.session === 'second_half') {
            // Scenario C: Second Half Leave (Early Exit)
            // Before Midpoint: "Available till [Midpoint]" (Green)
            // After Midpoint: "On Half Day Leave" (Amber)
            if (currentTimeStr < midpointTime) {
              setStatus('available_before_leave'); // "Available till..."
            } else {
              setStatus('leave_second_half'); // "On Half Day Leave"
            }
          } else {
            // Fallback for unknown session
            setStatus('leave');
          }
        } else {
          // Scenario A: Full Day Leave
          setStatus('leave');
        }

        const date = new Date(leaveData.created_at);
        setLastUpdated(isToday(date) ? format(date, "h:mm a") : format(date, "MMM d, h:mm a"));
        return;
      }

      // 3. If NO Leave, Check Manual Attendance
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status, created_at')
        .eq('user_id', user.id)
        .eq('date', todayDate)
        .maybeSingle();

      if (attendanceData) {
        setStatus(attendanceData.status as any);
        const date = new Date(attendanceData.created_at);
        setLastUpdated(isToday(date) ? format(date, "h:mm a") : format(date, "MMM d, h:mm a"));
      } else {
        // 4. No Status Found
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

    // Dynamic Midpoint Calculation
    let midpointLabel = "1:00 PM"; // Default fallback
    if (workConfig?.fixed?.start_time && workConfig?.fixed?.end_time) {
      const start = workConfig.fixed.start_time;
      const end = workConfig.fixed.end_time;

      const [startH, startM] = start.split(':').map(Number);
      const [endH, endM] = end.split(':').map(Number);

      const startDate = new Date(); startDate.setHours(startH, startM, 0, 0);
      const endDate = new Date(); endDate.setHours(endH, endM, 0, 0);

      const midpointDate = new Date((startDate.getTime() + endDate.getTime()) / 2);
      midpointLabel = format(midpointDate, 'h:mm a');
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
      case "leave_first_half":
        return {
          label: `Available after ${midpointLabel}`,
          icon: Palmtree,
          color: "text-amber-600",
          bgColor: "bg-amber-50",
          borderColor: "border-amber-100"
        };
      case "leave_second_half":
        return {
          label: "On Half Day Leave",
          icon: Palmtree,
          color: "text-amber-600",
          bgColor: "bg-amber-50",
          borderColor: "border-amber-100"
        };
      case "available_after_leave":
        return {
          label: "Available",
          icon: CheckCircle2,
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
          borderColor: "border-emerald-100"
        };
      case "available_before_leave":
        return {
          label: `Available till ${midpointLabel}`,
          icon: CheckCircle2,
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
          borderColor: "border-emerald-100"
        };
      default:
        return {
          label: "Unknown Status",
          icon: AlertCircle,
          color: "text-slate-500",
          bgColor: "bg-slate-50",
          borderColor: "border-slate-200"
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

  // Format Work Schedule
  const getWorkSchedule = () => {
    if (!workConfig?.fixed) return {
      time: "09:00 AM - 05:00 PM",
      type: "Standard",
      days: "Mon - Fri",
      off: "Sat, Sun"
    };

    const formatTime = (timeStr: string) => {
      const [h, m] = timeStr.split(':');
      const date = new Date();
      date.setHours(parseInt(h), parseInt(m));
      return format(date, 'hh:mm a');
    };

    // Determine working days (simplified logic, assuming standard if not present)
    const workingDays = workConfig.working_days ? workConfig.working_days.join(', ') : "Mon - Fri";
    const offDays = workConfig.off_days ? workConfig.off_days.join(', ') : "Sat, Sun";

    return {
      time: `${formatTime(workConfig.fixed.start_time)} - ${formatTime(workConfig.fixed.end_time)}`,
      type: "Fixed Shift",
      days: workingDays,
      off: offDays
    };
  };

  const schedule = getWorkSchedule();

  return (
    <AppShell role={role}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <DashboardHeader title={getDashboardTitle()} />

        {role !== 'admin' && (
          <section className="grid gap-4 md:grid-cols-2 mb-6">
            {/* Today's Status */}
            <Card className="md:col-span-1">
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

            {/* Work Schedule */}
            <Card className="md:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-5 w-5" />
                  My Schedule
                </CardTitle>
                <CardDescription className="text-xs">
                  Your assigned working hours.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col justify-center h-full min-h-[140px] space-y-4">
                <div className="text-center space-y-1">
                  <p className="text-2xl font-bold text-slate-900 tracking-tight">
                    {schedule.time}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                      {schedule.type}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t pt-3">
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Working Days</p>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">{schedule.days}</p>
                  </div>
                  <div className="text-center border-l">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Weekly Off</p>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">{schedule.off}</p>
                  </div>
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
