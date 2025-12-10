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
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [fetchedDate, setFetchedDate] = useState<string | null>(null);
  const [commonInfo, setCommonInfo] = useState<string | null>(null);
  const [role, setRole] = useState<"employee" | "manager" | "hr" | "admin">("employee");
  const [workConfig, setWorkConfig] = useState<any>(null);
  const [officeLocations, setOfficeLocations] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchUserRole();
    fetchTodayStatus();
    fetchCommonInfo();
    fetchOfficeLocations();

    const interval = setInterval(() => {
      fetchTodayStatus();
    }, 60000);

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (data) setRole(data.role);
  };

  const fetchCommonInfo = async () => {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'common_info').maybeSingle();
    if (data) setCommonInfo(data.value);
  };

  const fetchOfficeLocations = async () => {
    const { data } = await supabase.from('office_locations').select('*');
    if (data) setOfficeLocations(data);
  };

  const handleStatusSelect = (newStatus: "available" | "remote") => {
    setSelectedStatus(newStatus);
  };

  const confirmStatus = () => {
    if (selectedStatus) {
      handleCheckIn(selectedStatus);
    }
  };

  const fetchTodayStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const todayDate = format(new Date(), 'yyyy-MM-dd');
      setFetchedDate(todayDate);

      // 1. Fetch Work Config
      const { data: profile } = await supabase.from('profiles').select('work_config').eq('id', user.id).single();
      setWorkConfig(profile?.work_config);

      // 2. Check Leaves
      const { data: allLeaves } = await supabase
        .from('leaves')
        .select('type, session, status, created_at')
        .eq('user_id', user.id)
        .lte('start_date', todayDate)
        .gte('end_date', todayDate)
        .eq('status', 'approved');

      const leaveData = allLeaves?.[0]; // Simplified: take first approved leave

      if (leaveData) {
        // ... (Keep existing complex leave logic if needed, simplify for now to focus on Check-In)
         if (leaveData.type === 'Half Day' || leaveData.session) {
            // Re-implement if strictly needed, otherwise simplifying to 'leave' for this task scope
             if (leaveData.session === 'first_half') setStatus('leave_first_half');
             else if (leaveData.session === 'second_half') setStatus('leave_second_half');
             else setStatus('leave');
         } else {
             setStatus('leave');
         }
         setLastUpdated(format(new Date(), "h:mm a"));
         setLoading(false);
         return;
      }

      // 3. Check Attendance
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status, created_at, check_in, check_out')
        .eq('user_id', user.id)
        .eq('date', todayDate)
        .maybeSingle();

      if (attendanceData) {
        setStatus(attendanceData.status as any);
        setCheckInTime(attendanceData.check_in);
        setCheckOutTime(attendanceData.check_out);
        const date = new Date(attendanceData.created_at);
        setLastUpdated(isToday(date) ? format(date, "h:mm a") : format(date, "MMM d, h:mm a"));
      } else {
        setStatus(null);
        setCheckInTime(null);
        setCheckOutTime(null);
        setLastUpdated(null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- Geolocation Helpers ---
  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
      } else {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      }
    });
  };

  const getDistanceFromLatLonInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Radius of the earth in meters
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in meters
    return d;
  };

  // --- Actions ---

  const handleCheckIn = async (type: 'available' | 'remote') => {
    setActionLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      let locationSnapshot: any = {};

      if (type === 'available') {
        // Validate Office Location
        if (officeLocations.length === 0) {
            // Optional: fail if no offices defined? Or warn.
            // alert("No office locations defined by admin.");
        }

        const position = await getCurrentPosition();
        const { latitude, longitude } = position.coords;
        locationSnapshot.check_in = { latitude, longitude };

        let isValid = false;
        let minDistance = Infinity;

        // Check if inside any office radius
        for (const office of officeLocations) {
            const dist = getDistanceFromLatLonInMeters(latitude, longitude, office.latitude, office.longitude);
            if (dist <= office.radius) {
                isValid = true;
                locationSnapshot.check_in.office_id = office.id;
                locationSnapshot.check_in.office_name = office.name;
                break;
            }
            if (dist < minDistance) minDistance = dist;
        }

        if (!isValid && officeLocations.length > 0) {
            alert(`You are outside the office zone. (${Math.round(minDistance)}m away). Please go to the office to check in.`);
            setActionLoading(false);
            return;
        }
      } else {
          // Remote - still capture location if possible
          try {
            const position = await getCurrentPosition();
            locationSnapshot.check_in = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          } catch (e) {
            // Ignore loc error for remote
          }
      }

      // Perform DB Insert
      const todayDate = format(new Date(), 'yyyy-MM-dd');
      const now = new Date().toISOString();

      const { error } = await supabase.from('attendance').upsert({
          user_id: user.id,
          date: todayDate,
          status: type,
          check_in: now,
          location_snapshot: locationSnapshot,
          created_at: now
      }, { onConflict: 'user_id, date'});

      if (error) throw error;
      
      setStatus(type);
      setCheckInTime(now);
      setLastUpdated(format(new Date(), "h:mm a"));

    } catch (error: any) {
      alert("Check-In Failed: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not logged in");

        // Fetch current attendance to get snapshot
        const { data: currentRecord } = await supabase.from('attendance')
            .select('location_snapshot, check_in')
            .eq('user_id', user.id)
            .eq('date', format(new Date(), 'yyyy-MM-dd'))
            .single();

        let locationSnapshot = currentRecord?.location_snapshot || {};
        
        // Validate Location if WFO
        if (status === 'available') {
            const position = await getCurrentPosition();
            const { latitude, longitude } = position.coords;
            locationSnapshot.check_out = { latitude, longitude };

            let isValid = false;
            for (const office of officeLocations) {
                const dist = getDistanceFromLatLonInMeters(latitude, longitude, office.latitude, office.longitude);
                if (dist <= office.radius) {
                    isValid = true;
                    break;
                }
            }

            if (!isValid && officeLocations.length > 0) {
                alert("You must be at the office location to check out.");
                setActionLoading(false);
                return;
            }
        } else {
             // Remote check-out
             try {
                const position = await getCurrentPosition();
                locationSnapshot.check_out = { latitude: position.coords.latitude, longitude: position.coords.longitude };
              } catch (e) {
                // Ignore
              }
        }

        // Calculate Duration
        const now = new Date();
        const checkIn = new Date(currentRecord?.check_in || now); // Fallback to now to avoid huge negative numbers if DB error
        const durationMs = now.getTime() - checkIn.getTime();
        const durationMinutes = Math.floor(durationMs / 60000);

        // Get Min Hours (Default 9 hours = 540 mins)
        // Check work_config
        let minMinutes = 540;
        if (workConfig?.mode === 'flexible' && workConfig?.flexible?.daily_hours) {
             minMinutes = workConfig.flexible.daily_hours * 60;
        } else if (workConfig?.fixed?.start_time && workConfig?.fixed?.end_time) {
            // Simplified calc
             const [startH, startM] = workConfig.fixed.start_time.split(':').map(Number);
             const [endH, endM] = workConfig.fixed.end_time.split(':').map(Number);
             minMinutes = ((endH * 60) + endM) - ((startH * 60) + startM);
        }

        const deviation = durationMinutes - minMinutes;

        const { error } = await supabase.from('attendance').update({
            check_out: now.toISOString(),
            location_snapshot: locationSnapshot,
            duration_minutes: durationMinutes,
            deviation_minutes: deviation
        }).eq('user_id', user.id).eq('date', format(new Date(), 'yyyy-MM-dd'));

        if (error) throw error;

        setCheckOutTime(now.toISOString());
        // Show summary
        const h = Math.floor(durationMinutes / 60);
        const m = durationMinutes % 60;
        let msg = `You worked: ${h}h ${m}m. `;
        if (deviation < 0) msg += `Shortfall: ${Math.abs(Math.floor(deviation/60))}h ${Math.abs(deviation%60)}m.`;
        else msg += `Extra: ${Math.floor(deviation/60)}h ${deviation%60}m.`;
        
        alert("Checked Out! " + msg);

    } catch (error: any) {
        alert("Check-Out Failed: " + error.message);
    } finally {
        setActionLoading(false);
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

  // --- Helper to calculate min minutes based on config ---
  const calcMinMinutes = () => {
    if (workConfig?.mode === 'flexible' && workConfig?.flexible?.daily_hours) {
        return workConfig.flexible.daily_hours * 60;
    }
    if (workConfig?.fixed?.start_time && workConfig?.fixed?.end_time) {
         const [startH, startM] = workConfig.fixed.start_time.split(':').map(Number);
         const [endH, endM] = workConfig.fixed.end_time.split(':').map(Number);
         return ((endH * 60) + endM) - ((startH * 60) + startM);
    }
    return 540; // Default 9 hours
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

  const getWorkSchedule = () => {
    // Helper to format days [1,2,3] -> "Mon, Tue, Wed"
    const formatWorkingDays = (days: number[]) => {
        if (!days || days.length === 0) return "Mon - Fri";
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const sorted = [...days].sort();
        
        // Check for continuous range (e.g. 1,2,3,4,5)
        let isRange = true;
        for(let i=0; i<sorted.length-1; i++) {
            if (sorted[i+1] !== sorted[i] + 1) {
                isRange = false;
                break;
            }
        }

        if (isRange && sorted.length > 2) {
            return `${dayNames[sorted[0]]} - ${dayNames[sorted[sorted.length-1]]}`;
        }
        
        return sorted.map(d => dayNames[d]).join(', ');
    };

    const getOffDays = (workingDays: number[]) => {
        if (!workingDays) return "Sat, Sun";
        const allDays = [0, 1, 2, 3, 4, 5, 6];
        const off = allDays.filter(d => !workingDays.includes(d));
        return formatWorkingDays(off);
    };

    if (workConfig?.mode === 'flexible') {
        const hours = workConfig.flexible?.daily_hours || 5;
        // Default to Mon-Fri if work_days not present
        const daysArr = workConfig.flexible?.work_days || [1, 2, 3, 4, 5];
        return {
            time: `Flexible (${hours} hrs/day)`,
            type: "Flexible",
            days: formatWorkingDays(daysArr),
            off: getOffDays(daysArr)
        };
    }

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

    const daysArr = workConfig.fixed.work_days || [1, 2, 3, 4, 5];

    return {
      time: `${formatTime(workConfig.fixed.start_time)} - ${formatTime(workConfig.fixed.end_time)}`,
      days: formatWorkingDays(daysArr),
      off: getOffDays(daysArr)
    };
  };

  const schedule = getWorkSchedule();

  if(!status && loading) return <div className="p-8"><div className="animate-pulse h-4 w-32 bg-slate-200 rounded"></div></div>;

  return (
    <AppShell role={role}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <DashboardHeader title={getDashboardTitle()} />

        {role !== 'admin' && (
          <section className="grid gap-4 md:grid-cols-2 mb-6">
            <Card className="md:col-span-1 transition-all hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Home className="h-5 w-5" />
                  Today&apos;s Status
                </CardTitle>
                <CardDescription className="text-xs">
                  {status ? (checkOutTime ? "You have completed your work day." : "You are currently checked in.") : "Please check in to mark your attendance."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* STATUS INDICATOR */}
                {status && (
                    <div className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs ${currentStatus.bgColor} ${currentStatus.borderColor}`}>
                        <div>
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Current Status</p>
                            <p className={`mt-1 flex items-center gap-1.5 text-sm font-semibold ${currentStatus.color}`}>
                                <StatusIcon className="h-4 w-4" />
                                {currentStatus.label}
                            </p>
                        </div>
                        <div className="text-right">
                             {checkInTime && <p className="text-[11px] text-slate-500">In: {format(new Date(checkInTime), 'h:mm a')}</p>}
                             {checkOutTime && <p className="text-[11px] text-slate-500">Out: {format(new Date(checkOutTime), 'h:mm a')}</p>}
                        </div>
                    </div>
                )}

                {/* ACTION BUTTONS */}
                {!status ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <Button
                        variant={selectedStatus === "available" ? "default" : "outline"}
                        className={cn(
                          "justify-start transition-all",
                          selectedStatus === "available" ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600" : "hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                        )}
                        onClick={() => handleStatusSelect("available")}
                        disabled={loading || actionLoading}
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
                        disabled={loading || actionLoading}
                      >
                        <Globe className="mr-2 h-4 w-4" />
                        Remote
                      </Button>
                      <Button
                        variant="outline"
                        className="justify-start hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                        onClick={() => router.push("/leaves/apply")}
                        disabled={loading || actionLoading}
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
                          disabled={actionLoading}
                        >
                          {actionLoading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <CheckCircle2 className="h-4 w-4" />}
                          Confirm & Mark Attendance
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                    <div className="space-y-3">
                        {!checkOutTime && (status === 'available' || status === 'remote') && (
                            (() => {
                                if (!checkInTime) return null;
                                const checkInDate = new Date(checkInTime);
                                const now = new Date();
                                const diffMs = now.getTime() - checkInDate.getTime();
                                const diffHours = diffMs / (1000 * 60 * 60);

                                // Dynamic duration from config (default 9 hours for fixed, or flexible daily hours)
                                // We use calcMinMinutes() / 60 for hours
                                const minDuration = calcMinMinutes() / 60;

                                if (diffHours < minDuration) {
                                  // Calculate remaining time
                                  const remainingMs = (minDuration * 60 * 60 * 1000) - diffMs;
                                  const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
                                  const hours = Math.floor(remainingMinutes / 60);
                                  const mins = remainingMinutes % 60;

                                  return (
                                    <div className="rounded-lg bg-slate-100 p-3 text-center text-slate-500 text-sm">
                                        Check-out available in {hours > 0 ? `${hours}h ` : ""}{mins}m
                                    </div>
                                  );
                                }
                                
                                return (
                                    <Button 
                                        className="w-full bg-slate-900 text-white hover:bg-slate-800"
                                        onClick={handleCheckOut}
                                        disabled={actionLoading}
                                    >
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Check Out
                                    </Button>
                                );
                            })()
                        )}
                        {checkOutTime && (
                           <div className="rounded-lg bg-green-50 p-4 text-center text-green-800 text-sm border border-green-100">
                               <p className="font-semibold mb-1">Work Day Completed</p>
                               {(() => {
                                 const checkIn = new Date(checkInTime!);
                                 const checkOut = new Date(checkOutTime);
                                 const diffMs = checkOut.getTime() - checkIn.getTime();
                                 const durationMinutes = Math.floor(diffMs / 60000);
                                 
                                 const h = Math.floor(durationMinutes / 60);
                                 const m = durationMinutes % 60;
                                 
                                 const minMinutes = calcMinMinutes();
                                 
                                 const deviation = durationMinutes - minMinutes;
                                 let statusMsg = "";
                                 if (deviation < 0) {
                                     const dh = Math.abs(Math.floor(deviation/60));
                                     const dm = Math.abs(deviation%60);
                                     statusMsg = `Short by ${dh}h ${dm}m`;
                                 } else {
                                     const dh = Math.floor(deviation/60);
                                     const dm = deviation%60;
                                     statusMsg = `Overtime: ${dh}h ${dm}m`;
                                 }

                                 return (
                                     <div className="text-xs space-y-1 mt-2">
                                         <p>Worked: <span className="font-medium">{h}h {m}m</span></p>
                                         <p className={deviation < 0 ? "text-red-600 font-medium" : "text-green-700 font-medium"}>
                                             {statusMsg}
                                         </p>
                                     </div>
                                 );
                               })()}
                               <p className="text-xs text-green-600 mt-2">See you tomorrow!</p>
                           </div>
                        )}
                    </div>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-1 transition-all hover:shadow-md">
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
