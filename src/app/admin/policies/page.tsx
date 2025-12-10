"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { getDepartmentPolicies, saveDepartmentPolicy } from "./actions";
import { Loader2, Save, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function PoliciesPage() {
    const [policies, setPolicies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        loadPolicies();
    }, []);

    const loadPolicies = async () => {
        try {
            const data = await getDepartmentPolicies();
            setPolicies(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load policies");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (dept: string, enabled: boolean, url: string) => {
        setSaving(dept);
        try {
            await saveDepartmentPolicy(dept, enabled, url);
            toast.success(`Policy saved for ${dept}`);
            // Refresh local state to reflect saved (though upsert handles it)
            setPolicies(prev => prev.map(p => p.department === dept ? { ...p, is_enabled: enabled, policy_url: url } : p));
        } catch (error) {
            toast.error("Failed to save policy");
            console.error(error);
        } finally {
            setSaving(null);
        }
    };

    const updateLocalState = (dept: string, field: 'is_enabled' | 'policy_url', value: any) => {
        setPolicies(prev => prev.map(p => 
            p.department === dept ? { ...p, [field]: value } : p
        ));
    };

    return (
        <AppShell role="admin">
            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Policy Management</h1>
                    <p className="text-slate-500">Manage department-specific policies and visibility.</p>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {policies.length === 0 && (
                            <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-lg border border-dashed">
                                No departments found. Add users to departments first.
                            </div>
                        )}
                        
                        {policies.map((policy) => (
                            <Card key={policy.department} className={`transition-all ${policy.is_enabled ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-slate-200 opacity-90'}`}>
                                <CardContent className="pt-6">
                                    <div className="flex flex-col md:flex-row md:items-start gap-6">
                                        
                                        {/* Department Info & Toggle */}
                                        <div className="md:w-1/4 flex flex-col gap-4">
                                            <div>
                                                <h3 className="font-semibold text-lg text-slate-900">{policy.department}</h3>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Switch 
                                                        checked={policy.is_enabled}
                                                        onCheckedChange={(checked) => updateLocalState(policy.department, 'is_enabled', checked)}
                                                    />
                                                    <span className={`text-sm font-medium ${policy.is_enabled ? 'text-blue-600' : 'text-slate-500'}`}>
                                                        {policy.is_enabled ? 'Enabled' : 'Disabled'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Policy URL Input */}
                                        <div className="flex-1 space-y-3">
                                            <Label className="text-xs font-medium text-slate-500">
                                                Policy PDF URL (Google Drive / Public Link)
                                            </Label>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <FileText className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                                    <Input 
                                                        value={policy.policy_url}
                                                        onChange={(e) => updateLocalState(policy.department, 'policy_url', e.target.value)}
                                                        placeholder="https://drive.google.com/..."
                                                        className="pl-9"
                                                        disabled={!policy.is_enabled} // Optional: disable input if toggle off? Or allow edit. Let's allow edit.
                                                    />
                                                </div>
                                                <Button 
                                                    onClick={() => handleSave(policy.department, policy.is_enabled, policy.policy_url)}
                                                    disabled={saving === policy.department}
                                                    className={policy.is_enabled ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-600 hover:bg-slate-700"}
                                                >
                                                    {saving === policy.department ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Save className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                            <p className="text-[10px] text-slate-500">
                                                Make sure the link is viewable by organization members (e.g. "Anyone with link" or restricted to domain).
                                            </p>
                                        </div>

                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
