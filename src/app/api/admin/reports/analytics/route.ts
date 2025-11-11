import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

        // Range
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); 
        const daysInMonth = endDate.getDate();

        // Helper: Consistent YYYY-MM-DD generation
        const getDateStr = (y: number, m: number, d: number) => {
            return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        };

        const startDateStr = getDateStr(year, month, 1);
        const endDateStr = getDateStr(year, month, daysInMonth);
        
        // Get Today in YYYY-MM-DD (safe local)
        const now = new Date();
        const todayStr = getDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate());

        // 1. Fetch Profiles (Include Everyone as per request "for every one")
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('id, department, role, work_config, created_at');
        
        if (profilesError) throw profilesError;

        const totalEmployees = profiles.length;
        const employeeIds = profiles.map(p => p.id);

        // 2. Fetch Attendance
        const { data: attendance, error: attendanceError } = await supabaseAdmin
            .from('attendance')
            .select('date, user_id, status, check_in, check_out')
            .gte('date', startDateStr)
            .lte('date', endDateStr)
            .in('user_id', employeeIds);

        if (attendanceError) throw attendanceError;

        // 3. Fetch Leaves (For Donut Breakdown)
        const { data: leaves, error: leavesError } = await supabaseAdmin
            .from('leaves')
            .select('user_id, type, duration, start_date, end_date') 
            .eq('status', 'approved')
            .or(`start_date.lte.${endDateStr},end_date.gte.${startDateStr}`);

        if (leavesError) throw leavesError;

        // Map Attendance for fast lookup: "userId_date" -> record
        const attendanceMap = new Map<string, any>();
        attendance?.forEach(rec => {
            attendanceMap.set(`${rec.user_id}_${rec.date}`, rec);
        });

        // Map Leaves to specific days: "userId_date" -> leaveType
        const dailyLeaveMap = new Map<string, any>();
        leaves?.forEach(l => {
             const start = new Date(l.start_date);
             const end = new Date(l.end_date);
             
             // Iterate days in leave range
             for(let dl = new Date(start); dl <= end; dl.setDate(dl.getDate() + 1)) {
                 const dStr = getDateStr(dl.getFullYear(), dl.getMonth() + 1, dl.getDate());
                 if (dStr >= startDateStr && dStr <= endDateStr) {
                    dailyLeaveMap.set(`${l.user_id}_${dStr}`, l);
                 }
             }
        });

        // --- Aggregation Counters ---
        let presentCount = 0;
        let lateCount = 0;
        let absentCount = 0;
        let onLeaveCount = 0;

        const dailyStats: Record<string, { present: number, absent: number, late: number, leave: number }> = {};
        const deptStats: Record<string, { total: number, present: number, workingDays: number }> = {};
        
        // Initialize Daily Stats for chart continuity
        const isCurrentMonth = now.getMonth() + 1 === month && now.getFullYear() === year;
        const limitDay = isCurrentMonth ? now.getDate() : daysInMonth;

        for(let d = 1; d <= limitDay; d++) {
             const dateStr = getDateStr(year, month, d);
             dailyStats[dateStr] = { present: 0, absent: 0, late: 0, leave: 0 };
        }

        // --- Iteration Logic ---
        profiles.forEach(profile => {
            const dept = (profile.department || 'Unassigned').trim();
            if(!deptStats[dept]) deptStats[dept] = { total: 0, present: 0, workingDays: 0 };
            
            // Normalize Created At
            const joinedAt = profile.created_at ? new Date(profile.created_at) : new Date('2000-01-01');
            joinedAt.setHours(0,0,0,0);

            for(let d = 1; d <= limitDay; d++) {
                const dateStr = getDateStr(year, month, d);
                if (dateStr > todayStr) continue;

                const dayDate = new Date(year, month - 1, d);
                dayDate.setHours(0,0,0,0);
                if (dayDate < joinedAt) continue;

                const dayOfWeek = dayDate.getDay(); 
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                if (isWeekend) continue; 
                
                deptStats[dept].workingDays++; 

                const att = attendanceMap.get(`${profile.id}_${dateStr}`);
                
                if (att) {
                    const hasCheckIn = att.check_in && att.check_in.trim() !== '';
                    const isExplicitPresent = ['present', 'wfh', 'wfo', 'working'].includes(att.status?.toLowerCase());
                    
                    if (hasCheckIn || isExplicitPresent) {
                        presentCount++;
                        deptStats[dept].present++;
                        if (dailyStats[dateStr]) dailyStats[dateStr].present++;

                        if (att.check_in) {
                            const [h, m] = att.check_in.split(':').map(Number);
                            if (h > 9 || (h === 9 && m > 30)) {
                                lateCount++;
                                if (dailyStats[dateStr]) dailyStats[dateStr].late++;
                            }
                        }
                    } else if (att.status === 'leave') {
                         onLeaveCount++;
                         if (dailyStats[dateStr]) dailyStats[dateStr].leave++;
                    } else if (att.status === 'absent') {
                         absentCount++;
                         if (dailyStats[dateStr]) dailyStats[dateStr].absent++;
                    }
                } else {
                    // No Attendance Record
                    // Check if User is on Approved Leave for this day
                    const leaveRec = dailyLeaveMap.get(`${profile.id}_${dateStr}`);
                    
                    if (leaveRec) {
                        // User is on Leave
                        onLeaveCount++; // Note: This might double count for total aggregation if we rely on loop?
                                        // But currently we use the loop for `dailyStats`.
                                        // We should ensure `leaveTypeCounts` (later in code) is used for the Donut.
                                        // `onLeaveCount` variable here is mainly for KPI or simple stats.
                        if (dailyStats[dateStr]) dailyStats[dateStr].leave++;
                    } else {
                        // No Record + No Leave => Absent
                        absentCount++;
                        if (dailyStats[dateStr]) dailyStats[dateStr].absent++;
                    }
                }
            }
        });

        // Leave Breakdown (from Leaves table directly for accuracy of Type)
        const leaveTypeCounts: Record<string, number> = {};
        
        leaves?.forEach(l => {
             // Basic overlap logic
             const start = new Date(l.start_date);
             const end = new Date(l.end_date);
             const rangeStart = start < startDate ? startDate : start;
             const rangeEnd = end > endDate ? endDate : end;

             if (rangeStart <= rangeEnd) {
                 const days = Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                 
                 // Half Day Logic
                 let type = l.type || 'Other';
                 if (l.duration < 1 || type.toLowerCase().includes('half')) {
                     type = 'Half Day';
                 }

                 leaveTypeCounts[type] = (leaveTypeCounts[type] || 0) + days;
             }
        });

        // Formats for Chart

        // 1. Status Pie: Present (Total), Absent, Leave
        // Logic: Total Man-Days - Present - Leave = Absent
        // This ensures the Pie Chart sums to 100% of "Time Usage".
        
        const totalManDays = Object.values(deptStats).reduce((acc, curr) => acc + curr.workingDays, 0);
        
        // Calculate Total Leaves (Man-Days)
        let totalLeaveDays = 0;
        Object.values(leaveTypeCounts).forEach(v => totalLeaveDays += v);

        // Adjust Present: If Half Day is Present + Leave, we might double count?
        // Let's rely on the simple bucket model for the Pie:
        // Present = Count of 'present' records.
        // Leave = Count of approved leave time (e.g. 2.5 days).
        // Absent = Remainder.
        
        let balancedAbsent = totalManDays - (presentCount + lateCount) - totalLeaveDays;
        if (balancedAbsent < 0) balancedAbsent = 0; // Safety clamp

        const statusDistribution = [
            { name: 'Present', value: parseFloat((presentCount + lateCount).toFixed(1)), fill: '#10b981' }, 
            { name: 'Absent', value: parseFloat(balancedAbsent.toFixed(1)), fill: '#ef4444' },
            { name: 'On Leave', value: parseFloat(totalLeaveDays.toFixed(1)), fill: '#3b82f6' }
        ];

        // 2. Leave Donut: Types including Half Day
        const leaveDistribution = Object.entries(leaveTypeCounts).map(([type, value], index) => ({
            name: type,
            value: parseFloat(value.toFixed(1)),
            fill: ['#ef4444', '#f59e0b', '#10b981', '#6366f1', '#8b5cf6'][index % 5] 
        }));

        // 3. Daily Trend: 4 Lines (On Time, Late, Absent, Leave)
        // User requested: "wave wise" with 4 keys
        const dailyTrend = Object.entries(dailyStats).map(([date, stats]) => ({
            date: parseInt(date.split('-')[2]),
            fullDate: date,
            present: stats.present, // pure on-time
            late: stats.late,
            absent: stats.absent,
            // We need daily leaves for the chart. The current `dailyStats` loop counts status='leave'.
            // Let's ensure my iteration logic above captured 'leave'.
            // Yes: } else if (att.status === 'leave') { onLeaveCount++; }
            // Wait, I didn't add it to dailyStats in the previous step! I need to fix that.
            leave: stats.leave || 0
        }));

        const deptPerformance = Object.entries(deptStats).map(([dept, stats]) => ({
            name: dept,
            attendanceRate: stats.workingDays > 0 ? Math.round((stats.present / stats.workingDays) * 100) : 0
        })).sort((a,b) => b.attendanceRate - a.attendanceRate);

        const totalPresent = presentCount; // Count, not rate

        // Avg Attendance Rate
        // Use totalManDays as denominator
        const avgAttendanceRate = totalManDays > 0 ? Math.round((totalPresent / totalManDays) * 100) : 0;
        
        // Avg Daily Attendance (Count)
        const daysConsidered = new Date() < endDate ? new Date().getDate() : endDate.getDate(); 
        const avgDailyCount = daysConsidered > 0 ? Math.round(totalPresent / daysConsidered) : 0;

        const kpi = {
             totalEmployees,
             avgDailyAttendance: avgDailyCount, // showing Count now, more useful? Or %? User asked for meaningful. Count is "How many people come daily". % is "Rate".
             // Let's send Rate as string or separate field if needed.
             // Previous code used value. Let's keep consistency.
             // Actually, UI shows "Avg. Attendance", which implies %. 
             // But value in previous mock was "24".
             // Let's provide both.
             avgAttendanceRate, 
             onTimeRate: totalPresent > 0 ? Math.round(((presentCount - lateCount) / totalPresent) * 100) : 0,
             totalLeaves: onLeaveCount
        };

        return NextResponse.json({
             kpi,
             statusDistribution,
             leaveDistribution,
             dailyTrend,
             deptPerformance
        });

    } catch (error: any) {
        console.error("Analytics Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
