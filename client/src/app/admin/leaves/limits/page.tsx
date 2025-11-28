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
import { supabase } from "@/utils/supabase/client";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type LeaveLimit = {
    leave_type: string;
    limit_days: number;
    color: string;
};

export default function LeaveLimitsPage() {
    const [department, setDepartment] = useState<string>("");
    const [limits, setLimits] = useState<LeaveLimit[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [departmentsList, setDepartmentsList] = useState<string[]>([]);

    // New leave type state
    const [newType, setNewType] = useState("");
    const [newLimit, setNewLimit] = useState("");
    const [newColor, setNewColor] = useState("#14b8a6"); // Default Teal

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const { data, error } = await supabase
                .from('department_leave_limits')
                .select('department');

            if (error) throw error;

            if (data) {
                // Extract unique departments
                const uniqueDepts = Array.from(new Set(data.map(item => item.department))).sort();
                setDepartmentsList(uniqueDepts);
            }
        } catch (err) {
            console.error("Error fetching departments:", err);
            toast.error("Failed to load departments");
        }
    };

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
                    limit_days: item.limit_days,
                    color: item.color || "#14b8a6"
                }));
                setLimits(fetchedLimits);
            } else {
                // Default types if none exist
                setLimits([
                    { leave_type: "Sick", limit_days: 0, color: "#f97316" }, // Orange
                    { leave_type: "Casual", limit_days: 0, color: "#f59e0b" }, // Amber
                    { leave_type: "Privilege", limit_days: 0, color: "#a855f7" }, // Purple
                ]);
            }
        } catch (error) {
            console.error(error);
            toast.error("Could not load leave limits");
        } finally {
            setLoading(false);
        }
    };

    const handleLimitChange = (index: number, field: keyof LeaveLimit, value: any) => {
        const newLimits = [...limits];
        if (field === 'limit_days') {
            newLimits[index].limit_days = parseInt(value) || 0;
        } else if (field === 'color') {
            newLimits[index].color = value;
        }
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

        setLimits([...limits, {
            leave_type: newType.trim(),
            limit_days: parseInt(newLimit) || 0,
            color: newColor
        }]);
        setNewType("");
        setNewLimit("");
        setNewColor("#14b8a6");
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

    const PRESET_COLORS = [
        "#f97316", // Orange
        "#f59e0b", // Amber
        "#14b8a6", // Teal
        "#6366f1", // Indigo
        "#a855f7", // Purple
        "#ec4899", // Pink
        "#64748b", // Slate
        "#8b5cf6", // Violet
        "#d946ef", // Fuchsia
        "#06b6d4", // Cyan
    ];

    const ColorPicker = ({ value, onChange }: { value: string, onChange: (color: string) => void }) => {
        const [open, setOpen] = useState(false);

        return (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-start gap-2 px-3 font-normal"
                    >
                        <div
                            className="h-4 w-4 rounded-full border border-slate-200"
                            style={{ backgroundColor: value }}
                        />
                        <span className="text-slate-500">
                            {value ? "Selected Color" : "Pick a color"}
                        </span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3">
                    <div className="grid grid-cols-5 gap-2">
                        {PRESET_COLORS.map((color) => (
                            <button
                                key={color}
                                className={cn(
                                    "h-8 w-8 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
                                    value === color ? "border-slate-900 scale-110" : "border-transparent"
                                )}
                                style={{ backgroundColor: color }}
                                onClick={() => {
                                    onChange(color);
                                    setOpen(false);
                                }}
                            />
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
        );
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
                                    {departmentsList.map((dept) => (
                                        <SelectItem key={dept} value={dept}>
                                            {dept}
                                        </SelectItem>
                                    ))}
                                    {departmentsList.length === 0 && (
                                        <SelectItem value="no-depts" disabled>
                                            No departments found
                                        </SelectItem>
                                    )}
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
                                                <div className="col-span-4">Leave Type</div>
                                                <div className="col-span-3">Annual Limit (Days)</div>
                                                <div className="col-span-4">Color Label</div>
                                                <div className="col-span-1"></div>
                                            </div>

                                            {limits.map((limit, index) => (
                                                <div key={index} className="grid grid-cols-12 gap-4 items-center">
                                                    <div className="col-span-4">
                                                        <Input
                                                            value={limit.leave_type}
                                                            readOnly
                                                            className="bg-slate-50"
                                                        />
                                                    </div>
                                                    <div className="col-span-3">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            value={limit.limit_days}
                                                            onChange={(e) => handleLimitChange(index, 'limit_days', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="col-span-4">
                                                        <ColorPicker
                                                            value={limit.color}
                                                            onChange={(color) => handleLimitChange(index, 'color', color)}
                                                        />
                                                    </div>
                                                    <div className="col-span-1 flex justify-end">
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
                                                <div className="col-span-4">
                                                    <Input
                                                        placeholder="New Leave Type"
                                                        value={newType}
                                                        onChange={(e) => setNewType(e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-3">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        placeholder="Limit"
                                                        value={newLimit}
                                                        onChange={(e) => setNewLimit(e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-4">
                                                    <ColorPicker
                                                        value={newColor}
                                                        onChange={setNewColor}
                                                    />
                                                </div>
                                                <div className="col-span-1 flex justify-end">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleAddType}
                                                        className="w-full"
                                                    >
                                                        <Plus className="h-4 w-4" />
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
