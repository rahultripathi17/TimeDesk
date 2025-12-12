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
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function RegularizationPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);
    const [showSuccess, setShowSuccess] = useState(false);

    // Form State
    const [date, setDate] = useState("");
    const [checkIn, setCheckIn] = useState("");
    const [checkOut, setCheckOut] = useState("");
    const [reason, setReason] = useState("");
    
    // Data State
    const [department, setDepartment] = useState<string | null>(null);
    const [approvers, setApprovers] = useState<{ id: string, full_name: string, department: string | null, designation: string | null, role: string }[]>([]);
    const [userRole, setUserRole] = useState<string>("");
    const [selectedApproverId, setSelectedApproverId] = useState<string>("");
    const [approverName, setApproverName] = useState<string>("");

    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get Profile & Department
            const { data: profile } = await supabase
                .from('profiles')
                .select('department, reporting_managers, role')
                .eq('id', user.id)
                .single();

            if (profile) {
                setDepartment(profile.department);

                // 2. Get Approvers based on Role (Same logic as Leave Apply)
                let potentialApprovers: { id: string, full_name: string, department: string | null, designation: string | null, role: string }[] = [];
                const role = profile.role;
                setUserRole(role);

                if (role === 'admin') {
                    potentialApprovers = [];
                } else if (role === 'hr') {
                    const { data: admins } = await supabase
                        .from('profiles')
                        .select('id, full_name, department, designation, role')
                        .eq('role', 'admin');
                    if (admins) potentialApprovers = admins;
                } else if (role === 'manager') {
                    const { data: hrs } = await supabase
                        .from('profiles')
                        .select('id, full_name, department, designation, role')
                        .eq('role', 'hr');
                    if (hrs) potentialApprovers = hrs;
                } else {
                    if (profile.reporting_managers && profile.reporting_managers.length > 0) {
                        const { data: managers } = await supabase
                            .from('profiles')
                            .select('id, full_name, department, designation, role')
                            .in('id', profile.reporting_managers);
                        if (managers) potentialApprovers = managers;
                    }
                    if (potentialApprovers.length === 0 && profile.department) {
                        const { data: deptManagers } = await supabase
                            .from('profiles')
                            .select('id, full_name, department, designation, role')
                            .eq('department', profile.department)
                            .eq('role', 'manager')
                            .neq('id', user.id);
                        if (deptManagers) potentialApprovers = deptManagers;
                    }
                }

                setApprovers(potentialApprovers);

                if (potentialApprovers.length === 1) {
                    setSelectedApproverId(potentialApprovers[0].id);
                    setApproverName(potentialApprovers[0].full_name);
                } else if (potentialApprovers.length > 1) {
                    setSelectedApproverId(potentialApprovers[0].id);
                    setApproverName(potentialApprovers[0].full_name);
                }
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load approver data");
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedApproverId) {
            const app = approvers.find(a => a.id === selectedApproverId);
            if (app) setApproverName(app.full_name);
        }
    }, [selectedApproverId, approvers]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (userRole !== 'admin' && !selectedApproverId) {
            toast.error(approvers.length === 0 ? "No approvers found. Please contact HR." : "Please select an approver");
            setLoading(false);
            return;
        }

        if (checkIn >= checkOut) {
            toast.error("Check-out time must be after Check-in time");
            setLoading(false);
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Construct rich reason with times
            const richReason = JSON.stringify({
                reason: reason,
                checkIn: checkIn,
                checkOut: checkOut,
                type: 'regularization_request'
            });

            const res = await fetch('/api/leaves', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    type: 'Regularization', // Special Type
                    startDate: date,
                    endDate: date, // Single day
                    reason: richReason,
                    approverId: selectedApproverId,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to submit");

            toast.success("Regularization request submitted");
            setDate("");
            setCheckIn("");
            setCheckOut("");
            setReason("");
            setShowSuccess(true);

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppShell role={(userRole as "employee" | "manager" | "hr" | "admin") || "employee"}>
            <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:py-8">
                <header className="mb-6">
                    <h1 className="text-lg font-semibold text-slate-900">Attendance Regularization</h1>
                    <p className="text-xs text-slate-500">
                        Fix missed attendance logs by requesting regularization.
                    </p>
                </header>

                {showSuccess ? (
                    <Card className="border-emerald-100 bg-emerald-50/50">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="rounded-full bg-emerald-100 p-3 mb-4">
                                <CheckCircle className="h-8 w-8 text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-2">Request Submitted!</h3>
                            <p className="text-slate-600 max-w-xs mx-auto mb-6">
                                Your regularization request has been sent to <span className="font-medium text-slate-900">{approverName}</span> for approval.
                            </p>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowSuccess(false);
                                    }}
                                    className="bg-white"
                                >
                                    Submit Another
                                </Button>
                                <Button
                                    onClick={() => router.push('/leaves/apply')}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    View Status
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="pt-6">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                
                                <div className="space-y-2">
                                    <Label htmlFor="date">Select Date</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        required
                                        max={new Date().toISOString().split('T')[0]} // Cannot regularize future
                                    />
                                    <p className="text-[10px] text-slate-500">
                                        Select the date you missed marking attendance.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="checkIn">Check-In Time</Label>
                                        <Input
                                            id="checkIn"
                                            type="time"
                                            value={checkIn}
                                            onChange={(e) => setCheckIn(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="checkOut">Check-Out Time</Label>
                                        <Input
                                            id="checkOut"
                                            type="time"
                                            value={checkOut}
                                            onChange={(e) => setCheckOut(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="approver">Approver</Label>
                                    {dataLoading ? (
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                                        </div>
                                    ) : userRole === 'admin' ? (
                                        <div className="flex items-center gap-2 p-3 bg-slate-50 border rounded-md text-sm text-slate-600">
                                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                                            <span>System (Auto-Approval)</span>
                                        </div>
                                    ) : approvers.length > 0 ? (
                                        <Select value={selectedApproverId} onValueChange={setSelectedApproverId} required>
                                            <SelectTrigger id="approver">
                                                <SelectValue placeholder="Select approver" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {approvers.map((approver) => (
                                                    <SelectItem key={approver.id} value={approver.id}>
                                                        <div className="flex flex-col items-start text-left">
                                                            <span className="font-medium">{approver.full_name}</span>
                                                            <span className="text-xs text-slate-500">
                                                                {approver.designation || approver.role.toUpperCase()}
                                                            </span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-700">
                                            <AlertCircle className="h-4 w-4" />
                                            <span>No approvers found. Please contact HR.</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="reason">Reason for Missing Punch</Label>
                                    <Textarea
                                        id="reason"
                                        placeholder="e.g. Forgot ID card, biometric scanner issue..."
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
                                        className="bg-indigo-600 hover:bg-indigo-700"
                                        disabled={loading || !date || !checkIn || !checkOut || !reason || (!selectedApproverId && userRole !== 'admin')}
                                    >
                                        {loading ? "Submitting..." : "Submit Request"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppShell>
    );
}
