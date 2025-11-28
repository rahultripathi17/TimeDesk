"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Loader2, Calendar, AlertCircle } from "lucide-react";

type LeaveBalance = {
    type: string;
    limit: number;
    used: number;
    pending: number;
    is_paid: boolean;
};

export default function LeaveBalancePage() {
    const [loading, setLoading] = useState(true);
    const [balances, setBalances] = useState<LeaveBalance[]>([]);
    const [department, setDepartment] = useState<string | null>(null);

    useEffect(() => {
        fetchBalances();
    }, []);

    const fetchBalances = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get User Department
            const { data: profile } = await supabase
                .from('profiles')
                .select('department')
                .eq('id', user.id)
                .single();

            if (!profile?.department) {
                setLoading(false);
                return;
            }
            setDepartment(profile.department);

            // 2. Get Department Limits
            const limitsResponse = await fetch(`/api/admin/leaves/limits?department=${profile.department}`);
            if (!limitsResponse.ok) throw new Error("Failed to fetch limits");
            const limitsData = await limitsResponse.json();

            // 3. Get Reset Date & Leaves
            // Fetch reset date
            const { data: resetData } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'leave_reset_date')
                .single();

            const resetDate = resetData?.value || `${new Date().getFullYear()}-01-01`;

            const { data: leaves, error: leavesError } = await supabase
                .from('leaves')
                .select('type, start_date, end_date, status, duration')
                .eq('user_id', user.id)
                .neq('status', 'rejected') // Count approved and pending
                .gt('start_date', resetDate)
                .returns<any[]>(); // Bypass strict typing for now or define interface if possible, but 'any' is quick fix for the added column

            if (leavesError) throw leavesError;

            // 4. Calculate Used/Pending
            const usageMap: Record<string, { used: number; pending: number }> = {};

            leaves?.forEach(leave => {
                let days = 0;

                if (leave.duration) {
                    days = Number(leave.duration);
                } else if (leave.type === 'Half Day') {
                    days = 0.5;
                } else {
                    const start = new Date(leave.start_date);
                    const end = new Date(leave.end_date);
                    // Simple day diff calculation (inclusive)
                    days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                }

                if (!usageMap[leave.type]) {
                    usageMap[leave.type] = { used: 0, pending: 0 };
                }

                if (leave.status === 'approved') {
                    usageMap[leave.type].used += days;
                } else if (leave.status === 'pending') {
                    usageMap[leave.type].pending += days;
                }
            });

            // 5. Merge Limits and Usage
            const balanceData = limitsData.map((limit: any) => ({
                type: limit.leave_type,
                limit: limit.limit_days,
                used: usageMap[limit.leave_type]?.used || 0,
                pending: usageMap[limit.leave_type]?.pending || 0,
                is_paid: limit.is_paid ?? true
            }));

            setBalances(balanceData);

        } catch (error) {
            console.error("Error fetching balances:", error);
            toast.error("Failed to load leave balances");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppShell role="employee">
            <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-8">
                <div className="mb-6">
                    <h1 className="text-lg font-semibold text-slate-900">Leave Balances</h1>
                    <p className="text-xs text-slate-500">
                        Overview of your leave usage and remaining balance for {new Date().getFullYear()}.
                    </p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                ) : !department ? (
                    <Card className="border-amber-200 bg-amber-50">
                        <CardContent className="pt-6 flex items-center gap-3 text-amber-800">
                            <AlertCircle className="h-5 w-5" />
                            <p>Your department is not set. Please contact HR to configure your profile.</p>
                        </CardContent>
                    </Card>
                ) : balances.length === 0 ? (
                    <Card>
                        <CardContent className="pt-6 text-center text-slate-500">
                            No leave limits configured for your department ({department}).
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                        {balances.map((balance) => {
                            const totalUsed = balance.used + balance.pending;
                            const percentage = Math.min((totalUsed / balance.limit) * 100, 100);
                            const remaining = Math.max(balance.limit - balance.used, 0); // Pending doesn't reduce "Available" until approved? Or should it? 
                            // Usually "Available" = Limit - Used. Pending is just "Blocked".
                            // Let's show "Available" as Limit - Used.

                            return (
                                <Card key={balance.type}>
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-base font-medium flex items-center gap-2">
                                                {balance.type} Leave
                                                <span className="text-[10px] font-normal text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                                    {balance.is_paid ? "Paid" : "Unpaid"}
                                                </span>
                                            </CardTitle>
                                            <Calendar className="h-4 w-4 text-slate-400" />
                                        </div>
                                        <CardDescription>
                                            <span className="font-semibold text-slate-900">{remaining}</span> days available
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            <Progress value={percentage} className="h-2" />
                                            <div className="flex justify-between text-xs text-slate-500">
                                                <span>Used: {balance.used}</span>
                                                {balance.pending > 0 && (
                                                    <span className="text-amber-600">Pending: {balance.pending}</span>
                                                )}
                                                <span>Limit: {balance.limit}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
