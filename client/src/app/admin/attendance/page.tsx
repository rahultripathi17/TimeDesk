"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Filter, Download, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { supabase } from "@/utils/supabase/client";

type AttendanceRecord = {
    id: string;
    date: string;
    status: "available" | "remote" | "leave" | "absent";
    check_in: string | null;
    check_out: string | null;
    profiles: {
        full_name: string;
        department: string;
        email: string;
        avatar_url: string | null;
        role: string;
    };
};

export default function MasterAttendancePage() {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [departments, setDepartments] = useState<string[]>([]);
    const [roles, setRoles] = useState<string[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<{ leave_type: string, color: string }[]>([]);

    // Filters
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedDept, setSelectedDept] = useState("all");
    const [selectedRole, setSelectedRole] = useState("all");
    const [searchName, setSearchName] = useState("");

    // View Mode
    const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

    useEffect(() => {
        fetchDepartmentsAndRoles();
        // Set default date range to current month
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        setStartDate(firstDay);
        setEndDate(lastDay);
    }, []);

    useEffect(() => {
        if (startDate && endDate) {
            fetchAttendance();
        }
    }, [startDate, endDate, selectedDept, selectedRole, searchName]);

    useEffect(() => {
        fetchLeaveTypes();
    }, [selectedDept]);

    const fetchDepartmentsAndRoles = async () => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('department, role');

            if (data) {
                const uniqueDepts = Array.from(new Set(data.map(d => d.department).filter(Boolean))).sort();
                const uniqueRoles = Array.from(new Set(data.map(d => d.role).filter(Boolean))).sort();
                setDepartments(uniqueDepts as string[]);
                setRoles(uniqueRoles as string[]);
            }
        } catch (error) {
            console.error("Error fetching metadata:", error);
        }
    };

    const fetchLeaveTypes = async () => {
        try {
            const response = await fetch(`/api/admin/leaves/types?department=${selectedDept}`);
            if (response.ok) {
                const data = await response.json();
                setLeaveTypes(data);
            }
        } catch (error) {
            console.error("Error fetching leave types:", error);
        }
    };

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (startDate) params.append("startDate", startDate);
            if (endDate) params.append("endDate", endDate);
            if (selectedDept && selectedDept !== "all") params.append("department", selectedDept);
            // Note: API might need update to handle 'role' if not already supported, 
            // but we can filter client-side if needed for now, or assume API handles it.
            // Let's add it to params and assume we'll update API if needed.
            if (selectedRole && selectedRole !== "all") params.append("role", selectedRole);
            if (searchName) params.append("name", searchName);

            const response = await fetch(`/api/admin/attendance?${params.toString()}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to fetch attendance");
            }

            const data = await response.json();

            // Client-side role filter if API doesn't support it yet (safety net)
            let filteredData = data;
            if (selectedRole && selectedRole !== "all") {
                filteredData = data.filter((r: any) => r.profiles.role === selectedRole);
            }

            setRecords(filteredData);
        } catch (error) {
            console.error("Error:", error);
            toast.error("Failed to load attendance records");
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        // Check if it matches a dynamic leave type
        const leaveType = leaveTypes.find(lt => lt.leave_type.toLowerCase() === status.toLowerCase());
        if (leaveType) {
            return { backgroundColor: leaveType.color, color: '#fff' }; // Use dynamic color
        }

        switch (status) {
            case "available":
                return "bg-green-100 text-green-700 hover:bg-green-100";
            case "remote":
                return "bg-blue-100 text-blue-700 hover:bg-blue-100";
            case "leave":
                return "bg-amber-100 text-amber-700 hover:bg-amber-100";
            case "absent":
                return "bg-red-100 text-red-700 hover:bg-red-100";
            default:
                return "bg-slate-100 text-slate-700 hover:bg-slate-100";
        }
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

    const formatTime = (dateString: string | null) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    // Calendar View Helper
    const getCalendarDays = () => {
        if (!startDate || !endDate) return [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            days.push(new Date(d));
        }
        return days;
    };

    const calendarDays = getCalendarDays();

    return (
        <AppShell role="admin">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Master Attendance</h1>
                        <p className="text-sm text-slate-500">
                            View and monitor attendance across the organization.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => setViewMode("list")}
                                className={cn(
                                    "px-3 py-1 text-sm font-medium rounded-md transition-all",
                                    viewMode === "list" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                List
                            </button>
                            <button
                                onClick={() => setViewMode("calendar")}
                                className={cn(
                                    "px-3 py-1 text-sm font-medium rounded-md transition-all",
                                    viewMode === "calendar" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                Calendar
                            </button>
                        </div>
                    </div>
                </div>

                <Card className="mb-6">
                    <CardContent className="pt-6">
                        <div className="grid gap-4 md:grid-cols-5">
                            <div className="space-y-2 col-span-2">
                                <label className="text-xs font-medium text-slate-500">Date Range</label>
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                        <Input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                    <span className="text-slate-400">-</span>
                                    <div className="relative flex-1">
                                        <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                        <Input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500">Department</label>
                                <Select value={selectedDept} onValueChange={setSelectedDept}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Departments" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Departments</SelectItem>
                                        {departments.map((dept) => (
                                            <SelectItem key={dept} value={dept}>
                                                {dept}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500">Role</label>
                                <Select value={selectedRole} onValueChange={setSelectedRole}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Roles" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Roles</SelectItem>
                                        {roles.map((role) => (
                                            <SelectItem key={role} value={role}>
                                                {role.charAt(0).toUpperCase() + role.slice(1)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500">Search</label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                    <Input
                                        placeholder="Name..."
                                        value={searchName}
                                        onChange={(e) => setSearchName(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Dynamic Legend */}
                        <div className="mt-6 flex flex-wrap gap-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-green-100 border border-green-200"></span>
                                <span className="text-xs text-slate-600">Available</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-blue-100 border border-blue-200"></span>
                                <span className="text-xs text-slate-600">Remote</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-red-100 border border-red-200"></span>
                                <span className="text-xs text-slate-600">Absent</span>
                            </div>
                            {leaveTypes.map((type) => (
                                <div key={type.leave_type} className="flex items-center gap-2">
                                    <span
                                        className="w-3 h-3 rounded-full border"
                                        style={{ backgroundColor: type.color, borderColor: type.color }}
                                    ></span>
                                    <span className="text-xs text-slate-600">{type.leave_type}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-0">
                        <CardTitle className="text-base">Attendance Records</CardTitle>
                        <CardDescription>
                            Showing {records.length} records
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {viewMode === "list" ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Check In</TableHead>
                                        <TableHead>Check Out</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center">
                                                <div className="flex justify-center">
                                                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : records.length > 0 ? (
                                        records.map((record) => (
                                            <TableRow key={record.id}>
                                                <TableCell className="font-medium">
                                                    {new Date(record.date).toLocaleDateString(undefined, {
                                                        weekday: 'short',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={record.profiles.avatar_url || ""} />
                                                            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                                                {getInitials(record.profiles.full_name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-900">
                                                                {record.profiles.full_name}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                {record.profiles.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-normal">
                                                        {record.profiles.department || "N/A"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs text-slate-500 capitalize">
                                                        {record.profiles.role || "-"}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="secondary"
                                                        className="capitalize font-normal"
                                                        style={getStatusStyle(record.status)}
                                                    >
                                                        {record.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-slate-500 text-sm">
                                                    {formatTime(record.check_in)}
                                                </TableCell>
                                                <TableCell className="text-slate-500 text-sm">
                                                    {formatTime(record.check_out)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                                No attendance records found for the selected filters.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="overflow-x-auto pb-4">
                                {/* Calendar Grid View */}
                                <div className="min-w-[800px]">
                                    <div className="grid grid-cols-[200px_1fr] border-b border-slate-200">
                                        <div className="p-4 font-medium text-slate-500 text-sm">Employee</div>
                                        <div className="flex">
                                            {calendarDays.map(day => (
                                                <div key={day.toISOString()} className="flex-1 min-w-[40px] p-2 text-center text-xs text-slate-500 border-l border-slate-100">
                                                    <div className="font-medium">{day.getDate()}</div>
                                                    <div className="text-[10px]">{day.toLocaleDateString(undefined, { weekday: 'narrow' })}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Group records by user */}
                                    {Array.from(new Set(records.map(r => r.profiles.email))).map(email => {
                                        const userRecords = records.filter(r => r.profiles.email === email);
                                        const userProfile = userRecords[0]?.profiles;
                                        if (!userProfile) return null;

                                        return (
                                            <div key={email} className="grid grid-cols-[200px_1fr] border-b border-slate-100 hover:bg-slate-50">
                                                <div className="p-3 flex items-center gap-3 border-r border-slate-100">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={userProfile.avatar_url || ""} />
                                                        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                                            {getInitials(userProfile.full_name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="overflow-hidden">
                                                        <p className="text-sm font-medium text-slate-900 truncate">{userProfile.full_name}</p>
                                                        <p className="text-xs text-slate-500 truncate">{userProfile.department}</p>
                                                    </div>
                                                </div>
                                                <div className="flex">
                                                    {calendarDays.map(day => {
                                                        const dateStr = day.toISOString().split('T')[0];
                                                        const record = userRecords.find(r => r.date === dateStr);
                                                        const status = record?.status;
                                                        const style = status ? getStatusStyle(status) : undefined;

                                                        return (
                                                            <div key={dateStr} className="flex-1 min-w-[40px] border-l border-slate-100 p-1 flex items-center justify-center">
                                                                {status && (
                                                                    <div
                                                                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm"
                                                                        style={style}
                                                                        title={`${status} - ${formatTime(record.check_in)}`}
                                                                    >
                                                                        {status.charAt(0).toUpperCase()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {records.length === 0 && (
                                        <div className="p-8 text-center text-slate-500">
                                            No records found.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    );
}
