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
import { Check, X, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function LeaveApprovalPage() {
    const [leaves, setLeaves] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetchPendingLeaves();
    }, []);

    const fetchPendingLeaves = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch leaves where approver_id is current user and status is pending
            const { data, error } = await supabase
                .from('leaves')
                .select(`
                    *,
                    profiles:user_id (full_name, email, avatar_url)
                `)
                .eq('approver_id', user.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: true });

            if (error) throw error;
            setLeaves(data || []);
        } catch (error) {
            console.error('Error fetching leaves:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: string, status: 'approved' | 'rejected') => {
        setProcessingId(id);
        try {
            const { error } = await supabase
                .from('leaves')
                .update({ status })
                .eq('id', id);

            if (error) throw error;

            toast.success(`Leave request ${status} successfully`);
            // Remove from list
            setLeaves(leaves.filter(l => l.id !== id));

        } catch (error: any) {
            console.error(`Error ${status} leave:`, error);
            toast.error(error.message || "Failed to update status");
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <AppShell role="manager">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
                <header className="mb-6">
                    <h1 className="text-lg font-semibold text-slate-900">Leave Requests</h1>
                    <p className="text-xs text-slate-500">
                        Review and approve pending leave requests from your team.
                    </p>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Pending Approvals</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Dates</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : leaves.length > 0 ? (
                                    leaves.map((leave) => (
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
                                                <Badge variant="outline" className="font-normal">
                                                    {leave.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-xs">
                                                    <span>{leave.start_date}</span>
                                                    <span className="text-slate-400">to</span>
                                                    <span>{leave.end_date}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-[250px] text-xs text-slate-600">
                                                {leave.reason}
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
                                        <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <Check className="h-8 w-8 text-green-500 bg-green-50 rounded-full p-1" />
                                                <p>All caught up! No pending requests.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    );
}
