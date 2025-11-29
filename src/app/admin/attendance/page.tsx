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
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/utils/supabase/client";

type AttendanceRecord = {
    id: string;
    date: string;
    status: string;
    check_in: string | null;
    check_out: string | null;
    profiles: {
        id: string;
        full_name: string;
        department: string;
        email: string;
        avatar_url: string | null;
        role: string;
        designation?: string;
        work_config?: any;
    };
};

type UserProfile = {
    id: string;
    full_name: string;
    email: string;
    department: string;
    role: string;
    designation?: string;
    work_config?: any;
    avatar_url: string | null;
    date_of_joining?: string;
    created_at?: string;
};

export default function MasterAttendancePage() {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]); // Store all users
    const [leaves, setLeaves] = useState<any[]>([]); // Store approved leaves
    const [loading, setLoading] = useState(false);
    const [hasSelectedFilters, setHasSelectedFilters] = useState(false);
    const [hasInitiatedFetch, setHasInitiatedFetch] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalUsers, setTotalUsers] = useState(0);

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
        const firstDay = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
        const lastDay = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');
        setStartDate(firstDay);
        setEndDate(lastDay);
    }, []);

    useEffect(() => {
        if (startDate && endDate) {
            fetchData();
        }
    }, [startDate, endDate, selectedDept, selectedRole, searchName, hasInitiatedFetch, page]);

    useEffect(() => {
        fetchLeaveTypes();
    }, [selectedDept]);

    const fetchDepartmentsAndRoles = async () => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('department, role');

            if (data) {
                const uniqueDepts = Array.from(new Set(data.map(d => d.department).filter(Boolean)))
                    .filter(d => d?.toLowerCase() !== 'admin')
                    .sort();
                const uniqueRoles = Array.from(new Set(data.map(d => d.role).filter(Boolean)))
                    .filter(r => r?.toLowerCase() !== 'admin')
                    .sort();
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

    const fetchData = async () => {
        // Lazy Fetching check
        if (selectedDept === "all" && selectedRole === "all" && !searchName && !hasInitiatedFetch) {
            setRecords([]);
            setUsers([]);
            setHasSelectedFilters(false);
            setLoading(false);
            return;
        }

        setHasSelectedFilters(true);
        setLoading(true);
        try {
            // 1. Fetch ALL matching User IDs first
            const allMatchingUserIds = await fetchAllMatchingUserIds();
            setTotalUsers(allMatchingUserIds.length);

            if (allMatchingUserIds.length === 0) {
                setUsers([]);
                setRecords([]);
                setLoading(false);
                return;
            }

            // 2. Fetch Attendance Metadata for sorting (Latest Activity)
            // We want to sort these IDs based on who has the most recent check_in
            const sortedUserIds = await sortUsersByLatestActivity(allMatchingUserIds);

            // 3. Paginate the IDs
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const paginatedUserIds = sortedUserIds.slice(startIndex, endIndex);

            // 4. Fetch User Details for the current page
            const pageUsers = await fetchUserDetails(paginatedUserIds);

            // Sort pageUsers to match the order of paginatedUserIds (which are sorted by activity)
            const sortedPageUsers = paginatedUserIds
                .map(id => pageUsers.find(u => u.id === id))
                .filter(u => u !== undefined) as UserProfile[];

            setUsers(sortedPageUsers);

            // 5. Fetch Full Attendance for these users
            if (sortedPageUsers.length > 0) {
                await Promise.all([
                    fetchAttendance(paginatedUserIds),
                    fetchLeaves()
                ]);
            } else {
                setRecords([]);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const fetchAllMatchingUserIds = async () => {
        let query = supabase
            .from('profiles')
            .select('id');

        if (selectedDept && selectedDept !== "all") {
            query = query.eq('department', selectedDept);
        }

        if (selectedRole && selectedRole !== "all") {
            query = query.eq('role', selectedRole);
        }

        if (searchName) {
            query = query.ilike('full_name', `%${searchName}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data.map(u => u.id);
    };

    const sortUsersByLatestActivity = async (userIds: string[]) => {
        // Fetch latest attendance for these users within the date range
        // We'll just fetch all attendance for these users in the range and find the max check_in client-side
        // Optimization: We could write a specific RPC or query, but for < 1000 users this is okay.
        // Actually, let's just fetch check_in times.

        const { data: attendanceData, error } = await supabase
            .from('attendance')
            .select('user_id, check_in, date')
            .in('user_id', userIds)
            .gte('date', startDate)
            .lte('date', endDate);

        if (error) throw error;

        // Create a map of UserId -> Latest CheckIn Timestamp
        const userLatestActivity = new Map<string, number>();

        attendanceData?.forEach(record => {
            if (record.check_in) {
                // Combine date and time for accurate sort
                const dateTimeStr = `${record.date}T${record.check_in}`;
                const timestamp = new Date(dateTimeStr).getTime();
                const currentMax = userLatestActivity.get(record.user_id) || 0;
                if (timestamp > currentMax) {
                    userLatestActivity.set(record.user_id, timestamp);
                }
            }
        });

        // Sort IDs: Users with recent activity first, then others
        return [...userIds].sort((a, b) => {
            const timeA = userLatestActivity.get(a) || 0;
            const timeB = userLatestActivity.get(b) || 0;
            return timeB - timeA; // Descending order
        });
    };

    const fetchUserDetails = async (userIds: string[]) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, email, department, role, designation, work_config, avatar_url, date_of_joining, created_at')
            .in('id', userIds);

        if (error) throw error;
        return data || [];
    };

    const fetchAttendance = async (userIds: string[]) => {
        try {
            const params = new URLSearchParams();
            if (startDate) params.append("startDate", startDate);
            if (endDate) params.append("endDate", endDate);

            // Filter by the specific users on this page
            if (userIds.length > 0) {
                params.append("userIds", userIds.join(","));
            }

            const response = await fetch(`/api/admin/attendance?${params.toString()}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to fetch attendance");
            }

            const data = await response.json();
            setRecords(data);
        } catch (error) {
            console.error("Error fetching attendance:", error);
            throw error;
        }
    };

    const fetchLeaves = async () => {
        try {
            // Fetch approved leaves overlapping with the date range
            let query = supabase
                .from('leaves')
                .select('*')
                .eq('status', 'approved');

            if (startDate) query = query.gte('end_date', startDate);
            if (endDate) query = query.lte('start_date', endDate);

            const { data, error } = await query;
            if (error) throw error;
            setLeaves(data || []);
        } catch (error) {
            console.error("Error fetching leaves:", error);
        }
    };


    const getEnhancedStatus = (record: AttendanceRecord) => {
        const { profiles: user, date, status: attendanceStatus } = record;
        const isToday = date === new Date().toISOString().split('T')[0];

        // Find active leave for this user and date
        const activeLeave = leaves.find(l =>
            l.user_id === user.id &&
            l.status === 'approved' &&
            l.start_date <= date &&
            l.end_date >= date
        );

        let status = attendanceStatus;
        let statusLabel = "";

        if (activeLeave) {
            if (activeLeave.type === 'Half Day' || activeLeave.session) {
                // Dynamic Calculation if work_config exists
                let midpointTime = "13:00"; // Default fallback
                let displayTime = "";

                if (user.work_config?.fixed?.start_time && user.work_config?.fixed?.end_time) {
                    const start = user.work_config.fixed.start_time;
                    const end = user.work_config.fixed.end_time;
                    const [startH, startM] = start.split(':').map(Number);
                    const [endH, endM] = end.split(':').map(Number);
                    const startDateObj = new Date(); startDateObj.setHours(startH, startM, 0, 0);
                    const endDateObj = new Date(); endDateObj.setHours(endH, endM, 0, 0);
                    const midpointDate = new Date((startDateObj.getTime() + endDateObj.getTime()) / 2);
                    midpointTime = format(midpointDate, 'HH:mm');
                    displayTime = format(midpointDate, 'hh:mm a');
                }

                if (isToday) {
                    const now = new Date();
                    const currentTimeStr = format(now, 'HH:mm');

                    if (activeLeave.session === 'first_half') {
                        if (currentTimeStr < midpointTime) {
                            status = 'leave_first_half';
                            if (displayTime) statusLabel = `Available after ${displayTime}`;
                        } else {
                            status = 'available_after_leave';
                        }
                    } else if (activeLeave.session === 'second_half') {
                        if (currentTimeStr < midpointTime) {
                            status = 'available_before_leave';
                            if (displayTime) statusLabel = `Available till ${displayTime}`;
                        } else {
                            status = 'leave_second_half';
                        }
                    }
                } else {
                    // Past dates
                    if (activeLeave.session === 'first_half') {
                        status = 'leave_first_half';
                        statusLabel = 'First Half Leave';
                    } else if (activeLeave.session === 'second_half') {
                        status = 'leave_second_half';
                        statusLabel = 'Second Half Leave';
                    }
                }
            } else {
                status = 'leave';
                statusLabel = 'On Leave';
            }
        }

        return { status, statusLabel };
    };

    const getStatusLabel = (status: string, label: string) => {
        if (label) return label;
        switch (status) {
            case "available": return "Present";
            case "remote": return "Remote";
            case "leave": return "On Leave";
            case "leave_first_half": return "First Half Leave";
            case "leave_second_half": return "Second Half Leave";
            case "available_after_leave": return "Available";
            case "available_before_leave": return "Available";
            case "absent": return "Absent";
            default: return status;
        }
    };

    const getStatusStyle = (status: string) => {
        // Check if it matches a dynamic leave type
        const leaveType = leaveTypes.find(lt => lt.leave_type.toLowerCase() === status.toLowerCase());
        if (leaveType) {
            return { backgroundColor: leaveType.color + "20", color: leaveType.color, borderColor: leaveType.color + "40" };
        }

        switch (status.toLowerCase()) {
            case "present":
            case "available":
            case "available_after_leave":
            case "available_before_leave":
                return { backgroundColor: "#dcfce7", color: "#15803d", borderColor: "#bbf7d0" }; // green-100
            case "remote":
                return { backgroundColor: "#dbeafe", color: "#1d4ed8", borderColor: "#bfdbfe" }; // blue-100
            case "leave":
            case "leave_first_half":
            case "leave_second_half":
                return { backgroundColor: "#fef3c7", color: "#b45309", borderColor: "#fde68a" }; // amber-100
            case "absent":
                return { backgroundColor: "#fee2e2", color: "#b91c1c", borderColor: "#fecaca" }; // red-100
            default:
                return { backgroundColor: "#f1f5f9", color: "#334155", borderColor: "#e2e8f0" }; // slate-100
        }
    };



    const formatTime = (dateString: string | null) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getInitials = (name: string) => {
        if (!name) return "U";
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

    // Helper to generate display records (combining users + attendance + absent logic)
    const generateDisplayRecords = () => {
        if (!startDate || !endDate || users.length === 0) return [];

        const displayRecords: any[] = [];

        // Determine the "Snapshot Date"
        // Use local date for "Today" to match user expectation and DB storage (usually local)
        const today = format(new Date(), 'yyyy-MM-dd');
        let targetDate = endDate;
        if (today >= startDate && today <= endDate) {
            targetDate = today;
        }

        // For each user on the current page, generate ONE record for the targetDate
        users.forEach(user => {
            // Check if there is an attendance record for the target date
            const record = records.find(r => r.date === targetDate && r.profiles.id === user.id);

            if (record) {
                displayRecords.push(record);
            } else {
                // Create an "Absent" placeholder record
                displayRecords.push({
                    id: `absent-${user.id}-${targetDate}`,
                    date: targetDate,
                    status: 'absent',
                    check_in: null,
                    check_out: null,
                    profiles: {
                        id: user.id,
                        full_name: user.full_name,
                        department: user.department,
                        email: user.email,
                        avatar_url: user.avatar_url,
                        role: user.role,
                        designation: user.designation,
                        work_config: user.work_config
                    }
                });
            }
        });

        return displayRecords;
    };

    const displayRecords = generateDisplayRecords();

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
                    <div className="flex items-center gap-2 self-start sm:self-auto">
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
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
                            <div className="space-y-2 col-span-2">
                                <div className="space-y-2 col-span-2">
                                    <label className="text-xs font-medium text-slate-500">
                                        {viewMode === 'list' ? 'Date' : 'Date Range'}
                                    </label>
                                    {viewMode === 'list' ? (
                                        <div className="relative">
                                            <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                            <Input
                                                type="date"
                                                value={endDate} // Use endDate as the primary date for list view
                                                onChange={(e) => {
                                                    const date = e.target.value;
                                                    setStartDate(date);
                                                    setEndDate(date);
                                                }}
                                                className="pl-9"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                            <div className="relative flex-1 w-full">
                                                <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                                <Input
                                                    type="date"
                                                    value={startDate}
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                    className="pl-9 w-full"
                                                />
                                            </div>
                                            <span className="text-slate-400 hidden sm:inline">-</span>
                                            <span className="text-slate-400 sm:hidden text-center">to</span>
                                            <div className="relative flex-1 w-full">
                                                <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                                <Input
                                                    type="date"
                                                    value={endDate}
                                                    onChange={(e) => setEndDate(e.target.value)}
                                                    className="pl-9 w-full"
                                                />
                                            </div>
                                        </div>
                                    )}
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

                {!hasSelectedFilters ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="bg-slate-50 p-4 rounded-full mb-4">
                                <Filter className="h-8 w-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 mb-1">No Filters Selected</h3>
                            <p className="text-slate-500 max-w-sm mb-6">
                                Please select a <strong>Department</strong> or <strong>Role</strong> above to view attendance records.
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setHasInitiatedFetch(true);
                                    // We need to trigger a fetch. Since state update is async, 
                                    // and fetchData depends on state, we can just set the state.
                                    // The useEffect hook for filters will catch it? 
                                    // No, hasInitiatedFetch is not in the dependency array of the main useEffect.
                                    // We should add it or call fetchData directly.
                                    // But fetchData uses current state values.
                                    // Let's just set the state and add it to the dependency array of the useEffect.
                                }}
                            >
                                View All Records
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader className="pb-0">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base">Attendance Records</CardTitle>
                                    <CardDescription>
                                        Showing {users.length} employees
                                    </CardDescription>
                                </div>
                                <Badge variant="secondary" className="ml-2">
                                    Total Employees: {totalUsers}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {viewMode === "list" ? (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Employee</TableHead>
                                                <TableHead>Designation</TableHead>
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
                                            ) : displayRecords.length > 0 ? (
                                                displayRecords.map((record) => (
                                                    <TableRow key={record.id}>
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
                                                            <span className="text-sm text-slate-600">
                                                                {record.profiles.designation || "-"}
                                                            </span>
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
                                                            {(() => {
                                                                const { status, statusLabel } = getEnhancedStatus(record);
                                                                return (
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="capitalize font-normal"
                                                                        style={getStatusStyle(status)}
                                                                    >
                                                                        {getStatusLabel(status, statusLabel)}
                                                                    </Badge>
                                                                );
                                                            })()}
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
                                </div>
                            ) : (
                                <div className="overflow-x-auto pb-4">
                                    {/* Calendar Grid View */}
                                    <div className="min-w-full w-max">
                                        <div className="grid grid-cols-[200px_1fr] border-b border-slate-200">
                                            <div className="sticky left-0 z-20 bg-white p-4 font-medium text-slate-500 text-sm border-r border-slate-200 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">Employee</div>
                                            <div className="flex">
                                                {calendarDays.map(day => (
                                                    <div key={day.toISOString()} className="flex-1 min-w-[40px] p-2 text-center text-xs text-slate-500 border-l border-slate-100">
                                                        <div className="font-medium">{day.getDate()}</div>
                                                        <div className="text-[10px]">{day.toLocaleDateString(undefined, { weekday: 'narrow' })}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Group records by user - NOW ITERATE OVER USERS */}
                                        {users.map(user => {
                                            // Find records for this user
                                            const userRecords = records.filter(r => r.profiles.email === user.email);

                                            return (
                                                <div key={user.id} className="grid grid-cols-[200px_1fr] border-b border-slate-100 hover:bg-slate-50">
                                                    <div className="sticky left-0 z-10 bg-white p-3 flex items-center gap-3 border-r border-slate-200 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={user.avatar_url || ""} />
                                                            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                                                {getInitials(user.full_name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="overflow-hidden">
                                                            <p className="text-sm font-medium text-slate-900 truncate">{user.full_name}</p>
                                                            <p className="text-xs text-slate-500 truncate">{user.department}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex">
                                                        {calendarDays.map(day => {
                                                            const dateStr = format(day, 'yyyy-MM-dd');
                                                            const record = userRecords.find(r => r.date === dateStr);
                                                            let status = record?.status;

                                                            // Logic for Absent
                                                            if (!status) {
                                                                const todayStr = format(new Date(), 'yyyy-MM-dd');
                                                                const joiningDate = user.date_of_joining || user.created_at?.split('T')[0];

                                                                // If date is in the past (or today) AND after joining date
                                                                if (dateStr <= todayStr && (!joiningDate || dateStr >= joiningDate)) {
                                                                    // Check if it's a weekend (optional, but good practice - assuming Sat/Sun off for now or just show absent)
                                                                    // For now, strict "Absent" as requested
                                                                    status = 'absent';
                                                                }
                                                            }

                                                            const style = status ? getStatusStyle(status) : undefined;

                                                            return (
                                                                <div key={dateStr} className="flex-1 min-w-[40px] border-l border-slate-100 p-1 flex items-center justify-center">
                                                                    {status && (
                                                                        <div
                                                                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm"
                                                                            style={style}
                                                                            title={`${status}${record?.check_in ? ` - ${formatTime(record.check_in)}` : ''}`}
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

                                        {users.length === 0 && (
                                            <div className="p-8 text-center text-slate-500">
                                                No employees found.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Pagination Controls */}
                            <div className="flex items-center justify-between px-2 py-4 border-t mt-4">
                                <div className="text-sm text-slate-500">
                                    Page {page} of {Math.ceil(totalUsers / pageSize)}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1 || loading}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={page * pageSize >= totalUsers || loading}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppShell >
    );
}
