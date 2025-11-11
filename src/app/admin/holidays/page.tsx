"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ChevronsUpDown, Check, CalendarIcon, Trash2, Plus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { supabase } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export default function HolidayCalendarPage() {
    const [holidays, setHolidays] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [departments, setDepartments] = useState<string[]>([]);
    
    // Form State
    const [openDialog, setOpenDialog] = useState(false);
    const [name, setName] = useState("");
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchHolidays();
        fetchDepartments();
    }, []);

    const fetchHolidays = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('holidays')
            .select('*')
            .order('date', { ascending: true });
        
        if (error) {
            console.error(error);
            toast.error("Failed to load holidays");
        } else {
            setHolidays(data || []);
        }
        setLoading(false);
    };

    const fetchDepartments = async () => {
        const res = await fetch('/api/admin/departments');
        const data = await res.json();
        if (Array.isArray(data)) {
            setDepartments(data);
        }
    };

    const handleCreateHoliday = async () => {
        if (!name || !date) {
            toast.error("Please enter name and date");
            return;
        }

        setSubmitting(true);
        const formattedDate = format(date, "yyyy-MM-dd");
        
        const { error } = await supabase.from('holidays').insert({
            name,
            date: formattedDate,
            departments: selectedDepts.length > 0 ? selectedDepts : null
        });

        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Holiday created!");
            setOpenDialog(false);
            resetForm();
            fetchHolidays();
        }
        setSubmitting(false);
    };

    const handleDelete = async (id: string) => {
        const confirm = window.confirm("Are you sure you want to delete this holiday?");
        if (!confirm) return;

        const { error } = await supabase.from('holidays').delete().eq('id', id);
        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Holiday deleted");
            fetchHolidays();
        }
    };

    const resetForm = () => {
        setName("");
        setDate(undefined);
        setSelectedDepts([]);
    };

    const toggleDept = (dept: string) => {
        setSelectedDepts(prev => 
            prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
        );
    };

    return (
        <AppShell role="admin">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
                <DashboardHeader title="Holiday Calendar" description="Manage company holidays and events." />
                
                <div className="mt-6 space-y-6">
                    <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
                        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                            <DialogTrigger asChild>
                                <Button className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all">
                                    <Plus className="mr-2 h-4 w-4" /> Add Holiday
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px] w-[95vw] rounded-xl text-left">
                                <DialogHeader>
                                    <DialogTitle>Add New Holiday</DialogTitle>
                                    <DialogDescription>
                                        Create a holiday for the entire company or specific departments.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4 text-left">
                                    <div className="space-y-2">
                                        <Label>Holiday Name</Label>
                                        <Input 
                                            placeholder="e.g. New Year's Day" 
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="rounded-lg"
                                        />
                                    </div>
                                    <div className="space-y-2 flex flex-col">
                                        <Label>Date</Label>
                                        <Input
                                            type="date"
                                            value={date ? format(date, "yyyy-MM-dd") : ""}
                                            onChange={(e) => {
                                                const d = e.target.valueAsDate;
                                                if (d) setDate(d);
                                            }}
                                            className="rounded-lg w-full"
                                        />
                                    </div>
                                    <div className="space-y-2 flex flex-col">
                                        <Label>Departments (Optional)</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className="w-full justify-between"
                                                >
                                                    {selectedDepts.length > 0 
                                                        ? `${selectedDepts.length} selected` 
                                                        : "Select departments"}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[400px] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Search department..." />
                                                    <CommandList>
                                                        <CommandEmpty>No department found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {departments.map((dept) => (
                                                                <CommandItem
                                                                    key={dept}
                                                                    value={dept}
                                                                    onSelect={() => toggleDept(dept)}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            selectedDepts.includes(dept) ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {dept}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        
                                        {selectedDepts.length > 0 ? (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {selectedDepts.map(d => (
                                                    <Badge key={d} variant="secondary" className="text-[10px] h-6 px-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                                                        {d}
                                                        <X 
                                                            className="ml-1.5 h-3 w-3 cursor-pointer hover:text-red-500" 
                                                            onClick={() => toggleDept(d)}
                                                        />
                                                    </Badge>
                                                ))}
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-6 text-[10px] text-slate-500"
                                                    onClick={() => setSelectedDepts([])}
                                                >
                                                    Clear
                                                </Button>
                                            </div>
                                        ) : (
                                            <p className="text-[11px] text-slate-500">Leaving empty applies to <strong>All Departments</strong>.</p>
                                        )}
                                    </div>
                                </div>
                                <DialogFooter className="gap-2 sm:gap-0">
                                    <Button variant="outline" onClick={() => setOpenDialog(false)} className="rounded-lg">Cancel</Button>
                                    <Button onClick={handleCreateHoliday} disabled={submitting} className="rounded-lg bg-slate-900 text-white hover:bg-slate-800">
                                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Create Holiday
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {loading ? (
                         <div className="flex justify-center p-12">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-600/50" />
                        </div>
                    ) : holidays.length === 0 ? (
                        <Card className="border-dashed border-2 bg-slate-50/50">
                            <CardContent className="flex flex-col items-center justify-center p-16 text-slate-500">
                                 <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                    <CalendarIcon className="h-8 w-8 text-blue-400" />
                                 </div>
                                 <h3 className="text-lg font-semibold text-slate-900">No holidays yet</h3>
                                 <p className="text-sm">Get started by adding your first holiday.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {holidays.map((holiday) => (
                                <Card key={holiday.id} className="group hover:shadow-md transition-all duration-300 border-slate-200 hover:border-blue-200">
                                    <CardHeader className="pb-3 pt-4 px-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                     <Badge variant="outline" className="bg-slate-50 text-slate-600 font-medium border-slate-200 rounded-md px-2 py-0.5 text-xs">
                                                        {format(new Date(holiday.date), "EEE, MMM d, yyyy")}
                                                     </Badge>
                                                </div>
                                                <CardTitle className="text-lg font-semibold text-slate-900 leading-tight mt-1 line-clamp-2" title={holiday.name}>
                                                    {holiday.name}
                                                </CardTitle>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-7 w-7 -mr-2 -mt-1 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                onClick={() => handleDelete(holiday.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="px-4 pb-4">
                                        <div className="pt-3 border-t border-slate-100 mt-1">
                                            {!holiday.departments || holiday.departments.length === 0 ? (
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100">
                                                        All Departments
                                                    </Badge>
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {holiday.departments.slice(0, 2).map((d: string) => (
                                                        <Badge key={d} variant="secondary" className="text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100 font-normal">
                                                            {d}
                                                        </Badge>
                                                    ))}
                                                    {holiday.departments.length > 2 && (
                                                        <Badge variant="secondary" className="text-[10px] bg-slate-50 text-slate-600">
                                                            +{holiday.departments.length - 2}
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
