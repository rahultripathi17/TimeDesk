"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MoreHorizontal, Users, UserCog, UserCheck, User } from "lucide-react";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/utils/supabase/client";
import { format } from "date-fns";

export default function UsersListPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [departmentsList, setDepartmentsList] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [stats, setStats] = useState({
        total: 0,
        managers: 0,
        employees: 0,
        hr: 0
    });
    const ITEMS_PER_PAGE = 10;

    // Action States
    const [viewUser, setViewUser] = useState<any | null>(null);
    const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchDepartments();
        fetchStats();
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [currentPage, searchQuery, departmentFilter]);

    const fetchStats = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role');

            if (error) throw error;

            if (data) {
                setStats({
                    total: data.length,
                    managers: data.filter(u => u.role === 'manager').length,
                    employees: data.filter(u => u.role === 'employee').length,
                    hr: data.filter(u => u.role === 'hr').length
                });
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchDepartments = async () => {
        try {
            const { data, error } = await supabase
                .from('department_leave_limits')
                .select('department');

            if (error) throw error;

            if (data) {
                // Extract unique departments
                const uniqueDepts = Array.from(new Set(data.map(item => item.department))).sort();
                setDepartmentsList(uniqueDepts);
            }
        } catch (err) {
            console.error("Error fetching departments:", err);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);

            let query = supabase
                .from('profiles')
                .select(`
                    *,
                    user_details (*),
                    attendance:attendance!attendance_user_id_fkey (
                        status,
                        date
                    ),
                    leaves!user_id (
                        status,
                        start_date,
                        end_date,
                        type,
                        session
                    )
                `, { count: 'exact' });

            // Apply filters
            if (searchQuery) {
                // Note: This is a simple OR search. For more complex search, we might need a different approach or RPC.
                // Supabase doesn't support OR across different columns easily with the JS client in one go without raw filters.
                // We'll use 'or' filter.
                query = query.or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`);
            }

            if (departmentFilter !== 'all') {
                query = query.eq('department', departmentFilter);
            }

            // Apply pagination
            const from = (currentPage - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            const { data, error, count } = await query
                .range(from, to)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Process data to include today's status
            const today = format(new Date(), 'yyyy-MM-dd');

            const processedUsers = data.map((user: any) => {
                // 1. Check Attendance
                const todayAttendance = user.attendance?.find((a: any) => a.date === today);

                let status = 'absent';
                let statusLabel = "";

                // 2. Check Leaves (Priority)
                const activeLeave = user.leaves?.find((l: any) =>
                    l.status === 'approved' &&
                    l.type !== 'Regularization' && // Regularization is not a leave
                    l.type !== 'Extra Working Day' && // Extra Working Day is not a leave
                    l.start_date <= today &&
                    l.end_date >= today
                );

                const extraWork = user.leaves?.find((l: any) =>
                    l.status === 'approved' &&
                    l.type === 'Extra Working Day' &&
                    l.start_date <= today &&
                    l.end_date >= today
                );

                const regularization = user.leaves?.find((l: any) =>
                    l.status === 'approved' &&
                    l.type === 'Regularization' &&
                    l.start_date <= today &&
                    l.end_date >= today
                );

                if (activeLeave) {
                    if (activeLeave.type === 'Half Day' || activeLeave.session) {
                        const now = new Date();
                        const currentTimeStr = format(now, 'HH:mm');

                        let midpointTime = "13:00"; // Default fallback
                        let displayTime = "";

                        // Dynamic Calculation if work_config exists
                        if (user.work_config?.fixed?.start_time && user.work_config?.fixed?.end_time) {
                            const start = user.work_config.fixed.start_time;
                            const end = user.work_config.fixed.end_time;

                            const [startH, startM] = start.split(':').map(Number);
                            const [endH, endM] = end.split(':').map(Number);

                            const startDate = new Date(); startDate.setHours(startH, startM, 0, 0);
                            const endDate = new Date(); endDate.setHours(endH, endM, 0, 0);

                            const midpointDate = new Date((startDate.getTime() + endDate.getTime()) / 2);
                            midpointTime = format(midpointDate, 'HH:mm');
                            displayTime = format(midpointDate, 'hh:mm a');
                        }

                        if (activeLeave.session === 'first_half') {
                            // Scenario B: First Half Leave (Late Start)
                            if (currentTimeStr < midpointTime) {
                                status = 'leave_first_half';
                                if (displayTime) statusLabel = `Available after ${displayTime}`;
                            } else {
                                status = 'available_after_leave';
                            }
                        } else if (activeLeave.session === 'second_half') {
                            // Scenario C: Second Half Leave (Early Exit)
                            if (currentTimeStr < midpointTime) {
                                status = 'available_before_leave';
                                if (displayTime) statusLabel = `Available till ${displayTime}`;
                            } else {
                                status = 'leave_second_half';
                            }
                        } else {
                            status = 'leave';
                        }
                    } else {
                        status = 'leave';
                    }
                } else if (extraWork) {
                    status = 'extra_work';
                } else if (regularization) {
                    status = 'regularization';
                } else if (todayAttendance) {
                    status = todayAttendance.status;
                }

                return {
                    ...user,
                    status: status,
                    statusLabel: statusLabel,
                    initials: getInitials(user.full_name),
                    details: user.user_details // Store details
                };
            });

            setUsers(processedUsers);
            if (count !== null) setTotalRecords(count);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (name: string) => {
        if (!name) return "U";
        const parts = name.trim().split(" ");
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const getManagerName = (id: string) => {
        const manager = users.find(u => u.id === id);
        return manager ? manager.full_name : "Unknown Manager";
    };

    const handleDeleteUser = async () => {
        if (!deleteUserId) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/admin/users?id=${deleteUserId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete user');
            }

            toast.success("User deleted successfully");
            setUsers(users.filter(u => u.id !== deleteUserId));
            setDeleteUserId(null);
        } catch (error: any) {
            console.error("Delete error:", error);
            toast.error(error.message);
        } finally {
            setIsDeleting(false);
        }
    };

    // Reset to first page when search/filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, departmentFilter]);

    const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);
    // const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    // const paginatedUsers = filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Compute stats
    // const totalUsers = users.length;
    // const managersCount = users.filter((u) => u.role === "manager").length;
    // const employeesCount = users.filter((u) => u.role === "employee").length;
    // const hrCount = users.filter((u) => u.role === "hr").length;

    const getStatusColor = (status: string) => {
        switch (status) {
            case "available":
            case "available_after_leave":
            case "available_before_leave":
            case "available":
            case "available_after_leave":
            case "available_before_leave":
                return "bg-green-100 text-green-700 hover:bg-green-100";
            case "extra_work":
                return "bg-purple-100 text-purple-700 hover:bg-purple-100";
            case "regularization":
                return "bg-blue-100 text-blue-700 hover:bg-blue-100";
            case "remote":
                return "bg-blue-100 text-blue-700 hover:bg-blue-100";
            case "leave":
            case "leave_first_half":
            case "leave_second_half":
                return "bg-amber-100 text-amber-700 hover:bg-amber-100";
            case "absent":
                return "bg-red-100 text-red-700 hover:bg-red-100";
            default:
                return "bg-slate-100 text-slate-700 hover:bg-slate-100";
        }
    };

    const getStatusLabel = (user: any) => {
        if (user.statusLabel) return user.statusLabel;

        switch (user.status) {
            case "available": return "Working from Office";
            case "remote": return "Working Remotely";
            case "leave": return "On Leave";
            case "leave_first_half": return "Available after 1:00 PM"; // Fallback
            case "leave_second_half": return "On Half Day Leave";
            case "extra_work": return "Extra Working Day";
            case "regularization": return "Regularized";
            case "available_after_leave": return "Available";
            case "available_before_leave": return "Available till 1:00 PM"; // Fallback
            case "absent": return "Absent";
            default: return user.status;
        }
    };

    return (
        <AppShell role="admin">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-lg font-semibold text-slate-900">Users & Roles</h1>
                        <p className="text-xs text-slate-500">
                            Manage all users, their roles, and permissions.
                        </p>
                    </div>
                    <Link href="/admin/users/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add New User
                        </Button>
                    </Link>
                </div>

                {/* Stats Cards */}
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-6">
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-2 bg-blue-50 rounded-full">
                                <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500">Total Users</p>
                                <h3 className="text-xl font-bold text-slate-900">{stats.total}</h3>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-2 bg-purple-50 rounded-full">
                                <UserCog className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500">Managers</p>
                                <h3 className="text-xl font-bold text-slate-900">{stats.managers}</h3>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-2 bg-green-50 rounded-full">
                                <User className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500">Employees</p>
                                <h3 className="text-xl font-bold text-slate-900">{stats.employees}</h3>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-2 bg-orange-50 rounded-full">
                                <UserCheck className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500">HR</p>
                                <h3 className="text-xl font-bold text-slate-900">{stats.hr}</h3>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 space-y-0 pb-4">
                        <CardTitle className="text-base font-medium">All Users</CardTitle>
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    placeholder="Search users..."
                                    className="pl-8 h-9 text-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                                <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
                                    <SelectValue placeholder="Filter by Department" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Departments</SelectItem>
                                    {departmentsList.map((dept) => (
                                        <SelectItem key={dept} value={dept}>
                                            {dept}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Designation</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Today's Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.length > 0 ? (
                                    users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarImage src={(user.avatar_url && user.avatar_url !== "NULL" && user.avatar_url !== "null") ? user.avatar_url : undefined} />
                                                        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                                            {user.initials}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="font-medium text-sm text-slate-900">{user.full_name}</div>
                                                        <div className="text-xs text-slate-500">{user.email || user.username}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-normal capitalize">
                                                    {user.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">{user.designation}</TableCell>
                                            <TableCell className="text-sm text-slate-600">{user.department}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="secondary"
                                                    className={cn("font-normal capitalize", getStatusColor(user.status))}
                                                >
                                                    {getStatusLabel(user)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => setViewUser(user)}>
                                                            View details
                                                        </DropdownMenuItem>
                                                        <Link href={`/admin/users/new?id=${user.id}`}>
                                                            <DropdownMenuItem>
                                                                Edit user
                                                            </DropdownMenuItem>
                                                        </Link>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-red-600 focus:text-red-600"
                                                            onClick={() => setDeleteUserId(user.id)}
                                                        >
                                                            Delete user
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            No users found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-end space-x-2 p-4 border-t">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <div className="text-sm text-slate-600">
                                Page {currentPage} of {totalPages}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </Card>
            </div>

            {/* View User Dialog */}
            <Dialog open={!!viewUser} onOpenChange={(open) => !open && setViewUser(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="border-b pb-4">
                        <DialogTitle>User Profile</DialogTitle>
                    </DialogHeader>
                    {viewUser && (
                        <div className="py-4 space-y-8">
                            {/* Header Section */}
                            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                                <Avatar className="h-24 w-24 border-4 border-white shadow-sm">
                                    <AvatarImage src={(viewUser.avatar_url && viewUser.avatar_url !== "NULL" && viewUser.avatar_url !== "null") ? viewUser.avatar_url : undefined} />
                                    <AvatarFallback className="text-3xl bg-blue-100 text-blue-700 font-semibold">
                                        {viewUser.initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="text-center md:text-left space-y-2 flex-1">
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-900">{viewUser.full_name}</h3>
                                        <p className="text-slate-500">{viewUser.email}</p>
                                    </div>
                                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                                        <Badge variant="secondary" className="px-3 py-1 text-sm font-medium capitalize">
                                            {viewUser.role}
                                        </Badge>
                                        <Badge variant="outline" className={cn("px-3 py-1 text-sm font-medium capitalize border-0", getStatusColor(viewUser.status))}>
                                            {getStatusLabel(viewUser)}
                                        </Badge>
                                        {viewUser.details?.gender && (
                                            <Badge variant="outline" className="px-3 py-1 text-sm font-normal text-slate-600">
                                                {viewUser.details.gender}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                {/* Professional Details */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-slate-900 font-semibold border-b pb-2">
                                        <Users className="h-4 w-4" />
                                        <h4>Professional Details</h4>
                                    </div>
                                    <div className="grid gap-3">
                                        {viewUser.designation && (
                                            <div className="grid grid-cols-3 gap-2 text-sm">
                                                <span className="text-slate-500">Designation</span>
                                                <span className="col-span-2 font-medium text-slate-900">{viewUser.designation}</span>
                                            </div>
                                        )}
                                        {viewUser.department && (
                                            <div className="grid grid-cols-3 gap-2 text-sm">
                                                <span className="text-slate-500">Department</span>
                                                <span className="col-span-2 font-medium text-slate-900">{viewUser.department}</span>
                                            </div>
                                        )}
                                        {viewUser.date_of_joining && (
                                            <div className="grid grid-cols-3 gap-2 text-sm">
                                                <span className="text-slate-500">Joined On</span>
                                                <span className="col-span-2 font-medium text-slate-900">{viewUser.date_of_joining}</span>
                                            </div>
                                        )}
                                        {viewUser.reporting_managers?.length > 0 && (
                                            <div className="grid grid-cols-3 gap-2 text-sm">
                                                <span className="text-slate-500">Manager(s)</span>
                                                <div className="col-span-2 flex flex-wrap gap-1">
                                                    {viewUser.reporting_managers.map((m: string) => (
                                                        <Badge key={m} variant="outline" className="text-xs font-normal bg-slate-50">
                                                            {getManagerName(m)}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Personal & Contact */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-slate-900 font-semibold border-b pb-2">
                                        <User className="h-4 w-4" />
                                        <h4>Personal & Contact</h4>
                                    </div>
                                    <div className="grid gap-3">
                                        {viewUser.details?.phone_number && (
                                            <div className="grid grid-cols-3 gap-2 text-sm">
                                                <span className="text-slate-500">Phone</span>
                                                <span className="col-span-2 font-medium text-slate-900">{viewUser.details.phone_number}</span>
                                            </div>
                                        )}
                                        {viewUser.details?.personal_email && (
                                            <div className="grid grid-cols-3 gap-2 text-sm">
                                                <span className="text-slate-500">Email (Personal)</span>
                                                <span className="col-span-2 font-medium text-slate-900 truncate" title={viewUser.details.personal_email}>
                                                    {viewUser.details.personal_email}
                                                </span>
                                            </div>
                                        )}
                                        {viewUser.details?.dob && (
                                            <div className="grid grid-cols-3 gap-2 text-sm">
                                                <span className="text-slate-500">Date of Birth</span>
                                                <span className="col-span-2 font-medium text-slate-900">{viewUser.details.dob}</span>
                                            </div>
                                        )}
                                        {([viewUser.details?.address, viewUser.details?.city, viewUser.details?.state, viewUser.details?.pincode].some(Boolean)) && (
                                            <div className="grid grid-cols-3 gap-2 text-sm">
                                                <span className="text-slate-500">Address</span>
                                                <span className="col-span-2 font-medium text-slate-900">
                                                    {[
                                                        viewUser.details?.address,
                                                        viewUser.details?.city,
                                                        viewUser.details?.state,
                                                        viewUser.details?.pincode
                                                    ].filter(Boolean).join(", ")}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Identity & Banking */}
                                {(viewUser.details?.pan_number || viewUser.details?.aadhaar_number || viewUser.details?.bank_name || viewUser.details?.account_number || viewUser.details?.ifsc_code) && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-slate-900 font-semibold border-b pb-2">
                                            <UserCheck className="h-4 w-4" />
                                            <h4>Identity & Banking</h4>
                                        </div>
                                        <div className="grid gap-3">
                                            {viewUser.details?.pan_number && (
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-slate-500">PAN Number</span>
                                                    <span className="col-span-2 font-medium text-slate-900 uppercase">{viewUser.details.pan_number}</span>
                                                </div>
                                            )}
                                            {viewUser.details?.aadhaar_number && (
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-slate-500">Aadhaar</span>
                                                    <span className="col-span-2 font-medium text-slate-900">{viewUser.details.aadhaar_number}</span>
                                                </div>
                                            )}
                                            {viewUser.details?.bank_name && (
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-slate-500">Bank Name</span>
                                                    <span className="col-span-2 font-medium text-slate-900">{viewUser.details.bank_name}</span>
                                                </div>
                                            )}
                                            {viewUser.details?.account_number && (
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-slate-500">Account No</span>
                                                    <span className="col-span-2 font-medium text-slate-900">{viewUser.details.account_number}</span>
                                                </div>
                                            )}
                                            {viewUser.details?.ifsc_code && (
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-slate-500">IFSC Code</span>
                                                    <span className="col-span-2 font-medium text-slate-900 uppercase">{viewUser.details.ifsc_code}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Account Info */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-slate-900 font-semibold border-b pb-2">
                                        <UserCog className="h-4 w-4" />
                                        <h4>Account Info</h4>
                                    </div>
                                    <div className="grid gap-3">
                                        <div className="grid grid-cols-3 gap-2 text-sm">
                                            <span className="text-slate-500">Username</span>
                                            <span className="col-span-2 font-medium text-slate-900">{viewUser.username}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-sm">
                                            <span className="text-slate-500">User ID</span>
                                            <span className="col-span-2 font-mono text-[10px] text-slate-400 break-all">
                                                {viewUser.id}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete User</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this user? This action cannot be undone and will remove all their data.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteUserId(null)} disabled={isDeleting}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteUser} disabled={isDeleting}>
                            {isDeleting ? "Deleting..." : "Delete User"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppShell>
    );
}
