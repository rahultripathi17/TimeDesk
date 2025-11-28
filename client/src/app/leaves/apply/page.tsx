"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Loader2, Trash2, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

type LeaveRequest = {
    id: string;
    type: string;
    start_date: string;
    end_date: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
};

type LeaveLimit = {
    leave_type: string;
    limit_days: number;
};

export default function ApplyLeavePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);

    // Form State
    const [leaveType, setLeaveType] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [reason, setReason] = useState("");

    // Data State
    const [limits, setLimits] = useState<LeaveLimit[]>([]);
    const [department, setDepartment] = useState<string | null>(null);
    const [approvers, setApprovers] = useState<{ id: string, full_name: string, department: string | null }[]>([]);
    const [selectedApproverId, setSelectedApproverId] = useState<string>("");
    const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
    const [historyLeaves, setHistoryLeaves] = useState<LeaveRequest[]>([]);

    const selectedBalance = limits.find(l => l.leave_type === leaveType)
        ? {
            remaining: limits.find(l => l.leave_type === leaveType)!.limit_days, // Simplified for now, should calculate actual remaining
            used: 0 // Placeholder
        }
        : null;

    const approverName = approvers.find(a => a.id === selectedApproverId)?.full_name;

    // Helper to calculate balance
    const getLeaveBalance = async (userId: string, dept: string) => {
        // Fetch limits
        const { data: limitsData } = await supabase
            .from('department_leave_limits')
            .select('leave_type, limit_days')
            .eq('department', dept);

        if (limitsData) {
            // For now, just setting limits. Real implementation would calculate used days.
            setLimits(limitsData);
        }
    };

    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get Profile & Department
            const { data: profile } = await supabase
                .from('profiles')
                .select('department, reporting_managers')
                .eq('id', user.id)
                .single();

            if (profile) {
                setDepartment(profile.department);
                if (profile.department) {
                    await getLeaveBalance(user.id, profile.department);
                }

                // 2. Get Approvers
                let potentialApprovers: { id: string, full_name: string, department: string | null }[] = [];

                // First check direct reporting managers
                if (profile.reporting_managers && profile.reporting_managers.length > 0) {
                    const { data: managers } = await supabase
                        .from('profiles')
                        .select('id, full_name, department')
                        .in('id', profile.reporting_managers);

                    if (managers) potentialApprovers = managers;
                }

                // Fallback: Find any manager in department if no direct managers
                if (potentialApprovers.length === 0 && profile.department) {
                    const { data: deptManagers } = await supabase
                        .from('profiles')
                        .select('id, full_name, department')
                        .eq('department', profile.department)
                        .eq('role', 'manager')
                        .neq('id', user.id); // Don't select self

                    if (deptManagers) potentialApprovers = deptManagers;
                }

                setApprovers(potentialApprovers);

                // Auto-select if only one approver
                if (potentialApprovers.length === 1) {
                    setSelectedApproverId(potentialApprovers[0].id);
                } else if (potentialApprovers.length > 1) {
                    setSelectedApproverId(potentialApprovers[0].id); // Default to first
                }
            }

            // 3. Get Leaves (Pending & History)
            const { data: leaves } = await supabase
                .from('leaves')
                .select('*')
                .eq('employee_id', user.id)
                .order('created_at', { ascending: false });

            if (leaves) {
                setPendingLeaves(leaves.filter(l => l.status === 'pending') as LeaveRequest[]);
                setHistoryLeaves(leaves.filter(l => l.status !== 'pending') as LeaveRequest[]);
            }

        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load leave data");
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!selectedApproverId) {
            toast.error("Please select an approver");
            setLoading(false);
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const res = await fetch('/api/leaves', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    type: leaveType,
                    startDate,
                    endDate,
                    reason,
                    approverId: selectedApproverId
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to submit");

            toast.success("Leave application submitted");
            setLeaveType("");
            setStartDate("");
            setEndDate("");
            setReason("");
            fetchData(); // Refresh lists

            // Switch to pending tab
            const pendingTab = document.querySelector('[value="pending"]') as HTMLElement;
            if (pendingTab) pendingTab.click();

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (leaveId: string) => {
        if (!confirm("Are you sure you want to cancel this request?")) return;

        try {
            const res = await fetch('/api/leaves', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leaveId }),
            });

            if (!res.ok) throw new Error("Failed to cancel");

            toast.success("Request cancelled");
            fetchData();
        } catch (error) {
            toast.error("Could not cancel request");
        }
    };

    return (
        <AppShell role="employee">
            <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-8">
                <header className="mb-6">
                    <h1 className="text-lg font-semibold text-slate-900">Leave Management</h1>
                    <p className="text-xs text-slate-500">
                        Apply for new leaves and track your requests.
                    </p>
                </header>

                <Tabs defaultValue="apply" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                        <TabsTrigger value="apply">Apply for Leave</TabsTrigger>
                        <TabsTrigger value="pending">
                            Pending Requests
                            {pendingLeaves.length > 0 && (
                                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                                    {pendingLeaves.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                    </TabsList>

                    {/* APPLY TAB */}
                    <TabsContent value="apply">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">New Application</CardTitle>
                                <CardDescription>
                                    Requesting approval from:
                                    {approvers.length > 1 ? (
                                        <div className="mt-2">
                                            <Select value={selectedApproverId} onValueChange={setSelectedApproverId}>
                                                <SelectTrigger className="w-full md:w-[300px]">
                                                    <SelectValue placeholder="Select Approver" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {approvers.map(approver => (
                                                        <SelectItem key={approver.id} value={approver.id}>
                                                            {approver.full_name} • {approver.department || 'General'} Manager
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ) : (
                                        <span className="font-medium text-slate-900 ml-1">
                                            {approvers.length === 1
                                                ? `${approvers[0].full_name} • ${approvers[0].department || 'General'} Manager`
                                                : "No approver found"}
                                        </span>
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">

                                    <div className="space-y-2">
                                        <Label htmlFor="type">Leave Type</Label>
                                        {dataLoading ? (
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                                            </div>
                                        ) : limits.length > 0 ? (
                                            <>
                                                <Select value={leaveType} onValueChange={setLeaveType} required>
                                                    <SelectTrigger id="type">
                                                        <SelectValue placeholder="Select leave type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {limits.map((l) => (
                                                            <SelectItem key={l.leave_type} value={l.leave_type}>
                                                                {l.leave_type}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                {/* Balance Display */}
                                                {selectedBalance && (
                                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                                        <div className="rounded-lg border bg-emerald-50/50 p-3 text-center">
                                                            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Available</p>
                                                            <p className="text-2xl font-bold text-emerald-700 mt-1">{selectedBalance.remaining}</p>
                                                            <p className="text-[10px] text-slate-400">days left</p>
                                                        </div>
                                                        <div className="rounded-lg border bg-slate-50 p-3 text-center">
                                                            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Used</p>
                                                            <p className="text-2xl font-bold text-slate-700 mt-1">{selectedBalance.used}</p>
                                                            <p className="text-[10px] text-slate-400">days used</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4" />
                                                No leave types found for {department || 'your department'}.
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="startDate">Start Date</Label>
                                            <Input
                                                id="startDate"
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="endDate">End Date</Label>
                                            <Input
                                                id="endDate"
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                required
                                                min={startDate}
                                            />
                                        </div>
                                    </div>

                                    {/* Duration & Validation Display */}
                                    {
                                        startDate && endDate && (
                                            (() => {
                                                const start = new Date(startDate);
                                                const end = new Date(endDate);
                                                const diffTime = Math.abs(end.getTime() - start.getTime());
                                                const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                                                const isValid = !isNaN(days) && days > 0;
                                                const isExceeded = selectedBalance && days > selectedBalance.remaining;

                                                if (!isValid) return null;

                                                return (
                                                    <div className={`rounded-md p-3 text-sm ${isExceeded ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                                                        <div className="flex items-center gap-2 font-medium">
                                                            {isExceeded ? <XCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                                            Applying for {days} day{days > 1 ? 's' : ''}
                                                        </div>
                                                        {isExceeded && (
                                                            <p className="text-xs mt-1 text-red-600">
                                                                You only have {selectedBalance?.remaining} days remaining.
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })()
                                        )
                                    }

                                    <div className="space-y-2">
                                        <Label htmlFor="reason">Reason</Label>
                                        <Textarea
                                            id="reason"
                                            placeholder="Please provide a reason..."
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            required
                                            className="min-h-[100px]"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => router.back()}
                                            disabled={loading}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="bg-blue-600 hover:bg-blue-700"
                                            disabled={
                                                loading ||
                                                limits.length === 0 ||
                                                (!!selectedBalance && !!startDate && !!endDate && (
                                                    (Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1) > selectedBalance.remaining
                                                ))
                                            }
                                        >
                                            {loading ? "Submitting..." : "Submit Application"}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* PENDING TAB */}
                    <TabsContent value="pending">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-amber-500" />
                                    Pending Requests
                                </CardTitle>
                                <CardDescription>
                                    These requests are waiting for approval from {approverName || "your manager"}.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {pendingLeaves.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500">
                                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                                        <p>No pending requests.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {pendingLeaves.map(leave => (
                                            <div key={leave.id} className="flex items-center justify-between rounded-lg border p-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-semibold text-slate-900">{leave.type} Leave</span>
                                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                                            Pending
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-slate-500">
                                                        {format(new Date(leave.start_date), "MMM d, yyyy")} - {format(new Date(leave.end_date), "MMM d, yyyy")}
                                                    </p>
                                                    {leave.reason && (
                                                        <p className="text-xs text-slate-400 mt-1 italic">"{leave.reason}"</p>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleCancel(leave.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* HISTORY TAB */}
                    <TabsContent value="history">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Leave History</CardTitle>
                                <CardDescription>
                                    Your past leave requests and their status.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {historyLeaves.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500">
                                        <Clock className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                                        <p>No leave history found.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {historyLeaves.map(leave => (
                                            <div key={leave.id} className="flex items-center justify-between rounded-lg border p-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-semibold text-slate-900">{leave.type} Leave</span>
                                                        {leave.status === 'approved' ? (
                                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                                Approved
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                                Rejected
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-500">
                                                        {format(new Date(leave.start_date), "MMM d, yyyy")} - {format(new Date(leave.end_date), "MMM d, yyyy")}
                                                    </p>
                                                </div>
                                                <div className="text-right text-xs text-slate-400">
                                                    Applied on {format(new Date(leave.created_at), "MMM d")}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppShell>
    );
}
