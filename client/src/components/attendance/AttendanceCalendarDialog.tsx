"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/client";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface AttendanceCalendarDialogProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string | null;
    userName: string;
    userAvatar?: string | null;
}

type AttendanceRecord = {
    date: string;
    status: "available" | "remote" | "leave" | "absent";
    check_in: string | null;
    check_out: string | null;
};

export function AttendanceCalendarDialog({
    isOpen,
    onClose,
    userId,
    userName,
    userAvatar,
}: AttendanceCalendarDialogProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [leaveTypes, setLeaveTypes] = useState<{ leave_type: string; color: string }[]>([]);

    useEffect(() => {
        if (isOpen && userId) {
            fetchAttendance();
            fetchLeaveTypes();
        }
    }, [isOpen, userId, currentDate]);

    const fetchLeaveTypes = async () => {
        try {
            // Fetch all leave types to map colors
            const response = await fetch(`/api/admin/leaves/types`);
            if (response.ok) {
                const data = await response.json();
                setLeaveTypes(data);
            }
        } catch (error) {
            console.error("Error fetching leave types:", error);
        }
    };

    const fetchAttendance = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;

            // Calculate start and end of month
            const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;

            const { data, error } = await supabase
                .from('attendance')
                .select('date, status, check_in, check_out')
                .eq('user_id', userId)
                .gte('date', startDate)
                .lte('date', endDate);

            if (error) throw error;
            setRecords(data || []);
        } catch (error) {
            console.error("Error fetching attendance:", error);
        } finally {
            setLoading(false);
        }
    };

    const getDaysInMonth = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday

        const days = [];
        // Add empty slots for days before the first day of the month
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(null);
        }
        // Add actual days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const getStatusStyle = (status: string) => {
        const leaveType = leaveTypes.find(lt => lt.leave_type.toLowerCase() === status.toLowerCase());
        if (leaveType) {
            return { backgroundColor: leaveType.color, color: '#fff', borderColor: leaveType.color };
        }
        switch (status) {
            case "available": return { backgroundColor: '#dcfce7', color: '#15803d', borderColor: '#dcfce7' };
            case "remote": return { backgroundColor: '#dbeafe', color: '#1d4ed8', borderColor: '#dbeafe' };
            case "leave": return { backgroundColor: '#fef3c7', color: '#b45309', borderColor: '#fef3c7' };
            case "absent": return { backgroundColor: '#fee2e2', color: '#b91c1c', borderColor: '#fee2e2' };
            default: return { backgroundColor: '#f1f5f9', color: '#334155', borderColor: '#f1f5f9' };
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const days = getDaysInMonth();
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={userAvatar || ""} />
                            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                {getInitials(userName)}
                            </AvatarFallback>
                        </Avatar>
                        <span>{userName}'s Attendance</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-4">
                    <div className="flex items-center justify-between mb-4">
                        <Button variant="outline" size="icon" onClick={prevMonth}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <h3 className="font-semibold text-slate-900">
                            {currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                        </h3>
                        <Button variant="outline" size="icon" onClick={nextMonth}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {loading ? (
                        <div className="h-64 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-7 gap-1 text-center">
                            {weekDays.map(day => (
                                <div key={day} className="text-xs font-medium text-slate-500 py-2">
                                    {day}
                                </div>
                            ))}
                            {days.map((date, index) => {
                                if (!date) return <div key={`empty-${index}`} className="aspect-square" />;

                                const dateStr = date.toISOString().split('T')[0];
                                const record = records.find(r => r.date === dateStr);
                                const status = record?.status;
                                const style = status ? getStatusStyle(status) : undefined;
                                const isToday = new Date().toISOString().split('T')[0] === dateStr;

                                return (
                                    <div
                                        key={dateStr}
                                        className={`aspect-square flex items-center justify-center rounded-md text-sm relative group ${isToday ? 'ring-2 ring-slate-900 ring-offset-1' : ''}`}
                                    >
                                        <span className={`z-10 ${status ? 'text-white font-medium' : 'text-slate-700'}`}>
                                            {date.getDate()}
                                        </span>
                                        {status && (
                                            <div
                                                className="absolute inset-0 rounded-md"
                                                style={style}
                                            />
                                        )}

                                        {/* Tooltip */}
                                        {status && (
                                            <div className="absolute bottom-full mb-1 hidden group-hover:block z-20 w-max px-2 py-1 bg-slate-900 text-white text-[10px] rounded shadow-lg">
                                                <p className="capitalize font-semibold">{status}</p>
                                                {record.check_in && <p>In: {new Date(record.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
                                                {record.check_out && <p>Out: {new Date(record.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Legend */}
                    <div className="mt-6 flex flex-wrap gap-3 justify-center">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                            <span className="text-[10px] text-slate-600">Available</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                            <span className="text-[10px] text-slate-600">Remote</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                            <span className="text-[10px] text-slate-600">Leave</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                            <span className="text-[10px] text-slate-600">Absent</span>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
