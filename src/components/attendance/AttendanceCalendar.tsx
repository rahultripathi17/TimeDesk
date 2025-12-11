"use client";

import { JSX, useEffect, useState, useMemo } from "react";
import {
    addMonths,
    addDays,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    format,
    isSameMonth,
    isSameDay,
    startOfDay,
    isBefore,
    getDay,
    eachDayOfInterval,
    parseISO,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/utils/supabase/client";

// ------------ Types ------------

type AttendanceStatus =
    | "OFFICE" // Present
    | "REMOTE" // Remote / WFH
    | "ABSENT"
    | string; // Dynamic leave types

type AttendanceRecord = {
    date: string; // '2025-11-03'
    status: AttendanceStatus;
    color?: string; // Dynamic color
    label?: string; // Dynamic label
    session?: string;
};

type StatusStyle = {
    label: string;
    short: string;
    bg: string;
    text: string;
    border: string;
};

// ------------ Default Styles ------------

const defaultStyles: Record<string, StatusStyle> = {
    OFFICE: {
        label: "Present",
        short: "P",
        bg: "bg-emerald-100",
        text: "text-emerald-800",
        border: "border-emerald-300",
    },
    REMOTE: {
        label: "Remote / Work from Home",
        short: "R",
        bg: "bg-blue-100",
        text: "text-blue-800",
        border: "border-blue-300",
    },
    ABSENT: {
        label: "Absent",
        short: "A",
        bg: "bg-rose-100",
        text: "text-rose-800",
        border: "border-rose-300",
    },
    OFF: {
        label: "Weekly Off",
        short: "WO",
        bg: "bg-slate-50",
        text: "text-slate-400",
        border: "border-dashed border-slate-200",
    },
};

type LeaveType = {
    leave_type: string;
    color: string;
};

type WorkConfig = {
    mode: "fixed" | "flexible";
    fixed?: {
        start_time: string;
        end_time: string;
        work_days: number[];
    };
    flexible?: {
        daily_hours: number;
    };
};

export function AttendanceCalendar({ userId }: { userId?: string }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [workConfig, setWorkConfig] = useState<WorkConfig | null>(null);
    const [dateOfJoining, setDateOfJoining] = useState<Date | null>(null);
    const [loading, setLoading] = useState(true);

    // today (date-only)
    const today = startOfDay(new Date());

    const fetchLeaveTypes = async () => {
        try {
            const { data } = await supabase.from('department_leave_limits').select('leave_type, color');
            if (data) {
                // Deduplicate by leave_type
                const uniqueTypes = Array.from(new Map(data.map(item => [item.leave_type, item])).values());
                setLeaveTypes(uniqueTypes);
            }
        } catch (error) {
            console.error("Error fetching leave types:", error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            let targetUserId = userId;

            if (!targetUserId) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                targetUserId = user.id;
            }

            const monthStartStr = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
            const monthEndStr = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

            // 0. Fetch Work Config and Joining Date
            const { data: profileData } = await supabase
                .from('profiles')
                .select('work_config, created_at')
                .eq('id', targetUserId)
                .single();

            if (profileData) {
                if (profileData.work_config) {
                    setWorkConfig(profileData.work_config as WorkConfig);
                }
                // Use created_at as the "Joining Date" for attendance logic
                if (profileData.created_at) {
                    setDateOfJoining(parseISO(profileData.created_at));
                }
            }

            // 1. Fetch Attendance
            const { data: attendanceData } = await supabase
                .from('attendance')
                .select('date, status')
                .eq('user_id', targetUserId)
                .gte('date', monthStartStr)
                .lte('date', monthEndStr);

            // 2. Fetch Leaves (Approved)
            // We want leaves that overlap with the current month:
            // start_date <= monthEnd AND end_date >= monthStart
            const { data: leavesData } = await supabase
                .from('leaves')
                .select('start_date, end_date, type, status, session')
                .eq('user_id', targetUserId)
                .eq('status', 'approved')
                .lte('start_date', monthEndStr)
                .gte('end_date', monthStartStr);

            // Process records
            const processedRecords: AttendanceRecord[] = [];

            // Map attendance
            attendanceData?.forEach((att) => {
                let status = att.status.toUpperCase();
                if (status === 'AVAILABLE') status = 'OFFICE';

                // If status is LEAVE, we'll handle it with leavesData to get specific type
                if (status !== 'LEAVE') {
                    processedRecords.push({
                        date: att.date,
                        status: status
                    });
                }
            });

            // Map leaves (overwrite attendance if exists, or add new)
            leavesData?.forEach((leave) => {
                const leaveStart = parseISO(leave.start_date);
                const leaveEnd = parseISO(leave.end_date);

                // Iterate through each day of the leave
                for (let d = new Date(leaveStart); d <= leaveEnd; d.setDate(d.getDate() + 1)) {
                    const dateStr = format(d, 'yyyy-MM-dd');

                    // Only if within current month view
                    if (dateStr >= monthStartStr && dateStr <= monthEndStr) {
                        // Find leave type color (Case Insensitive Match)
                        const leaveTypeInfo = leaveTypes.find(lt =>
                            lt.leave_type.trim().toLowerCase() === leave.type.trim().toLowerCase()
                        );

                        // Remove existing record for this date if any (priority to leave details)
                        const existingIndex = processedRecords.findIndex(r => r.date === dateStr);
                        if (existingIndex !== -1) processedRecords.splice(existingIndex, 1);

                        processedRecords.push({
                            date: dateStr,
                            status: leave.type,
                            color: leaveTypeInfo?.color || '#f59e0b', // Fallback color (amber-500)
                            label: leave.type,
                            session: leave.session
                        });
                    }
                }
            });

            setRecords(processedRecords);

        } catch (error) {
            console.error("Error fetching calendar data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaveTypes();
    }, []);

    useEffect(() => {
        fetchData();
    }, [currentMonth, leaveTypes, userId]); // Re-fetch if leaveTypes changes (to apply colors)

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    // Helper to check if a day is a working day
    const isWorkingDay = (date: Date) => {
        if (!workConfig) return true; // Default to working if no config
        if (workConfig.mode === 'fixed' && workConfig.fixed?.work_days) {
            return workConfig.fixed.work_days.includes(getDay(date));
        }
        // For flexible, we assume all days are potential working days unless specified otherwise
        return true;
    };

    // Calculate stats
    const stats = useMemo(() => {
        let present = 0;
        let wfh = 0;
        let leave = 0;
        let absent = 0;
        let halfDays = 0;

        const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

        daysInMonth.forEach((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const rec = records.find(r => r.date === dateStr);

            // Check if before joining
            if (dateOfJoining && isBefore(day, startOfDay(dateOfJoining))) {
                return; // Skip stats for days before joining
            }

            if (rec) {
                if (rec.status === "OFFICE") present++;
                else if (rec.status === "REMOTE") wfh++;
                else if (rec.status === "ABSENT") absent++;
                else {
                    // Leave
                    if (rec.session && rec.session !== 'full_day') {
                        halfDays++;
                        leave += 0.5;
                    } else {
                        leave++;
                    }
                }
            } else {
                // Auto-ABSENT / OFF logic
                if (!isWorkingDay(day)) {
                    // We don't track off days in stats anymore
                } else if (isBefore(day, today)) {
                    absent++;
                }
            }
        });

        return { present, wfh, leave, absent, halfDays };
    }, [records, monthStart, monthEnd, today, workConfig, dateOfJoining]);

    const getStyle = (status: string, color?: string): StatusStyle | undefined => {
        if (defaultStyles[status]) return defaultStyles[status];

        // Dynamic leave style
        if (color) {
            return {
                label: status,
                short: status.substring(0, 2).toUpperCase(),
                bg: '', // We'll use inline style for dynamic colors
                text: 'text-white',
                border: ''
            };
        }
        return undefined;
    };

    const rows: JSX.Element[] = [];
    let day = gridStart;

    while (day <= gridEnd) {
        const days: JSX.Element[] = [];

        for (let i = 0; i < 7; i++) {
            const inMonth = isSameMonth(day, monthStart);
            const dateStr = format(day, 'yyyy-MM-dd');
            const rec = records.find(r => r.date === dateStr);

            const style = rec ? getStyle(rec.status, rec.color) : undefined;
            const isToday = isSameDay(day, today);

            // 🔸 Auto-ABSENT / OFF logic:
            let effectiveStyle = style;
            let isAbsent = false;
            let isBeforeJoining = false;

            if (dateOfJoining && isBefore(day, startOfDay(dateOfJoining))) {
                isBeforeJoining = true;
            }

            if (!style && inMonth && !isBeforeJoining) {
                if (!isWorkingDay(day)) {
                    effectiveStyle = defaultStyles.OFF;
                } else if (isBefore(day, today)) {
                    effectiveStyle = defaultStyles.ABSENT;
                    isAbsent = true;
                }
            }

            // Dynamic color handling
            const dynamicStyle = rec?.color ? {
                backgroundColor: rec.color,
                borderColor: rec.color,
                color: '#fff'
            } : {};

            // Half Day Logic
            let backgroundStyle = {};
            if (rec?.session && rec.session !== 'full_day') {
                const leaveColor = (rec.color || '#8b5cf6') + '20'; // 20% opacity
                const presentColor = '#d1fae5'; // emerald-100

                if (rec.session === 'first_half') {
                    // First Half Leave: Top = Leave, Bottom = Present
                    backgroundStyle = {
                        background: `linear-gradient(to bottom, ${leaveColor} 50%, ${presentColor} 50%)`,
                        borderColor: rec.color
                    };
                } else {
                    // Second Half Leave: Top = Present, Bottom = Leave
                    backgroundStyle = {
                        background: `linear-gradient(to bottom, ${presentColor} 50%, ${leaveColor} 50%)`,
                        borderColor: rec.color
                    };
                }
            } else if (rec?.color) {
                backgroundStyle = { backgroundColor: rec.color + '20', borderColor: rec.color };
            }

            days.push(
                <div
                    key={day.toISOString()}
                    className={cn(
                        "flex min-h-[60px] sm:min-h-[72px] lg:min-h-[82px] w-full flex-col border border-slate-100 p-1.5 sm:p-2 text-left text-[10px] sm:text-xs transition-colors",
                        !inMonth && "bg-slate-50/70 text-slate-300",
                        effectiveStyle && !rec?.color && !rec?.session && inMonth && `${effectiveStyle.bg} ${effectiveStyle.border}`,
                        !effectiveStyle && inMonth && "bg-white",
                        isToday && "ring-2 ring-slate-900 ring-offset-1 z-10"
                    )}
                    style={backgroundStyle}
                >
                    <div className="flex items-center justify-between">
                        <span
                            className={cn(
                                "inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[10px] sm:text-[11px] font-medium",
                                isToday
                                    ? "bg-slate-900 text-slate-50"
                                    : effectiveStyle
                                        ? "bg-white/70 text-slate-800"
                                        : "bg-slate-50 text-slate-600"
                            )}
                        >
                            {format(day, "d")}
                        </span>
                    </div>

                    {effectiveStyle && (
                        <div
                            className={cn(
                                "mt-1.5 line-clamp-2 leading-snug font-semibold",
                                !rec?.color && effectiveStyle.text
                            )}
                            style={rec?.color ? { color: rec.color } : {}}
                        >
                            {rec?.session && rec.session !== 'full_day' ? (
                                <span className="flex flex-col">
                                    <span>{rec.session === 'first_half' ? 'Leave' : 'Present'}</span>
                                    <span>{rec.session === 'first_half' ? 'Present' : 'Leave'}</span>
                                </span>
                            ) : (
                                rec?.label || effectiveStyle.label
                            )}
                        </div>
                    )}

                    {!effectiveStyle && inMonth && (
                        <div className="mt-1.5 text-[10px] text-slate-400">
                            {isBeforeJoining ? "Not Registered" : "-"}
                        </div>
                    )}
                </div>
            );

            day = addDays(day, 1);
        }

        rows.push(
            <div key={day.toISOString()} className="grid grid-cols-7">
                {days}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Present</p>
                        <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.present}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">WFH</p>
                        <p className="mt-1 text-2xl font-bold text-blue-600">{stats.wfh}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Leave</p>
                        <p className="mt-1 text-2xl font-bold text-orange-600">{stats.leave}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Half Day</p>
                        <p className="mt-1 text-2xl font-bold text-purple-600">{stats.halfDays}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Absent</p>
                        <p className="mt-1 text-2xl font-bold text-rose-600">{stats.absent}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="mx-auto w-full max-w-full overflow-hidden rounded-xl border bg-white shadow-sm">
                {/* header with prev/next month */}
                <div className="flex items-center justify-between border-b px-3 sm:px-4 py-2.5 sm:py-3">
                    <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900"
                        onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
                    >
                        <span aria-hidden>◀</span> Prev
                    </button>
                    <div className="text-sm font-semibold text-slate-900">
                        {format(currentMonth, "MMMM yyyy")}
                    </div>
                    <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900"
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    >
                        Next <span aria-hidden>▶</span>
                    </button>
                </div>

                {/* weekday header */}
                <div className="grid grid-cols-7 border-b bg-slate-50 text-center text-[10px] sm:text-[11px] font-medium text-slate-500">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                        <div key={d} className="px-1.5 py-1.5">
                            {d}
                        </div>
                    ))}
                </div>

                {/* days grid */}
                <div>{loading ? <div className="p-8 text-center text-slate-400">Loading...</div> : rows}</div>

                {/* legend */}
                <div className="flex flex-wrap gap-2 sm:gap-3 border-t px-3 sm:px-4 py-2.5 text-[10px] sm:text-[11px] text-slate-500">
                    <span className="font-medium">Legend:</span>
                    {Object.entries(defaultStyles).map(([key, val]) => (
                        <span key={key} className="inline-flex items-center gap-1">
                            <span
                                className={cn(
                                    "h-3 w-3 rounded-sm border",
                                    val.bg,
                                    val.border
                                )}
                            />
                            <span className="font-medium">{val.short}</span>
                            <span className="hidden sm:inline text-slate-400">
                                · {val.label}
                            </span>
                        </span>
                    ))}
                    {/* Dynamic Legend Items */}
                    {leaveTypes.map((lt) => (
                        <span key={lt.leave_type} className="inline-flex items-center gap-1">
                            <span
                                className="h-3 w-3 rounded-sm border"
                                style={{ backgroundColor: lt.color, borderColor: lt.color }}
                            />
                            <span className="font-medium">{lt.leave_type.substring(0, 2).toUpperCase()}</span>
                            <span className="hidden sm:inline text-slate-400">
                                · {lt.leave_type}
                            </span>
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
