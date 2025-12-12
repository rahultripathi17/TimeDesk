"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Calendar, Clock, History, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, differenceInDays, parseISO } from "date-fns";

export default function LeaveApprovalPage() {
    const [leaves, setLeaves] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [pendingPage, setPendingPage] = useState(1);
    const [historyPage, setHistoryPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const [userRole, setUserRole] = useState<string>("manager");

    useEffect(() => {
        fetchLeaves();
        fetchUserRole();
    }, []);

    const fetchUserRole = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            if (profile) {
                setUserRole(profile.role);
            }
        }
    };

    const fetchLeaves = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch ALL leaves where approver_id is current user
            const { data, error } = await supabase
                .from('leaves')
                .select(`
                    *,
                    session,
                    profiles:user_id (full_name, email, avatar_url, work_config)
                `)
                .eq('approver_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLeaves(data || []);
        } catch (error) {
            console.error('Error fetching leaves:', error);
        } finally {
            setLoading(false);
        }
    };

    const pendingLeaves = leaves.filter(l => l.status === 'pending');
    const historyLeaves = leaves.filter(l => l.status !== 'pending');

    // Pagination Logic
    const totalPendingPages = Math.ceil(pendingLeaves.length / ITEMS_PER_PAGE);
    const pendingStartIndex = (pendingPage - 1) * ITEMS_PER_PAGE;
    const paginatedPendingLeaves = pendingLeaves.slice(pendingStartIndex, pendingStartIndex + ITEMS_PER_PAGE);

    const totalHistoryPages = Math.ceil(historyLeaves.length / ITEMS_PER_PAGE);
    const historyStartIndex = (historyPage - 1) * ITEMS_PER_PAGE;
    const paginatedHistoryLeaves = historyLeaves.slice(historyStartIndex, historyStartIndex + ITEMS_PER_PAGE);

    const getDuration = (leave: any) => {
        if (leave.type?.toLowerCase() === 'half day' && leave.session) {
            const date = format(parseISO(leave.start_date), "MMM d, yyyy");
            const workConfig = leave.profiles?.work_config;

            let startTime = "09:00";
            let endTime = "17:00";

            if (workConfig?.fixed) {
                startTime = workConfig.fixed.start_time || "09:00";
                endTime = workConfig.fixed.end_time || "17:00";
            }

            const [startH, startM] = startTime.split(':').map(Number);
            const [endH, endM] = endTime.split(':').map(Number);

            // Create date objects for calculation
            const d = new Date();
            d.setHours(startH, startM, 0, 0);
            const startStr = format(d, 'hh:mm a');

            d.setHours(endH, endM, 0, 0);
            const endStr = format(d, 'hh:mm a');

            // Calculate half day times
            // First Half: Start to Start + 4h
            // Second Half: End - 4h to End

            if (leave.session === 'first_half') {
                d.setHours(startH + 4, startM, 0, 0);
                const midStr = format(d, 'hh:mm a');
                return (
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-500">{date}</span>
                        <span className="text-xs text-slate-500">({startStr} - {midStr})</span>
                    </div>
                );
            } else {
                d.setHours(endH - 4, endM, 0, 0);
                const midStr = format(d, 'hh:mm a');
                return (
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-500">{date}</span>
                        <span className="text-xs text-slate-500">({midStr} - {endStr})</span>
                    </div>
                );
            }
        }

        const startDate = parseISO(leave.start_date);
        const endDate = parseISO(leave.end_date);
        const days = differenceInDays(endDate, startDate) + 1;
        return `${days} Day${days > 1 ? 's' : ''}`;
    };

    const handleAction = async (id: string, status: 'approved' | 'rejected') => {
        setProcessingId(id);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const response = await fetch('/api/leaves/approve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    leaveId: id,
                    status,
                    approverId: user.id
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update status');
            }

            toast.success(`Leave request ${status} successfully`);

            // Update local state
            setLeaves(leaves.map(l =>
                l.id === id ? { ...l, status } : l
            ));

        } catch (error: any) {
            console.error(`Error ${status} leave:`, error);
            toast.error(error.message || "Failed to update status");
        } finally {
            setProcessingId(null);
        }
    };
    
    // Helper to render reason (handles JSON for Regularization)
    const renderReason = (leave: any) => {
        if (leave.type === 'Regularization') {
            try {
                const details = JSON.parse(leave.reason);
                return (
                    <div className="flex flex-col gap-1">
                        <span>{details.reason}</span>
                        <div className="flex flex-wrap gap-1 text-[10px] text-slate-500 font-mono mt-0.5">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">In: {details.checkIn}</span>
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Out: {details.checkOut}</span>
                        </div>
                    </div>
                );
            } catch (e) {
                return leave.reason;
            }
        }
        return leave.reason;
    };

    return (
        <AppShell role={userRole as any}>
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
                <header className="mb-6">
                    <h1 className="text-lg font-semibold text-slate-900">Leave Requests</h1>
                    <p className="text-xs text-slate-500">
                        Review and approve pending leave requests from your team.
                    </p>
                </header>

                <Tabs defaultValue="pending" className="w-full">
                    <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                        <TabsTrigger value="pending">Pending Requests</TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                    </TabsList>

                    <TabsContent value="pending">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-amber-500" />
                                    Pending Approvals
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {/* Desktop Table View */}
                                <div className="hidden md:block">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Employee</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Duration</TableHead>
                                                <TableHead>Dates</TableHead>
                                                <TableHead>Reason</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loading ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="h-24 text-center">
                                                        Loading...
                                                    </TableCell>
                                                </TableRow>
                                            ) : paginatedPendingLeaves.length > 0 ? (
                                                paginatedPendingLeaves.map((leave) => (
                                                    <TableRow key={leave.id}>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-sm text-slate-900">
                                                                    {leave.profiles?.full_name || "Unknown User"}
                                                                </span>
                                                                <span className="text-xs text-slate-500">
                                                                    {leave.profiles?.email}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="font-normal whitespace-nowrap">
                                                                {leave.type}
                                                                {leave.type?.toLowerCase() === 'half day' && leave.session && (
                                                                    <span className="ml-1 text-slate-500">
                                                                        - {leave.session === 'first_half' ? 'First Half' : 'Second Half'}
                                                                    </span>
                                                                )}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="font-medium text-sm text-slate-700">
                                                                {getDuration(leave)}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col text-xs text-slate-500">
                                                                <span>{format(parseISO(leave.start_date), "MMM d, yyyy")}</span>
                                                                {format(parseISO(leave.start_date), "yyyy-MM-dd") !== format(parseISO(leave.end_date), "yyyy-MM-dd") && (
                                                                    <>
                                                                        <span className="text-slate-300 text-[10px]">to</span>
                                                                        <span>{format(parseISO(leave.end_date), "MMM d, yyyy")}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="max-w-[200px] text-xs text-slate-600 truncate" title={typeof leave.reason === 'string' && leave.reason.startsWith('{') ? 'Regularization Request' : leave.reason}>
                                                            {renderReason(leave)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                                                    onClick={() => handleAction(leave.id, 'rejected')}
                                                                    disabled={processingId === leave.id}
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                    <span className="sr-only">Reject</span>
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                                                                    onClick={() => handleAction(leave.id, 'approved')}
                                                                    disabled={processingId === leave.id}
                                                                >
                                                                    <Check className="h-4 w-4" />
                                                                    <span className="sr-only">Approve</span>
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <Check className="h-8 w-8 text-green-500 bg-green-50 rounded-full p-1" />
                                                            <p>All caught up! No pending requests.</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>

                                    {/* Pending Pagination Controls (Desktop) */}
                                    {totalPendingPages > 1 && (
                                        <div className="flex items-center justify-end space-x-2 py-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setPendingPage((prev) => Math.max(prev - 1, 1))}
                                                disabled={pendingPage === 1}
                                            >
                                                Previous
                                            </Button>
                                            <div className="text-sm text-slate-600">
                                                Page {pendingPage} of {totalPendingPages}
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setPendingPage((prev) => Math.min(prev + 1, totalPendingPages))}
                                                disabled={pendingPage === totalPendingPages}
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Mobile Card View */}
                                <div className="md:hidden space-y-4">
                                    {loading ? (
                                        <div className="text-center py-8 text-slate-500">Loading...</div>
                                    ) : paginatedPendingLeaves.length > 0 ? (
                                        paginatedPendingLeaves.map((leave) => (
                                            <div key={leave.id} className="border rounded-lg p-4 space-y-4 bg-white shadow-sm">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium">
                                                            {leave.profiles?.full_name?.charAt(0) || "U"}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-slate-900">{leave.profiles?.full_name || "Unknown User"}</p>
                                                            <p className="text-xs text-slate-500">{leave.profiles?.email}</p>
                                                        </div>
                                                    </div>
                                                    <Badge variant="outline" className="font-normal">
                                                        {leave.type}
                                                    </Badge>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 text-sm border-t border-b py-3">
                                                    <div>
                                                        <p className="text-xs text-slate-500 mb-1">Duration</p>
                                                        <div className="font-medium text-slate-700">{getDuration(leave)}</div>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-500 mb-1">Date Range</p>
                                                        <div className="font-medium text-slate-700">
                                                            {format(parseISO(leave.start_date), "MMM d")}
                                                            {format(parseISO(leave.start_date), "MMM d") !== format(parseISO(leave.end_date), "MMM d") && (
                                                                <> - {format(parseISO(leave.end_date), "MMM d")}</>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {leave.reason && (
                                                    <div className="bg-slate-50 p-3 rounded text-xs text-slate-600 italic">
                                                        {renderReason(leave)}
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-2 gap-3 pt-2">
                                                    <Button
                                                        variant="outline"
                                                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                                        onClick={() => handleAction(leave.id, 'rejected')}
                                                        disabled={processingId === leave.id}
                                                    >
                                                        <X className="h-4 w-4 mr-2" />
                                                        Reject
                                                    </Button>
                                                    <Button
                                                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                                                        onClick={() => handleAction(leave.id, 'approved')}
                                                        disabled={processingId === leave.id}
                                                    >
                                                        <Check className="h-4 w-4 mr-2" />
                                                        Approve
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg">
                                            <Check className="h-8 w-8 text-green-500 bg-green-100 rounded-full p-1 mx-auto mb-2" />
                                            <p>All caught up! No pending requests.</p>
                                        </div>

                                    )}

                                    {/* Pending Pagination Controls (Mobile) */}
                                    {totalPendingPages > 1 && (
                                        <div className="flex items-center justify-center space-x-2 py-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setPendingPage((prev) => Math.max(prev - 1, 1))}
                                                disabled={pendingPage === 1}
                                            >
                                                Previous
                                            </Button>
                                            <div className="text-sm text-slate-600">
                                                {pendingPage} / {totalPendingPages}
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setPendingPage((prev) => Math.min(prev + 1, totalPendingPages))}
                                                disabled={pendingPage === totalPendingPages}
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="history">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <History className="h-4 w-4 text-slate-500" />
                                    Approval History
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Employee</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Duration</TableHead>
                                            <TableHead>Dates</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center">
                                                    Loading...
                                                </TableCell>
                                            </TableRow>
                                        ) : paginatedHistoryLeaves.length > 0 ? (
                                            paginatedHistoryLeaves.map((leave) => (
                                                <TableRow key={leave.id}>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-sm text-slate-900">
                                                                {leave.profiles?.full_name || "Unknown User"}
                                                            </span>
                                                            <span className="text-xs text-slate-500">
                                                                {leave.profiles?.email}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="font-normal whitespace-nowrap">
                                                            {leave.type}
                                                            {leave.type?.toLowerCase() === 'half day' && leave.session && (
                                                                <span className="ml-1 text-slate-500">
                                                                    - {leave.session === 'first_half' ? 'First Half' : 'Second Half'}
                                                                </span>
                                                            )}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-medium text-sm text-slate-700">
                                                            {getDuration(leave)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col text-xs text-slate-500">
                                                            <span>{format(parseISO(leave.start_date), "MMM d, yyyy")}</span>
                                                            {format(parseISO(leave.start_date), "yyyy-MM-dd") !== format(parseISO(leave.end_date), "yyyy-MM-dd") && (
                                                                <>
                                                                    <span className="text-slate-300 text-[10px]">to</span>
                                                                    <span>{format(parseISO(leave.end_date), "MMM d, yyyy")}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Badge
                                                                variant="secondary"
                                                                className={cn(
                                                                    "capitalize font-medium",
                                                                    leave.status === 'approved' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                                )}
                                                            >
                                                                {leave.status}
                                                            </Badge>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Info className="h-4 w-4 text-slate-400 cursor-help" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Action taken by you</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                                    No history found.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>

                                {/* History Pagination Controls */}
                                {totalHistoryPages > 1 && (
                                    <div className="flex items-center justify-end space-x-2 py-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setHistoryPage((prev) => Math.max(prev - 1, 1))}
                                            disabled={historyPage === 1}
                                        >
                                            Previous
                                        </Button>
                                        <div className="text-sm text-slate-600">
                                            Page {historyPage} of {totalHistoryPages}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setHistoryPage((prev) => Math.min(prev + 1, totalHistoryPages))}
                                            disabled={historyPage === totalHistoryPages}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppShell >
    );
}
