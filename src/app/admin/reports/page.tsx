"use client";

import ExcelJS from 'exceljs';
import { supabase } from "@/utils/supabase/client";
import { Download, FileSpreadsheet, FileUser } from 'lucide-react';
import { toast } from "sonner";

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

  // Download State
  const [isDownloading, setIsDownloading] = useState(false);

  const generateDepartmentMatrix = async () => {
    if (!selectedDept || selectedDept === 'all') {
        toast.error("Please select a specific department for the Matrix Report");
        return;
    }

    setIsDownloading(true);
    try {
        const year = parseInt(selectedYear);
        const month = parseInt(selectedMonth);
        
        // Date Range: 1st to End of Month
        const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
        const lastDay = new Date(year, month, 0); 
        const endDate = format(lastDay, 'yyyy-MM-dd');
        const daysInMonth = lastDay.getDate();

        // 1. Fetch Users in Dept
        const { data: users, error: userError } = await supabase
            .from('profiles')
            .select('id, full_name, role, designation, department, work_config')
            .eq('department', selectedDept)
            .order('role'); // Role sort (admin<hr<manager<employee approx) - refine later if needed

        if (userError || !users) throw new Error("Failed to fetch users");

        // Custom Sort: Manager -> Employee
        const sortedUsers = users.sort((a: any, b: any) => {
             const roleScore = (r: string) => {
                 const role = r?.toLowerCase();
                 if (role === 'manager') return 1;
                 if (role === 'hr') return 2;
                 if (role === 'admin') return 0;
                 return 3; // employee
             };
             return roleScore(a.role) - roleScore(b.role);
        });

        const userIds = sortedUsers.map((u: any) => u.id);

        // 2. Fetch Attendance
        const { data: attendance } = await supabase
            .from('attendance')
            .select('user_id, date, status, check_in, check_out')
            .in('user_id', userIds)
            .gte('date', startDate)
            .lte('date', endDate);

        // 3. Fetch Leaves (Approved)
        const { data: leaves } = await supabase
            .from('leaves')
            .select('*')
            .in('user_id', userIds)
            .eq('status', 'approved')
            .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

        // 4. Fetch Department Leave Types for Colors and Paid Status
        const { data: leaveTypes } = await supabase
            .from('department_leave_limits')
            .select('leave_type, color, is_paid')
            .eq('department', selectedDept);

        // 5. Build Excel
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Muster Roll');

        // Styles
        const headerStyle = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } } } as any;
        const centerStyle = { alignment: { horizontal: 'center', vertical: 'middle' } } as any;
        const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } as any;

        // Colors
        // Base Colors
        const colorMap: Record<string, any> = {
            'P': { argb: 'FFDCFCE7' }, // Green-100
            'A': { argb: 'FFFEE2E2' }, // Red-100
            'R': { argb: 'FFCFFAFE' }, // Cyan-100
            'RG': { argb: 'FFFFEDD5' }, // Orange-100
            'WO': { argb: 'FFF1F5F9' }, // Slate-100
            'L': { argb: 'FFFEF9C3' }, // Default Yellow
            'HD': { argb: 'FFFFF7ED' }, // Orange-50 (Half Day)
        };

        // Enrich Color Map with Dynamic Types
        // Store Paid status logic
        const unpaidTypes = new Set<string>();

        if (leaveTypes) {
            leaveTypes.forEach((lt: any) => {
                // Generate a short code: First 2 letters UpperCase
                const code = lt.leave_type.substring(0, 2).toUpperCase();
                // Remove '#' from color if exists
                const hex = lt.color.replace('#', '');
                const argb = 'FF' + hex;
                colorMap[code] = { argb: argb };
                
                if (lt.is_paid === false) {
                    unpaidTypes.add(code);
                }
            });
        }

        // Title Rows
        sheet.mergeCells('A1:C1');
        sheet.getCell('A1').value = 'Attendance Muster Roll';
        sheet.getCell('A1').font = { size: 16, bold: true };
        
        sheet.mergeCells('A2:F2');
        sheet.getCell('A2').value = `${selectedDept} Department - ${format(new Date(year, month-1), 'MMMM yyyy')}  |  Total Employees: ${sortedUsers.length}`;

        // Header Row Construction
        // Columns: S. No., ID, Name, Designation, Role, 1..31, Pres, Abs, Leave, RG
        const dateCols: string[] = [];
        for(let i=1; i<=daysInMonth; i++) dateCols.push(i.toString().padStart(2, '0'));

        const headers = ['S. No.', 'ID', 'Employee Name', 'Designation', 'Role', ...dateCols, 'P', 'R', 'L', 'A', 'RG', 'EW'];
        const headerRow = sheet.addRow(headers);
        
        headerRow.eachCell((cell: any, colNumber: number) => {
            cell.style = { ...headerStyle, ...centerStyle, border: borderStyle };
            if (colNumber > 5 && colNumber <= 5 + daysInMonth) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }; // Darker for dates
            }
        });

        // Rows
        sortedUsers.forEach((user: any, index: number) => {
            const rowData: any[] = [
                index + 1,
                user.id.substring(0, 6).toUpperCase(),
                user.full_name,
                user.designation || '-',
                user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '-'
            ];

            let pCount = 0, rCount = 0, lCount = 0, aCount = 0, rgCount = 0, ewCount = 0;

            // Days
            for (let i = 1; i <= daysInMonth; i++) {
                const dateStr = format(new Date(year, month - 1, i), 'yyyy-MM-dd');
                const dateObj = new Date(dateStr);
                const dayOfWeek = dateObj.getDay(); // 0=Sun, 6=Sat

                // Find Record
                const record = attendance?.find((a: any) => a.user_id === user.id && a.date === dateStr);
                
                // Find Leave
                const leave = leaves?.find((l: any) => 
                    l.user_id === user.id && 
                    l.start_date <= dateStr && 
                    l.end_date >= dateStr
                );

                let code = '';
                let cellColor = null;

                // Priority Logic
                if (record?.status === 'present' || record?.status === 'available') {
                     // Check if Regularized via Leave Type 'Regularization'
                     const regLeave = leaves?.find((l: any) => 
                        l.user_id === user.id && 
                        l.start_date <= dateStr && 
                        l.end_date >= dateStr &&
                        l.type === 'Regularization'
                     );

                     if (regLeave || record.status === 'Regularization') {
                         code = 'RG';
                         cellColor = colorMap['RG'];
                         pCount++; 
                         rgCount++; // Explicit RG count
                     } else {
                         code = 'P';
                         cellColor = colorMap['P'];
                         pCount++;
                     }
                } else if (record?.status === 'remote') {
                    code = 'R';
                    cellColor = colorMap['R'];
                    rCount++;
                }
                // 3. Leaves (Dynamic)
                else if (leave) {
                    if (leave.type === 'Extra Working Day') {
                        code = 'EW';
                        cellColor = { argb: 'FF9333EA' }; // Purple
                        ewCount++;
                    } 
                    // Get config for this specific leave type
                    else {
                        const leaveConfig = leaveTypes?.find((lt: any) => lt.leave_type === leave.type);
                        const isPaid = leaveConfig ? leaveConfig.is_paid !== false : true; // Default to true if not found

                        if (leave.session && leave.session !== 'full_day') {
                            // Half Day Logic
                            // Check if THIS specific leave is paid/unpaid
                            if (!isPaid) {
                                lCount += 0.5; // Only count in 'Leave' column if unpaid
                                code = 'HD(U)';
                            } else {
                                code = 'HD';
                                // Paid Half Day - Do not count in 'Leave' (Unpaid) count
                                // Still present for other half, handled by pCount += 0.5 below
                            }
                            
                            pCount += 0.5; // Always present for half day
                            cellColor = colorMap['HD'];
                        } else {
                            // Full Day dynamic
                            const baseCode = leave.type.substring(0, 2).toUpperCase();
                            
                            // Check if Unpaid
                            if (!isPaid) {
                                code = `${baseCode}(U)`;
                                lCount += 1; // Count as Leave only if Unpaid
                            } else {
                                code = baseCode;
                            }

                            if (!colorMap[baseCode]) {
                                // Fallback
                                if (!isPaid) code = 'L(U)';
                                else code = 'L';
                                cellColor = colorMap['L'];
                            } else {
                                cellColor = colorMap[baseCode];
                            }
                        }
                    }
                }
                // 5. Dynamic Weekly Off (WO) Logic
                else {
                    // Check if it's a working day for THIS user
                    let isWorkingDay = true;
                    // Default to Mon-Fri (1-5) if no config, OR Sat/Sun off (0, 6)
                    // If work_config exists, use it.
                    
                    if (user.work_config) {
                        try {
                            const wc = typeof user.work_config === 'string' ? JSON.parse(user.work_config) : user.work_config;
                            
                            if (wc.mode === 'fixed' && wc.fixed?.work_days && Array.isArray(wc.fixed.work_days)) {
                                isWorkingDay = wc.fixed.work_days.includes(dayOfWeek);
                            } else if (wc.mode === 'flexible' && wc.flexible?.work_days && Array.isArray(wc.flexible.work_days)) {
                                 // Some flexible configs might have work days
                                 isWorkingDay = wc.flexible.work_days.includes(dayOfWeek);
                            } else {
                                // Default fallback if config exists but is empty/weird: Standard Weekend
                                isWorkingDay = dayOfWeek !== 0 && dayOfWeek !== 6; 
                            }
                        } catch (e) {
                             // Fallback on error
                             isWorkingDay = dayOfWeek !== 0 && dayOfWeek !== 6;
                        }
                    } else {
                        // No config -> Default to Standard Weekend Off (Sat, Sun)
                        isWorkingDay = dayOfWeek !== 0 && dayOfWeek !== 6;
                    }

                    if (!isWorkingDay) {
                         code = 'WO';
                         cellColor = colorMap['WO'];
                    } else {
                        // 6. Absent
                        if (new Date(dateStr) <= new Date()) {
                             code = 'A';
                             cellColor = colorMap['A'];
                             aCount++;
                        } else {
                            code = '-';
                        }
                    }
                }

                rowData.push(code);
            }

            // Summaries
            rowData.push(pCount, rCount, lCount, aCount, rgCount, ewCount);

            const excelRow = sheet.addRow(rowData);
            
            // Format Cells
            excelRow.eachCell((cell: any, colNum: number) => {
                cell.border = borderStyle;
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                
                if (colNum > 5 && colNum <= 5 + daysInMonth) {
                     const val = cell.value?.toString();
                     // Check if it's a dynamic code (remove (U))
                     if (val) {
                         const baseVal = val.replace('(U)', '');
                         if (colorMap[baseVal]) {
                             cell.fill = { type: 'pattern', pattern: 'solid', fgColor: colorMap[baseVal] };
                         } else if (val === 'EW') {
                             cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9333EA' } };
                         }
                     }
                }
            });
        });

        // --- LEGEND ---
        sheet.addRow([]); // Empty row
        
        const legendTitleRow = sheet.addRow(['Legend / Abbreviations:']);
        legendTitleRow.getCell(1).font = { bold: true };
        
        const legendItems = [
            ['P', 'Present'],
            ['A', 'Absent'],
            ['R', 'Remote Work'],
            ['RG', 'Regularized'],
            ['EW', 'Extra Working Day'],
            ['WO', 'Weekly Off'],
            ['HD', 'Half Day Leave (Paid)'],
            ['HD(U)', 'Half Day Leave (Unpaid)']
        ];
        
        // Add dynamic leave types to legend
        if (leaveTypes) {
             leaveTypes.forEach((lt: any) => {
                 const baseCode = lt.leave_type.substring(0, 2).toUpperCase();
                 const isUnpaid = lt.is_paid === false;
                 
                 const displayCode = isUnpaid ? `${baseCode}(U)` : baseCode;
                 const typeDescription = `${lt.leave_type} ${isUnpaid ? '(Unpaid)' : '(Paid)'}`;
                 
                 legendItems.push([displayCode, typeDescription]);
             });
        }

        legendItems.forEach(([code, desc]) => {
            const r = sheet.addRow([code, desc]);
            r.getCell(1).font = { bold: true };
            if (colorMap[code]) {
                 r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: colorMap[code] };
            }
        });

        // Widths
        sheet.getColumn(1).width = 10;
        sheet.getColumn(2).width = 25;
        sheet.getColumn(3).width = 18; // Designation
        sheet.getColumn(4).width = 12; // Role
        for(let i=5; i<=4+daysInMonth; i++) sheet.getColumn(i).width = 5; // Date cols narrow

        // Export
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${selectedDept}_Attendance_${format(new Date(year, month-1), 'MMM_yyyy')}.xlsx`;
        anchor.click();
        window.URL.revokeObjectURL(url);
        toast.success("Muster Roll downloaded");

    } catch (e: any) {
        console.error("Matrix Error", e);
        toast.error(e.message || "Download failed");
    } finally {
        setIsDownloading(false);
    }
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
            <TabsList className="bg-slate-100 p-1 rounded-lg w-full md:w-auto grid grid-cols-4 h-auto gap-2">
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
                <TabsTrigger 
                    value="downloads" 
                    className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm text-slate-500 py-2.5"
                >
                    Downloads
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


            {/* DOWNLOADS TAB */}
            <TabsContent value="downloads" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Department Matrix Card */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                                Department Muster Roll
                            </CardTitle>
                            <CardDescription>
                                Monthly attendance matrix for the entire {selectedDept === 'all' ? 'company' : 'department'}.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="bg-slate-50 p-4 rounded-md text-xs text-slate-500 mb-4 space-y-2">
                                <p><strong>Includes:</strong> P, A, CL, PL, RG</p>
                                <p><strong>Format:</strong> Color-coded Excel Matrix</p>
                                <p><strong>Sorted By:</strong> Role (Mgr &gt; Emp)</p>
                             </div>
                             <Button 
                                className="w-full bg-emerald-600 hover:bg-emerald-700" 
                                onClick={generateDepartmentMatrix}
                                disabled={isDownloading || selectedDept === 'all'}
                             >
                                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                Download Matrix
                             </Button>
                             {selectedDept === 'all' && <p className="text-[10px] text-red-500 mt-2 text-center">Select a department first</p>}
                        </CardContent>
                    </Card>

                    {/* Individual Report Card (Placeholder for now) */}
                    <Card className="hover:shadow-md transition-shadow opacity-60">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <FileUser className="h-5 w-5 text-blue-600" />
                                Individual Report
                            </CardTitle>
                            <CardDescription>
                                Detailed daily breakdown for a specific employee.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="bg-slate-50 p-4 rounded-md text-xs text-slate-500 mb-4">
                                <p>Coming Soon</p>
                             </div>
                             <Button variant="outline" className="w-full" disabled>
                                Select Employee
                             </Button>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
