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
import { Plus, Calendar } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

export default function MyLeavesPage() {
    const [leaves, setLeaves] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [userRole, setUserRole] = useState<string>("employee");
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        fetchLeaves();
    }, []);

    const fetchLeaves = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch Role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            
            if (profile?.role) setUserRole(profile.role);

            const { data, error } = await supabase
                .from('leaves')
                .select('*, duration, session')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLeaves(data || []);
        } catch (error) {
            console.error('Error fetching leaves:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "approved":
                return "bg-green-100 text-green-700 hover:bg-green-100";
            case "rejected":
                return "bg-red-100 text-red-700 hover:bg-red-100";
            case "pending":
                return "bg-amber-100 text-amber-700 hover:bg-amber-100";
            default:
                return "bg-slate-100 text-slate-700 hover:bg-slate-100";
        }
    };

    const totalPages = Math.ceil(leaves.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedLeaves = leaves.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return (
        <AppShell role={(userRole as "employee" | "manager" | "hr" | "admin") || "employee"}>
            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-lg font-semibold text-slate-900">My Leaves</h1>
                        <p className="text-xs text-slate-500">
                            View your leave history and status.
                        </p>
                    </div>
                    <Link href="/leaves/apply">
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="mr-2 h-4 w-4" />
                            Apply for Leave
                        </Button>
                    </Link>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Leave History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Dates</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Applied On</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedLeaves.length > 0 ? (
                                    paginatedLeaves.map((leave) => (
                                        <TableRow key={leave.id}>
                                            <TableCell className="font-medium">
                                                <span>{leave.type}</span>
                                                {leave.type === 'Half Day' && leave.session && (
                                                    <span className="text-slate-500 font-normal">
                                                        {' - '}{leave.session === 'first_half' ? 'First Half' : 'Second Half'}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-xs">
                                                    <span>{leave.start_date}</span>
                                                    <span className="text-slate-400">to</span>
                                                    <span>{leave.end_date}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {leave.duration ? (
                                                    <span>{leave.duration} Day{leave.duration > 1 ? 's' : ''}</span>
                                                ) : leave.type === 'Half Day' ? (
                                                    <span>0.5 Days</span>
                                                ) : (
                                                    <span>{Math.ceil((new Date(leave.end_date).getTime() - new Date(leave.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} Days</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate text-slate-500 text-xs">
                                                {leave.reason}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="secondary"
                                                    className={cn("font-normal capitalize", getStatusColor(leave.status))}
                                                >
                                                    {leave.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right text-xs text-slate-500">
                                                {new Date(leave.created_at).toLocaleDateString()}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <Calendar className="h-8 w-8 text-slate-300" />
                                                <p>No leave requests found.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

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
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    );
}
