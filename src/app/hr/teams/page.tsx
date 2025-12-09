"use client";

import { AppShell } from "@/components/layout/AppShell";
import { TeamAttendanceList } from "@/components/attendance/TeamAttendanceList";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/client";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function HRTeamsPage() {
    const [departments, setDepartments] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDept, setSelectedDept] = useState<string | null>(null);

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            // Aggregate departments from profiles
            const { data, error } = await supabase
                .from('profiles')
                .select('department');

            if (error) throw error;

            if (data) {
                // Get unique non-null departments
                const uniqueDepts = Array.from(new Set(data.map(p => p.department).filter(Boolean))) as string[];
                setDepartments(uniqueDepts.sort());
            }
        } catch (error) {
            console.error("Error fetching departments:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppShell role="hr">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
                <header className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">Teams & Departments</h1>
                    <p className="text-sm text-slate-500">
                        View attendance by department.
                    </p>
                </header>

                <div className="space-y-4">
                    <TeamAttendanceList 
                        role="hr" 
                        departmentFilter={selectedDept} 
                        headerAction={
                            <div className="w-full sm:w-[200px]">
                                {loading ? (
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                                    </div>
                                ) : (
                                    <Select
                                        value={selectedDept || "all"}
                                        onValueChange={(val) => setSelectedDept(val === "all" ? null : val)}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue placeholder="Select Department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Departments</SelectItem>
                                            {departments.map((dept) => (
                                                <SelectItem key={dept} value={dept}>
                                                    {dept}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        }
                    />
                </div>
            </div>
        </AppShell>
    );
}
