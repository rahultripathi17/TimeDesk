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
}

export function TeamAttendanceList({ role }: TeamAttendanceListProps) {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentUser, setCurrentUser] = useState<any>(null);

    const router = useRouter();

    useEffect(() => {
        fetchCurrentUserAndTeam();
    }, []);

    const fetchCurrentUserAndTeam = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get Current User Profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (!profile) return;
            setCurrentUser(profile);

            // 2. Build Query based on Role
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
        `);

            // Apply Role-Based Filters
            if (role === 'employee') {
                // Employees see their department
                if (profile.department) {
                    query = query.eq('department', profile.department);
                }
            } else if (role === 'manager') {
                // Managers see their department OR people reporting to them
                if (profile.department) {
                    query = query.eq('department', profile.department);
                }
            }
            // Admin and HR see everyone (no filter added)

            const { data: teamData, error } = await query;

            if (error) throw error;

            // 3. Process Data (Add Today's Status)
            const today = format(new Date(), 'yyyy-MM-dd');

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
                    // Check for 'Half Day' type OR presence of session
                    if (activeLeave.type === 'Half Day' || activeLeave.session) {
                        const now = new Date();
                        const currentTimeStr = format(now, 'HH:mm');

                        let midpointTime = "13:00"; // Default fallback
                        let statusLabel = "";
                        let displayTime = "";

                        // Dynamic Calculation if work_config exists
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

                        // Attach custom label to user object for display
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

        } catch (error) {
            console.error("Error fetching team:", error);
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
            case "leave_first_half": return "bg-amber-100 text-amber-700"; // Available after 1:00 PM (Amber)
            case "leave_second_half": return "bg-amber-100 text-amber-700"; // On Half Day Leave (Amber)
            case "available_after_leave": return "bg-green-100 text-green-700"; // Available (Green)
            case "available_before_leave": return "bg-green-100 text-green-700"; // Available till 1:00 PM (Green)
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
            case "leave_first_half": return "Available after 1:00 PM"; // Fallback
            case "leave_second_half": return "On Half Day Leave";
            case "available_after_leave": return "Available";
            case "available_before_leave": return "Available till 1:00 PM"; // Fallback
            case "absent": return "Absent";
            default: return user.status;
        }
    };

    const filteredUsers = users.filter(user =>
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.designation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.department?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Search team members..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="text-sm text-slate-500">
                    Showing {filteredUsers.length} members
                </div>
            </div>

            <div className="rounded-md border">
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
                        ) : filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => (
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
        </div>
    );
}
