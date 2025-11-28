"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Settings, Save } from "lucide-react";

export default function AdminSettingsPage() {
    const [commonInfo, setCommonInfo] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'common_info')
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setCommonInfo(data.value);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            toast.error("Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('system_settings')
                .upsert({
                    key: 'common_info',
                    value: commonInfo,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            toast.success("Settings saved successfully");
        } catch (error: any) {
            console.error('Error saving settings:', error);
            toast.error("Failed to save settings: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppShell role="admin">
            <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-8">
                <header className="mb-6">
                    <h1 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <Settings className="h-5 w-5 text-slate-500" />
                        Notice Board Management
                    </h1>
                    <p className="text-xs text-slate-500">
                        Manage company-wide notices and announcements for all employees.
                    </p>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Notice Board Content</CardTitle>
                        <CardDescription className="text-xs">
                            This content will be displayed on the dashboard for all employees.
                            Use this for announcements, lunch timings, or general guidelines.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            placeholder="Enter notice board content here (e.g., Lunch Time: 1:00 PM - 2:00 PM)..."
                            className="min-h-[150px] text-sm"
                            value={commonInfo}
                            onChange={(e) => setCommonInfo(e.target.value)}
                            disabled={loading}
                        />
                        <div className="flex justify-end">
                            <Button
                                onClick={handleSave}
                                disabled={loading || saving}
                                className="gap-2"
                            >
                                <Save className="h-4 w-4" />
                                {saving ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    );
}
