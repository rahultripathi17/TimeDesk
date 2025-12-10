"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function PolicyViewerPage() {
    const [policyUrl, setPolicyUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState<any>("employee");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchPolicy();
    }, []);

    const fetchPolicy = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get Role & Dept
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, department')
                .eq('id', user.id)
                .single();
            
            if (profile) {
                setRole(profile.role);
                
                // Fetch Policy
                const { data: policy } = await supabase
                    .from('department_policies')
                    .select('policy_url, is_enabled')
                    .eq('department', profile.department)
                    .single();

                if (policy && policy.is_enabled && policy.policy_url) {
                    setPolicyUrl(policy.policy_url);
                } else {
                    setError("No active policy found for your department.");
                }
            }
        } catch (err: any) {
            console.error(err);
            setError("Failed to load policy.");
        } finally {
            setLoading(false);
        }
    };

    // Helper to format Google Drive links for preview/embed
    const getEmbedUrl = (url: string) => {
        if (url.includes("drive.google.com")) {
             // Extract ID if possible or just use preview endpoint logic
             // Common pattern: https://drive.google.com/file/d/VIDEO_ID/view?usp=sharing
             // To embed: https://drive.google.com/file/d/VIDEO_ID/preview
             return url.replace('/view', '/preview');
        }
        return url;
    };

    return (
        <AppShell role={role}>
             <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8 h-[calc(100vh-64px)] flex flex-col">
                <div className="mb-4">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Company Policy</h1>
                </div>

                {loading ? (
                    <div className="flex flex-1 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                ) : error ? (
                    <div className="flex flex-1 items-center justify-center text-slate-500">
                        <div className="text-center">
                            <AlertCircle className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                            <p>{error}</p>
                        </div>
                    </div>
                ) : (
                    <Card className="flex-1 overflow-hidden border-0 shadow-md">
                        <CardContent className="p-0 h-full">
                            <iframe 
                                src={getEmbedUrl(policyUrl!)} 
                                className="w-full h-full border-0" 
                                title="Policy Viewer"
                                allow="autoplay"
                            />
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppShell>
    );
}
