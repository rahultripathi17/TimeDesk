"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/client";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface DashboardHeaderProps {
    title?: string;
    description?: string;
    action?: React.ReactNode;
}

export function DashboardHeader({ title, description, action }: DashboardHeaderProps) {
    const [name, setName] = useState<string | null>(null);
    const [department, setDepartment] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const today = format(new Date(), "EEEE, d MMM");

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, department')
                .eq('id', user.id)
                .single();

            if (profile) {
                setName(profile.full_name);
                setDepartment(profile.department);
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    return (
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <p className="text-sm font-medium text-slate-500">
                    {loading ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" /> Loading...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            {`${getGreeting()}, ${name || 'User'}`}
                            {department && (
                                <>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-slate-600">{department}</span>
                                </>
                            )}
                        </span>
                    )}
                </p>
                <h1 className="text-2xl font-bold text-slate-900 mt-1">
                    {title || "Dashboard"}
                </h1>
                {description && (
                    <p className="text-sm text-slate-500 mt-1">{description}</p>
                )}
            </div>
            
            <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-slate-900">{today}</p>
                </div>
                {action && (
                    <div>{action}</div>
                )}
            </div>
        </header>
    );
}
