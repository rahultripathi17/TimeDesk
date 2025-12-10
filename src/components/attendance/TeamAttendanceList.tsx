"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/client";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Search, CalendarDays, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface TeamAttendanceListProps {
    role: "admin" | "hr" | "manager" | "employee";
    departmentFilter?: string | null;
    headerAction?: React.ReactNode;
}

export function TeamAttendanceList({ role, departmentFilter: initialDepartmentFilter, headerAction }: TeamAttendanceListProps) {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const ITEMS_PER_PAGE = 10;
    
    const [departmentFilter, setDepartmentFilter] = useState<string | null>(initialDepartmentFilter || null);

    const router = useRouter();
    
    useEffect(() => {
        setDepartmentFilter(initialDepartmentFilter || null);
        setCurrentPage(1); 
    }, [initialDepartmentFilter]);

    useEffect(() => {
        fetchCurrentUserAndTeam();
    }, [departmentFilter, currentPage]);

    const fetchCurrentUserAndTeam = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get Current User Profile
            let userProfile = currentUser;
            if (!userProfile) {
                 const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                 if (profile) {
                     userProfile = profile;
                     setCurrentUser(profile);
                 }
            }

            // 2. Build Query
            let query = supabase
                .from('profiles')
                .select(`
                  *,
                  attendance (
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

            // Application Filters
             if (role === 'employee') {
                 if (userProfile?.department) query = query.eq('department', userProfile.department);
            } else if (role === 'manager') {
                 if (userProfile?.department) query = query.eq('department', userProfile.department);
            } else if (role === 'hr' || role === 'admin') {
                if (departmentFilter) query = query.eq('department', departmentFilter);
            }

            // Search Query (Client side filtering is tricky with server pagination for text search without Full Text Search on DB)
            // Ideally we use server side ilike for search too.
            if (searchQuery) {
                query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
            }

            // Pagination
            const from = (currentPage - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;
            query = query.range(from, to);

            const { data: teamData, error, count } = await query;

            if (error) throw error;
            setTotalCount(count || 0);

            // 3. Process Data checking logic...
            const today = format(new Date(), 'yyyy-MM-dd');
            // ... (keep existing processing logic)

            const processedUsers = teamData.map((u: any) => {
                 // Check Attendance
                const todayAttendance = u.attendance?.find((a: any) => a.date === today);
                let status = 'absent'; // Default

                // Check Leaves First (Priority)
                const activeLeave = u.leaves?.find((l: any) =>
                    l.status === 'approved' &&
                    l.start_date <= today &&
                    l.end_date >= today
                );

                if (activeLeave) {
                    if (activeLeave.type === 'Half Day' || activeLeave.session) {
                         const now = new Date();
                         const currentTimeStr = format(now, 'HH:mm');
                         
                         let midpointTime = "13:00"; 
                         let displayTime = "";
                         let statusLabel = "";

                         if (u.work_config?.fixed?.start_time && u.work_config?.fixed?.end_time) {
                             // ... existing logic for duration ...
                              const start = u.work_config.fixed.start_time;
                              const end = u.work_config.fixed.end_time;
                              const [startH, startM] = start.split(':').map(Number);
                              const [endH, endM] = end.split(':').map(Number);
                              const startDate = new Date(); startDate.setHours(startH, startM, 0, 0);
                              const endDate = new Date(); endDate.setHours(endH, endM, 0, 0);
                              const midpointDate = new Date((startDate.getTime() + endDate.getTime()) / 2);
                              midpointTime = format(midpointDate, 'HH:mm');
                              displayTime = format(midpointDate, 'hh:mm a');
                         }

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
                         } else {
                             status = 'leave';
                         }
                         u.statusLabel = statusLabel;
                    } else {
                        status = 'leave';
                    }
                } else if (todayAttendance) {
                    status = todayAttendance.status;
                }

                return {
                    ...u,
                    status,
                    initials: getInitials(u.full_name)
                };
            });

            setUsers(processedUsers);
        } catch (error: any) {
            console.error("Error fetching team data:", error.message || error);
        } finally {
            setLoading(false);
        }
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case "available": return "bg-green-100 text-green-700";
            case "remote": return "bg-blue-100 text-blue-700";
            case "leave": return "bg-amber-100 text-amber-700";
            case "leave_first_half": return "bg-amber-100 text-amber-700";
            case "leave_second_half": return "bg-amber-100 text-amber-700";
            case "available_after_leave": return "bg-green-100 text-green-700";
            case "available_before_leave": return "bg-green-100 text-green-700";
            case "absent": return "bg-red-100 text-red-700";
            default: return "bg-slate-100 text-slate-700";
        }
    };

    const getStatusLabel = (user: any) => {
        if (user.statusLabel) return user.statusLabel;

        switch (user.status) {
            case "available": return "Working from Office";
            case "remote": return "Working Remotely";
            case "leave": return "On Leave";
            case "leave_first_half": return "Available after 1:00 PM";
            case "leave_second_half": return "On Half Day Leave";
            case "available_after_leave": return "Available";
            case "available_before_leave": return "Available till 1:00 PM";
            case "absent": return "Absent";
            default: return user.status;
        }
    };

    // Filter Logic Removed (Done on Server), so filteredUsers is just users
    const filteredUsers = users; 
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    // Since we fetch only the page we need, paginatedUsers is just filteredUsers (which is 'users')
    const paginatedUsers = filteredUsers;

    const getDepartmentSummary = () => {
        if (role === 'employee' || role === 'manager') {
            return currentUser?.department ? `Department: ${currentUser.department}` : 'My Department';
        }
        return 'All Departments';
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Search team members..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto text-sm text-slate-500">
                    {headerAction ? (
                        <div className="w-full sm:w-auto">{headerAction}</div>
                    ) : (
                        <span className="font-medium text-slate-700 hidden sm:inline">
                            {departmentFilter ? `Department: ${departmentFilter}` : getDepartmentSummary()}
                        </span>
                    )}
                    <span className="whitespace-nowrap text-right sm:text-left">Total Members: {totalCount}</span>
                </div>
            </div>

            <div className="rounded-md border overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Member</TableHead>
                            <TableHead>Designation</TableHead>
                            <TableHead>Today's Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <div className="flex justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : paginatedUsers.length > 0 ? (
                            paginatedUsers.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={(user.avatar_url && user.avatar_url !== "NULL" && user.avatar_url !== "null") ? user.avatar_url : undefined} />
                                                <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                                    {user.initials}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium text-sm text-slate-900">{user.full_name}</div>
                                                <div className="text-xs text-slate-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-600">
                                        {user.designation || "-"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="secondary"
                                            className={cn("capitalize font-normal", getStatusColor(user.status))}
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
                                                <DropdownMenuItem onClick={() => router.push(`/attendance/${user.id}`)}>
                                                    <CalendarDays className="mr-2 h-4 w-4" />
                                                    View Attendance Calendar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                    No team members found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 py-4">
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
        </div>
    );
}
