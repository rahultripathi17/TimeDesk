"use client";

import { AppShell } from "@/components/layout/AppShell";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Loader2, AlertTriangle, XCircle, Clock, CalendarDays } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AdminReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedDept, setSelectedDept] = useState("all");
  const [departments, setDepartments] = useState<string[]>([]);
  
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 10;

  const [activeTab, setActiveTab] = useState("violators");

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    // Reset when filters change
    setPage(1);
    setReportData([]);
    setHasMore(true);
    fetchReport(1, true);
  }, [selectedMonth, selectedYear, selectedDept, activeTab]);

  const fetchDepartments = async () => {
    try {
        const res = await fetch('/api/admin/departments');
        const data = await res.json();
        if (Array.isArray(data)) {
            setDepartments(data);
        }
    } catch (error) {
        console.error("Failed to fetch departments", error);
    }
  };

  const fetchReport = async (pageNum: number, isReset: boolean = false) => {
    try {
      if (!isReset) setLoading(true); 
      
      const res = await fetch(`/api/admin/reports/compliance?month=${selectedMonth}&year=${selectedYear}&department=${selectedDept}&type=${activeTab}&page=${pageNum}&limit=${LIMIT}`);
      const json = await res.json();
      
      if (json.data) {
        setReportData(json.data);
        
        if (json.data.length < LIMIT) {
            setHasMore(false);
        } else {
            setHasMore(true); 
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchReport(newPage);
  };

  return (
    <AppShell role="admin">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <DashboardHeader title="Attendance Insights" />

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <SelectItem key={m} value={m.toString()}>
                            {format(new Date(2024, m - 1, 1), "MMMM")}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                    {[2024, 2025].map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                            {y}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Department" />
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
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-slate-100 p-1 rounded-lg">
                <TabsTrigger 
                    value="violators" 
                    className="data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm text-slate-500"
                >
                    Top Violators
                </TabsTrigger>
                <TabsTrigger 
                    value="performers" 
                    className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm text-slate-500"
                >
                    Top Performers
                </TabsTrigger>
            </TabsList>

            {/* VIOLATORS TAB */}
            <TabsContent value="violators">
                <Card className="border-t-4 border-t-red-500 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-slate-800">Non-Compliance Report</CardTitle>
                        <CardDescription>
                            Employees with the highest number of irregularities (Absents, Shortfall) for {format(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1), 'MMMM yyyy')}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="rounded-md border border-slate-100 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <div className="min-w-[900px]">
                                        {/* Header */}
                                        <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50 p-4 border-b border-slate-100">
                                            <div className="col-span-1">#</div>
                                            <div className="col-span-3">Employee</div>
                                            <div className="col-span-1 text-center">Present</div>
                                            <div className="col-span-1 text-center">Leaves</div>
                                            <div className="col-span-1 text-center">Absent</div>
                                            <div className="col-span-2 text-center">Missed Out</div>
                                            <div className="col-span-3 text-right">Shortfall</div>
                                        </div>
                                        
                                        {/* Rows */}
                                        {loading && page === 1 ? (
                                            <div className="flex justify-center py-12">
                                                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                                            </div>
                                        ) : reportData.length === 0 ? (
                                            <div className="text-center py-12 text-slate-500">
                                                No data found.
                                            </div>
                                        ) : (
                                            reportData.map((item, index) => {
                                                const dept = item.user.department || '';
                                                const role = item.user.designation || item.user.role || '';
                                                const subtitle = dept && role && dept.toLowerCase() === role.toLowerCase() 
                                                    ? dept 
                                                    : [dept, role].filter(Boolean).join(' • ');

                                                return (
                                                    <div key={item.user.id} className="grid grid-cols-12 gap-4 items-center p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors bg-white">
                                                        <div className="col-span-1 font-bold text-red-600">
                                                            #{((page - 1) * LIMIT) + index + 1}
                                                        </div>
                                                        <div className="col-span-3 flex items-center gap-3">
                                                        <Avatar className="h-10 w-10 bg-white">
                                                            <AvatarImage src={item.user.avatar_url || undefined} />
                                                            <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
                                                                {item.user.full_name?.charAt(0)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                            <div>
                                                                <div className="font-semibold text-slate-900">{item.user.full_name}</div>
                                                                <div className="text-xs text-slate-500 line-clamp-1">
                                                                    {subtitle}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="col-span-1 text-center font-medium text-slate-600">
                                                            {item.present}
                                                        </div>
                                                        <div className="col-span-1 text-center text-slate-500">
                                                            {item.leaves}
                                                        </div>
                                                        <div className="col-span-1 text-center font-bold text-red-600 bg-red-50 py-1 rounded">
                                                            {item.absent}
                                                        </div>
                                                        <div className="col-span-2 text-center font-medium text-orange-600">
                                                            {item.missedCheckout}
                                                        </div>
                                                        <div className="col-span-3 text-right font-bold text-red-600 font-mono">
                                                            {item.shortfallMinutes > 0 ? `-${Math.floor(item.shortfallMinutes / 60)}h ${item.shortfallMinutes % 60}m` : '-'}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Pagination */}
                            <div className="flex justify-between items-center pt-4">
                                <Button variant="outline" size="sm" onClick={() => handlePageChange(page - 1)} disabled={page === 1 || loading}>Previous</Button>
                                <span className="text-xs text-slate-500">Page {page}</span>
                                <Button variant="outline" size="sm" onClick={() => handlePageChange(page + 1)} disabled={!hasMore || loading}>Next</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
            
            {/* PERFORMERS TAB */}
            <TabsContent value="performers">
                <Card className="border-t-4 border-t-emerald-500 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-emerald-800">Top Performers</CardTitle>
                        <CardDescription>
                            Employees demonstrating high dedication with consistent attendance and additional contribution for {format(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1), 'MMMM yyyy')}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="rounded-md border border-emerald-100 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <div className="min-w-[900px]">
                                        {/* Header */}
                                        <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-emerald-50/30 p-4 border-b border-emerald-100">
                                            <div className="col-span-1">#</div>
                                            <div className="col-span-3">Employee</div>
                                            <div className="col-span-1 text-center">Present</div>
                                            <div className="col-span-1 text-center">Leaves</div>
                                            <div className="col-span-1 text-center">Absent</div>
                                            <div className="col-span-2 text-center">Missed Out</div>
                                            <div className="col-span-3 text-right">Overtime</div>
                                        </div>

                                        {/* Rows */}
                                        {loading && page === 1 ? (
                                            <div className="flex justify-center py-12">
                                                <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                                            </div>
                                        ) : reportData.length === 0 ? (
                                            <div className="text-center py-12 text-slate-500">
                                                No data found.
                                            </div>
                                        ) : (
                                            reportData.map((item, index) => {
                                                const dept = item.user.department || '';
                                                const role = item.user.designation || item.user.role || '';
                                                const subtitle = dept && role && dept.toLowerCase() === role.toLowerCase() 
                                                    ? dept 
                                                    : [dept, role].filter(Boolean).join(' • ');

                                                return (
                                                    <div key={item.user.id} className="grid grid-cols-12 gap-4 items-center p-4 border-b border-emerald-50 hover:bg-emerald-50/30 transition-colors bg-white">
                                                        <div className="col-span-1 font-bold text-emerald-500">
                                                            #{((page - 1) * LIMIT) + index + 1}
                                                        </div>
                                                        <div className="col-span-3 flex items-center gap-3">
                                                            <Avatar className="h-10 w-10 bg-white">
                                                                <AvatarImage src={item.user.avatar_url || undefined} />
                                                                <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
                                                                    {item.user.full_name?.charAt(0)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <div className="font-semibold text-slate-900">{item.user.full_name}</div>
                                                                <div className="text-xs text-slate-500 line-clamp-1">
                                                                    {subtitle}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="col-span-1 text-center font-bold text-emerald-600 bg-emerald-50 py-1 rounded">
                                                            {item.present}
                                                        </div>
                                                        <div className="col-span-1 text-center text-slate-500">
                                                            {item.leaves}
                                                        </div>
                                                        <div className="col-span-1 text-center font-medium text-slate-400">
                                                            {item.absent}
                                                        </div>
                                                        <div className="col-span-2 text-center text-slate-400">
                                                            {item.missedCheckout}
                                                        </div>
                                                        <div className="col-span-3 text-right font-bold text-emerald-600 font-mono">
                                                            {item.overtimeMinutes > 0 ? `+${Math.floor(item.overtimeMinutes / 60)}h ${item.overtimeMinutes % 60}m` : '-'}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>

                             {/* Pagination */}
                            <div className="flex justify-between items-center pt-4">
                                <Button variant="outline" size="sm" onClick={() => handlePageChange(page - 1)} disabled={page === 1 || loading}>Previous</Button>
                                <span className="text-xs text-slate-500">Page {page}</span>
                                <Button variant="outline" size="sm" onClick={() => handlePageChange(page + 1)} disabled={!hasMore || loading}>Next</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
