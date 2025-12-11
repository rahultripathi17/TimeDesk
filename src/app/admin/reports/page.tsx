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
import { Loader2, AlertTriangle, XCircle, Clock, CalendarDays, Users, TrendingUp, CalendarCheck, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";



import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip as RechartsTooltip, 
    ResponsiveContainer, 
    Cell,
    PieChart,
    Pie,
    Legend,
    Area,
    AreaChart,
} from 'recharts';


export default function AdminReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedDept, setSelectedDept] = useState("all");
  const [departments, setDepartments] = useState<string[]>([]);
  
  const [reportData, setReportData] = useState<any[]>([]);
  const [overviewData, setOverviewData] = useState<any>(null); 
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 10;

  const [activeTab, setActiveTab] = useState("overview"); 

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    // Reset when filters change
    if (activeTab === 'overview') {
        fetchOverview();
    } else {
        setPage(1);
        setReportData([]);
        setHasMore(true);
        fetchReport(1, true);
    }
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

  const fetchOverview = async () => {
      try {
          setLoading(true);
          const res = await fetch(`/api/admin/reports/analytics?month=${selectedMonth}&year=${selectedYear}`);
          const data = await res.json();
          if (data.error) {
              console.error("Analytics API Error:", data.error);
              setOverviewData(null);
          } else {
              setOverviewData(data);
          }
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
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

            {activeTab !== 'overview' && (
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
            )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-slate-100 p-1 rounded-lg w-full md:w-auto grid grid-cols-3 h-auto gap-2">
                <TabsTrigger 
                    value="overview" 
                    className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm text-slate-500 py-2.5"
                >
                    Company Overview
                </TabsTrigger>
                <TabsTrigger 
                    value="violators" 
                    className="data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm text-slate-500 py-2.5"
                >
                    Top Violators
                </TabsTrigger>
                <TabsTrigger 
                    value="performers" 
                    className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm text-slate-500 py-2.5"
                >
                    Top Performers
                </TabsTrigger>
            </TabsList>

            {/* OVERVIEW DASHBOARD */}
            <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {loading || !overviewData?.kpi ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
                    </div>
                ) : (
                    <>
                        {/* Row 1: KPI Cards */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card className="border-t-4 border-t-blue-500 shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-slate-500">Total Employees</CardTitle>
                                    <Users className="h-4 w-4 text-blue-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-slate-800">{overviewData?.kpi?.totalEmployees}</div>
                                    <p className="text-xs text-slate-500">Active personnel tracked</p>
                                </CardContent>
                            </Card>
                            <Card className="border-t-4 border-t-emerald-500 shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-slate-500">Attendance Rate</CardTitle>
                                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-slate-800">{overviewData?.kpi?.avgAttendanceRate}%</div>
                                    <p className="text-xs text-slate-500">Avg daily presence</p>
                                </CardContent>
                            </Card>
                            <Card className="border-t-4 border-t-amber-500 shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-slate-500">On-Time Arrival</CardTitle>
                                    <Clock className="h-4 w-4 text-amber-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-slate-800">{overviewData?.kpi?.onTimeRate}%</div>
                                    <p className="text-xs text-slate-500">Arrivals before 9:30 AM</p>
                                </CardContent>
                            </Card>
                            <Card className="border-t-4 border-t-violet-500 shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-slate-500">Total Leaves</CardTitle>
                                    <CalendarCheck className="h-4 w-4 text-violet-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-slate-800">{overviewData?.kpi?.totalLeaves}</div>
                                    <p className="text-xs text-slate-500">Approved leave days taken</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Row 2: Pie Charts */}
                        <div className="grid gap-4 md:grid-cols-2"> 
                            {/* Attendance Distribution */}
                            <Card className="shadow-sm">
                                <CardHeader>
                                    <CardTitle>Attendance Status Distribution</CardTitle>
                                    <CardDescription>Breakdown of attendance status</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px] w-full flex justify-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={overviewData.statusDistribution}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                >
                                                    {overviewData.statusDistribution.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                                    ))}
                                                </Pie>
                                                 {/* Custom Tooltip */}
                                                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                <Legend verticalAlign="bottom" height={36}/>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                             {/* Leave Analysis */}
                             <Card className="shadow-sm">
                                <CardHeader>
                                    <CardTitle>Leave Type Analysis</CardTitle>
                                    <CardDescription>Distribution of approved leaves by category</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px] w-full flex justify-center text-center items-center">
                                        {overviewData.leaveDistribution.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={overviewData.leaveDistribution}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={40}
                                                        outerRadius={100}
                                                        paddingAngle={2}
                                                        dataKey="value"
                                                        label={({name, percent}) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                                    >
                                                        {overviewData.leaveDistribution.map((entry: any, index: number) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip contentStyle={{ borderRadius: '8px' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                                <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                                                <p>No leaves recorded this month</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Row 3: Trends & Depts */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                            
                            {/* Daily Trend Chart - Wavestyle Stacked */}
                            <Card className="col-span-4 shadow-sm">
                                <CardHeader>
                                    <CardTitle>Daily Attendance Trends</CardTitle>
                                    <CardDescription>Reflecting workforce presence, late arrivals, and leaves</CardDescription>
                                </CardHeader>
                                <CardContent className="pl-2">
                                    <div className="h-[350px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={overviewData.dailyTrend}>
                                                <defs>
                                                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                                                    </linearGradient>
                                                    <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                                                    </linearGradient>
                                                    <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                                                    </linearGradient>
                                                    <linearGradient id="colorLeave" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                                <RechartsTooltip contentStyle={{ borderRadius: '8px' }} />
                                                <Legend verticalAlign="top" height={36}/>
                                                <Area type="monotone" dataKey="present" stackId="1" stroke="#10b981" fill="url(#colorPresent)" name="On Time" />
                                                <Area type="monotone" dataKey="late" stackId="1" stroke="#f59e0b" fill="url(#colorLate)" name="Late" />
                                                <Area type="monotone" dataKey="absent" stackId="1" stroke="#ef4444" fill="url(#colorAbsent)" name="Absent" />
                                                <Area type="monotone" dataKey="leave" stackId="1" stroke="#3b82f6" fill="url(#colorLeave)" name="On Leave" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Dept Performance List - Custom Rank UI */}
                            <Card className="col-span-3 shadow-sm">
                                <CardHeader>
                                    <CardTitle>Department Leaderboard</CardTitle>
                                    <CardDescription>Top departments by compliance score</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-6 h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                        {overviewData.deptPerformance.map((dept: any, index: number) => (
                                            <div key={dept.name} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                                <div className="flex items-center space-x-4">
                                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm shrink-0
                                                        ${index === 0 ? 'bg-yellow-100 text-yellow-600' : 
                                                          index === 1 ? 'bg-slate-100 text-slate-600' : 
                                                          index === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'}`}>
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-700">{dept.name}</p>
                                                        <p className="text-xs text-slate-500">Attendance Score</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-lg font-bold ${dept.attendanceRate >= 80 ? 'text-emerald-600' : dept.attendanceRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                                        {dept.attendanceRate}%
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        {overviewData.deptPerformance.length === 0 && (
                                            <div className="text-center text-slate-400 py-8">No Department Data</div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )}
            </TabsContent>

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
