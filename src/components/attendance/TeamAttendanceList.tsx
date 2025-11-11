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
    requireFilterSelection?: boolean;
    onViewAll?: () => void;
}

export function TeamAttendanceList({ role, departmentFilter: initialDepartmentFilter, headerAction, requireFilterSelection, onViewAll }: TeamAttendanceListProps) {
    const [users, setUsers] = useState<any[]>([]);
    // ... existing state ...
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const ITEMS_PER_PAGE = 10;
    
    const [departmentFilter, setDepartmentFilter] = useState<string | null>(initialDepartmentFilter || null);
    
    // ... useEffects and fetch logic (unchanged) ...
    const router = useRouter();

    useEffect(() => {
        setDepartmentFilter(initialDepartmentFilter || null);
        setCurrentPage(1); 
    }, [initialDepartmentFilter]);

    useEffect(() => {
        if (requireFilterSelection && !departmentFilter) {
            setUsers([]);
            setTotalCount(0);
            return;
        }
        fetchCurrentUserAndTeam();
    }, [departmentFilter, currentPage, requireFilterSelection]);

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

            // Application Filters
             if (role === 'employee') {
                 if (userProfile?.department) query = query.eq('department', userProfile.department);
            } else if (role === 'manager') {
                 if (userProfile?.department) query = query.eq('department', userProfile.department);
            } else if (role === 'hr' || role === 'admin') {
                if (departmentFilter && departmentFilter !== 'all') {
                    query = query.eq('department', departmentFilter);
                }
            }

            // Search Query
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

            // 3. Process Data
            const today = format(new Date(), 'yyyy-MM-dd');
            
            const processedUsers = teamData.map((u: any) => {
                 // Check Attendance
                const todayAttendance = u.attendance?.find((a: any) => a.date === today);
                let status = 'absent'; // Default

                // Check Leaves First (Priority)
                const activeLeave = u.leaves?.find((l: any) =>
                    l.status === 'approved' &&
                    l.type !== 'Regularization' && // Regularization is not a leave
                    l.type !== 'Extra Working Day' && // Extra Working Day is not a leave
                    l.start_date <= today &&
                    l.end_date >= today
                );

                // Check Extra Working Day
                const extraWork = u.leaves?.find((l: any) =>
                    l.status === 'approved' &&
                    l.type === 'Extra Working Day' &&
                    l.start_date <= today &&
                    l.end_date >= today
                );

                // Check Regularization
                const regularization = u.leaves?.find((l: any) =>
                    l.status === 'approved' &&
                    l.type === 'Regularization' &&
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
                } else if (extraWork) {
                    status = 'extra_work';
                } else if (regularization) {
                    status = 'regularization';
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

    // ... helpers unchanged ...
    const getInitials = (name: string) => {
        if (!name) return "U";
        return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
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
            case "extra_work": return "bg-purple-100 text-purple-700";
            case "regularization": return "bg-blue-100 text-blue-700";
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
            case "extra_work": return "Extra Working Day";
            case "regularization": return "Regularized";
            case "absent": return "Absent";
            default: return user.status;
        }
    };

    const filteredUsers = users; 
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    const paginatedUsers = filteredUsers;

    const getDepartmentSummary = () => {
        if (role === 'employee' || role === 'manager') {
            return currentUser?.department ? `Department: ${currentUser.department}` : 'My Department';
        }
        return 'All Departments';
    };

    // Import Filter icon at top (assuming I'll add it to the imports via a separate replacement later or assume it's there? Need to ensure it's imported.)
    // Wait, I can't add imports with this tool easily in one go if I don't replace the whole file.
    // I will replace the return block mostly.
    
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
                        disabled={requireFilterSelection && !departmentFilter}
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

            {/* Placeholder if Selection Required but Missing */}
            {requireFilterSelection && !departmentFilter ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 mb-4">
                        {/* Using Search for now, but should use Filter if imported. I'll stick to Search as placeholder in this massive replace or try to import Filter if I can't. 
                           Actually, I can use the existing 'Search' icon or 'MoreHorizontal' if needed, but 'ListFilter' or 'Filter' is better. 
                           Let's check imports. 'Search' is imported. 'Loader2' is imported. 
                           I'll use 'Search' for now to be safe, then swapping to Filter in next step.
                        */}
                         <Search className="h-8 w-8 text-slate-400" /> 
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No Filters Selected</h3>
                    <p className="mt-2 text-sm text-slate-500 max-w-sm">
                        Please select a Department or Role above to view attendance records.
                    </p>
                    {onViewAll && (
                        <Button variant="outline" className="mt-6" onClick={onViewAll}>
                            View All Records
                        </Button>
                    )}
                </div>
            ) : (
                <>
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
                </>
            )}
        </div>
    );
}
