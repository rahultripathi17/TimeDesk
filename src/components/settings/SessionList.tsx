"use client";

import { useEffect, useState } from "react";
import { getActiveSessions, revokeSession, revokeAllSessions } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Laptop, Smartphone, Globe, Trash2, LogOut, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { UAParser } from "ua-parser-js";
import { formatDistanceToNow } from "date-fns";

// We'll approximate device icons
const getDeviceIcon = (type: string | undefined) => {
    switch (type) {
        case 'mobile': return <Smartphone className="h-5 w-5 text-slate-500" />;
        case 'tablet': return <Smartphone className="h-5 w-5 text-slate-500" />;
        default: return <Laptop className="h-5 w-5 text-slate-500" />;
    }
};

export function SessionList() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const [revokingAll, setRevokingAll] = useState(false);

    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        try {
            const result = await getActiveSessions();
            // Handle both old (array) and new (object) return types gracefully during migration
            if (Array.isArray(result)) {
                setSessions(result);
            } else {
                setSessions(result.sessions);
                setCurrentSessionId(result.currentSessionId || null);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load sessions");
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (sessionId: string) => {
        setRevokingId(sessionId);
        try {
            await revokeSession(sessionId);
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            toast.success("Session logged out");
        } catch (error) {
            toast.error("Failed to log out session");
        } finally {
            setRevokingId(null);
        }
    };

    const handleRevokeAll = async () => {
        if (!confirm("Are you sure? This will log you out of all devices including this one.")) return;
        
        setRevokingAll(true);
        try {
            await revokeAllSessions();
            setSessions([]);
            toast.success("All sessions logged out");
            window.location.reload(); // Force reload to trigger client-side auth state update
        } catch (error) {
            toast.error("Failed to clear all sessions");
        } finally {
            setRevokingAll(false);
        }
    };

    if (loading) {
        return <div className="p-4 text-center text-sm text-slate-500">Loading active sessions...</div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4 text-slate-500" />
                    Active Sessions
                </CardTitle>
                <CardDescription>
                    Manage where you're logged in.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    {sessions.map((session) => {
                        const ua = new UAParser(session.user_agent);
                        const browser = ua.getBrowser();
                        const os = ua.getOS();
                        const device = ua.getDevice();
                        
                        const isCurrent = currentSessionId === session.id;

                        return (
                            <div key={session.id} className={`flex items-center justify-between p-3 border rounded-lg ${isCurrent ? 'bg-blue-50 border-blue-200' : 'bg-slate-50'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-md border shadow-sm ${isCurrent ? 'bg-blue-100 text-blue-600' : 'bg-white'}`}>
                                        {getDeviceIcon(device.type)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                                            {browser.name || "Unknown Browser"} on {os.name || "Unknown OS"}
                                            {isCurrent && (
                                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">
                                                    Current Device
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {/* IP would be session.ip but Supabase doesn't always expose it in listUserSessions unless configured? 
                                                It's usually in `session.ip` or `session.last_sign_in_ip`? 
                                                Actually listUserSessions returns `Session` objects which might not have IP.
                                             */}
                                            Active {formatDistanceToNow(new Date(session.last_accessed_at || session.created_at), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleRevoke(session.id)}
                                    disabled={revokingId === session.id}
                                >
                                    {revokingId === session.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log Out"}
                                </Button>
                            </div>
                        );
                    })}
                </div>

                {sessions.length > 0 && (
                    <div className="pt-4 border-t flex justify-end">
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={handleRevokeAll}
                            disabled={revokingAll}
                            className="gap-2"
                        >
                            {revokingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                            Clear All Sessions
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
