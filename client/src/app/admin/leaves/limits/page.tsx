"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";

const DEPARTMENTS = [
    "Engineering",
    "Product",
    "Human Resources",
    "Sales",
    "Marketing",
    "Finance",
    "Operations",
    "Design",
    "Tech",
];

type LeaveLimit = {
    leave_type: string;
    limit_days: number;
};

export default function LeaveLimitsPage() {
    const [department, setDepartment] = useState<string>("");
    const [limits, setLimits] = useState<LeaveLimit[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // New leave type state
    const [newType, setNewType] = useState("");
    const [newLimit, setNewLimit] = useState("");

    useEffect(() => {
        if (department) {
            fetchLimits();
        } else {
            setLimits([]);
        }
    }, [department]);

    const fetchLimits = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/leaves/limits?department=${department}`);
            if (!response.ok) throw new Error("Failed to fetch limits");
            const data = await response.json();

            if (data && data.length > 0) {
                // Map response to state
                const fetchedLimits = data.map((item: any) => ({
                    leave_type: item.leave_type,
                    limit_days: item.limit_days
                }));
                setLimits(fetchedLimits);
            } else {
                // Default types if none exist
                setLimits([
                    { leave_type: "Sick", limit_days: 0 },
                    { leave_type: "Casual", limit_days: 0 },
                    { leave_type: "Privilege", limit_days: 0 },
                ]);
            }
        } catch (error) {
            console.error(error);
            toast.error("Could not load leave limits");
        } finally {
            setLoading(false);
        }
    };

    const handleLimitChange = (index: number, value: string) => {
        const newLimits = [...limits];
        newLimits[index].limit_days = parseInt(value) || 0;
        setLimits(newLimits);
    };

    const handleAddType = () => {
        if (!newType.trim()) {
            toast.error("Please enter a leave type name");
            return;
        }
        if (limits.some(l => l.leave_type.toLowerCase() === newType.trim().toLowerCase())) {
            toast.error("This leave type already exists");
            return;
        }

        setLimits([...limits, { leave_type: newType.trim(), limit_days: parseInt(newLimit) || 0 }]);
        setNewType("");
        setNewLimit("");
    };

    const handleRemoveType = (index: number) => {
        const newLimits = [...limits];
        newLimits.splice(index, 1);
        setLimits(newLimits);
    };

    const handleSave = async () => {
        if (!department) return;
        setSaving(true);
        try {
            const payload = {
                department,
                limits: limits
            };

            const response = await fetch('/api/admin/leaves/limits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Failed to save limits");

            toast.success("Leave limits updated successfully");
            fetchLimits(); // Refresh to ensure sync
        } catch (error) {
            console.error(error);
            toast.error("Failed to save limits");
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppShell role="admin">
            <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-8">
                <div className="mb-6">
                    <h1 className="text-lg font-semibold text-slate-900">Leave Balance Limits</h1>
                    <p className="text-xs text-slate-500">
                        Set department-wise leave limits and types.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Configure Limits</CardTitle>
                        <CardDescription>
                            Select a department to manage their leave types and balances.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="space-y-2">
                            <Label>Department</Label>
                            <Select value={department} onValueChange={setDepartment}>
                                <SelectTrigger className="w-full sm:w-[300px]">
                                    <SelectValue placeholder="Select Department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DEPARTMENTS.map((dept) => (
                                        <SelectItem key={dept} value={dept}>
                                            {dept}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {department && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-12 gap-4 font-medium text-sm text-slate-500 mb-2">
                                                <div className="col-span-6">Leave Type</div>
                                                <div className="col-span-4">Annual Limit (Days)</div>
                                                <div className="col-span-2"></div>
                                            </div>

                                            {limits.map((limit, index) => (
                                                <div key={index} className="grid grid-cols-12 gap-4 items-center">
                                                    <div className="col-span-6">
                                                        <Input
                                                            value={limit.leave_type}
                                                            readOnly
                                                            className="bg-slate-50"
                                                        />
                                                    </div>
                                                    <div className="col-span-4">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            value={limit.limit_days}
                                                            onChange={(e) => handleLimitChange(index, e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="col-span-2 flex justify-end">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                            onClick={() => handleRemoveType(index)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Add New Type Row */}
                                            <div className="grid grid-cols-12 gap-4 items-center pt-4 border-t border-dashed">
                                                <div className="col-span-6">
                                                    <Input
                                                        placeholder="New Leave Type (e.g. Bereavement)"
                                                        value={newType}
                                                        onChange={(e) => setNewType(e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-4">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        placeholder="Limit"
                                                        value={newLimit}
                                                        onChange={(e) => setNewLimit(e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-2 flex justify-end">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleAddType}
                                                        className="w-full"
                                                    >
                                                        <Plus className="h-4 w-4 mr-1" /> Add
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 flex justify-end">
                                            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                                                {saving ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="mr-2 h-4 w-4" />
                                                        Save Changes
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    );
}
