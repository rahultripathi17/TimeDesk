"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bell, CheckCircle2, XCircle, Clock, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Notification = {
    id: string;
    type: 'leave_request' | 'leave_status';
    title: string;
    description: string;
    date: string;
    status?: 'pending' | 'approved' | 'rejected';
    link: string;
};

export function DashboardNotifications({ role, userId }: { role: string; userId: string }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                setLoading(true);
                let newNotifications: Notification[] = [];

                // 1. For Approvers (Manager, HR, Admin): Fetch Pending Requests
                if (['manager', 'hr', 'admin'].includes(role)) {
                    let query = supabase
                        .from('leaves')
                        .select('id, type, start_date, end_date, created_at, profiles!user_id(full_name)')
                        .eq('status', 'pending')
                        .order('created_at', { ascending: false })
                        .limit(5);

                    // Managers only see requests assigned to them (or their dept - simplified here to assigned)
                    if (role === 'manager') {
                        query = query.eq('approver_id', userId);
                    }

                    const { data: pendingLeaves } = await query;

                    if (pendingLeaves) {
                        const pendingNotifs = pendingLeaves.map((leave: any) => ({
                            id: leave.id,
                            type: 'leave_request' as const,
                            title: "New Leave Request",
                            description: `${leave.profiles?.full_name} applied for ${leave.type}`,
                            date: leave.created_at,
                            status: 'pending' as const,
                            link: '/admin/leaves' // Redirect to admin/leaves for approval
                        }));
                        newNotifications = [...newNotifications, ...pendingNotifs];
                    }
                }

                // 2. For Employees (Everyone): Fetch Recent Status Updates
                const { data: myLeaves } = await supabase
                    .from('leaves')
                    .select('id, type, status, updated_at')
                    .eq('user_id', userId)
                    .neq('status', 'pending') // Only approved/rejected
                    .order('updated_at', { ascending: false })
                    .limit(5);

                if (myLeaves) {
                    const statusNotifs = myLeaves.map((leave: any) => ({
                        id: leave.id,
                        type: 'leave_status' as const,
                        title: "Leave Status Updated",
                        description: `Your ${leave.type} request was ${leave.status}`,
                        date: leave.updated_at,
                        status: leave.status as 'approved' | 'rejected',
                        link: '/leaves' // Redirect to leaves history
                    }));
                    newNotifications = [...newNotifications, ...statusNotifs];
                }

                // Sort by date (newest first)
                newNotifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                setNotifications(newNotifications);
            } catch (error) {
                console.error("Error fetching notifications:", error);
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchNotifications();
        }
    }, [role, userId]);

    if (notifications.length === 0 && !loading) return null;

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Bell className="h-5 w-5 text-indigo-600" />
                    Notifications
                </CardTitle>
                <CardDescription className="text-xs">
                    Recent updates and tasks.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading ? (
                    <div className="text-xs text-slate-500">Loading...</div>
                ) : (
                    <div className="space-y-3">
                        {notifications.map((notif) => (
                            <div
                                key={notif.id}
                                className="group flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-slate-50 cursor-pointer"
                                onClick={() => router.push(notif.link)}
                            >
                                <div className="mt-0.5">
                                    {notif.status === 'pending' && <Clock className="h-4 w-4 text-amber-500" />}
                                    {notif.status === 'approved' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                    {notif.status === 'rejected' && <XCircle className="h-4 w-4 text-red-500" />}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-xs font-medium text-slate-900 leading-none">
                                        {notif.title}
                                    </p>
                                    <p className="text-xs text-slate-500 line-clamp-1">
                                        {notif.description}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                        {format(new Date(notif.date), "MMM d, h:mm a")}
                                    </p>
                                </div>
                                <ArrowRight className="h-3 w-3 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
