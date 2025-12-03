"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AttendanceCalendar } from "@/components/attendance/AttendanceCalendar";
import { supabase } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function UserAttendancePage() {
    const params = useParams();
    const router = useRouter();
    const userId = params.userId as string;

    const [userProfile, setUserProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [viewerRole, setViewerRole] = useState<string>("employee");

    useEffect(() => {
        fetchViewerRole();
        if (userId) {
            fetchUserProfile();
        }
    }, [userId]);

    const fetchViewerRole = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            if (data) setViewerRole(data.role);
        }
    };

    const fetchUserProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            setUserProfile(data);
        } catch (error) {
            console.error("Error fetching user profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    if (loading) {
        return (
            <AppShell role={viewerRole as any}>
                <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
            </AppShell>
        );
    }

    if (!userProfile) {
        return (
            <AppShell role={viewerRole as any}>
                <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
                    <p className="text-slate-500">User not found.</p>
                    <Button onClick={() => router.back()}>Go Back</Button>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell role={viewerRole as any}>
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
                <div className="mb-6">
                    <Button
                        variant="ghost"
                        className="mb-4 pl-0 hover:bg-transparent hover:text-slate-900"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to List
                    </Button>

                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
                            <AvatarImage src={(userProfile.avatar_url && userProfile.avatar_url !== "NULL" && userProfile.avatar_url !== "null") ? userProfile.avatar_url : undefined} />
                            <AvatarFallback className="bg-blue-100 text-blue-700 text-xl">
                                {getInitials(userProfile.full_name)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{userProfile.full_name}</h1>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <span>{userProfile.department}</span>
                                <span>•</span>
                                <span className="capitalize">{userProfile.role}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <AttendanceCalendar userId={userId} />
            </div>
        </AppShell>
    );
}
