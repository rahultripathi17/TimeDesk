"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Calendar, CheckCircle2 } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ResetLeavePage() {
    const [loading, setLoading] = useState(true);
    const [resetting, setResetting] = useState(false);
    const [lastResetDate, setLastResetDate] = useState<string | null>(null);

    useEffect(() => {
        fetchResetDate();
    }, []);

    const fetchResetDate = async () => {
        try {
            const { data, error } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'leave_reset_date')
                .single();

            if (error) {
                // If not found, it might be the first time. We'll handle that.
                if (error.code !== 'PGRST116') {
                    console.error("Error fetching reset date:", JSON.stringify(error, null, 2));
                    if (error.code === '42P01') {
                        toast.error("System settings table not found. Please run migration.sql.");
                    }
                }
            }

            if (data) {
                setLastResetDate(data.value);
            } else {
                setLastResetDate("2024-01-01"); // Default fallback
            }
        } catch (error: any) {
            console.error("Error:", JSON.stringify(error, null, 2));
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        setResetting(true);
        try {
            // Use local date to avoid timezone issues (e.g. UTC vs IST)
            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const today = `${year}-${month}-${day}`;

            const { error } = await supabase
                .from('system_settings')
                .upsert({ key: 'leave_reset_date', value: today });

            if (error) throw error;

            setLastResetDate(today);
            toast.success("Leave balances have been reset successfully.");
        } catch (error: any) {
            console.error("Error resetting leaves:", JSON.stringify(error, null, 2));
            toast.error("Failed to reset leave balances. Check console for details.");
        } finally {
            setResetting(false);
        }
    };

    return (
        <AppShell role="admin">
            <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:py-8">
                <header className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">Reset Leave Balances</h1>
                    <p className="text-sm text-slate-500">
                        Manage the leave cycle for the entire organization.
                    </p>
                </header>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        <Card className="border-amber-200 bg-amber-50">
                            <CardHeader>
                                <CardTitle className="text-amber-800 flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" />
                                    Warning: Irreversible Action
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-amber-700 text-sm space-y-2">
                                <p>
                                    This action will reset the <strong>"Used"</strong> leave count for <strong>ALL employees</strong> to 0.
                                </p>
                                <p>
                                    It works by setting a new "Reset Date". Only leaves approved <em>after</em> this date will count towards the used balance.
                                </p>
                                <p>
                                    <strong>Historical data is NOT deleted</strong>, but it will no longer affect current balances.
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Current Cycle</CardTitle>
                                <CardDescription>
                                    Details about the current leave tracking period.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-md border">
                                            <Calendar className="h-5 w-5 text-slate-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">Last Reset Date</p>
                                            <p className="text-xs text-slate-500">
                                                {lastResetDate ? new Date(lastResetDate + 'T00:00:00').toLocaleDateString(undefined, { dateStyle: 'long' }) : 'Never'}
                                            </p>
                                        </div>
                                    </div>
                                    {lastResetDate === new Date().toISOString().split('T')[0] && (
                                        <div className="flex items-center gap-1 text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded-full">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Reset Today
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" disabled={resetting}>
                                                {resetting ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Resetting...
                                                    </>
                                                ) : (
                                                    "Reset Leave Balances"
                                                )}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will effectively reset the leave usage for every employee in the system.
                                                    They will start with a fresh quota based on their department limits.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={handleReset}
                                                    className="bg-red-600 hover:bg-red-700"
                                                >
                                                    Yes, Reset All
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
