import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Service role client to bypass RLS and fetch all user data
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
        const limit = parseInt(searchParams.get('limit') || '25');
        const page = parseInt(searchParams.get('page') || '1');
        const type = searchParams.get('type') || 'violators';
        const department = searchParams.get('department');

        // Calculate Date Range
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // Last day of month
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        const todayStr = new Date().toISOString().split('T')[0];
        let profilesQuery = supabaseAdmin
            .from('profiles')
            .select('id, full_name, department, avatar_url, role, designation, work_config')
            .neq('role', 'admin')
            .order('full_name');
        
        if (department && department !== 'all') {
            profilesQuery = profilesQuery.eq('department', department);
        }

        const { data: profiles, error: profilesError } = await profilesQuery;

        if (profilesError) throw profilesError;

        // 2. Fetch Attendance
        let attendanceQuery = supabaseAdmin
            .from('attendance')
            .select('user_id, status, check_in, check_out, date, deviation_minutes')
            .gte('date', startDateStr)
            .lte('date', endDateStr);
        
        // Optimization: In a real app we might filter attendance by users found, 
        // but for <1000 records valid to fetch all and filter in memory.
        const { data: attendance, error: attendanceError } = await attendanceQuery;

        if (attendanceError) throw attendanceError;

        // 3. Fetch Leaves
        const { data: leaves, error: leavesError } = await supabaseAdmin
            .from('leaves')
            .select('user_id, duration, start_date, end_date')
            .eq('status', 'approved')
            .or(`start_date.lte.${endDateStr},end_date.gte.${startDateStr}`);

        if (leavesError) throw leavesError;

        // 4. PRE-PROCESS DATA MAPS
        const attendanceMap = new Map<string, any>(); // "userId_date" -> record
        attendance?.forEach(rec => {
            if (rec.status !== 'absent') { // Only map actual presence
                 attendanceMap.set(`${rec.user_id}_${rec.date}`, rec);
            }
        });

        const leaveMap = new Map<string, Set<string>>(); // userId -> Set(dates)
        leaves?.forEach(l => {
            if (!leaveMap.has(l.user_id)) leaveMap.set(l.user_id, new Set());
            const days = leaveMap.get(l.user_id)!;
            
            const current = new Date(l.start_date);
            const end = new Date(l.end_date);
            while (current <= end) {
                days.add(current.toISOString().split('T')[0]);
                current.setDate(current.getDate() + 1);
            }
        });

        // 5. AGGREGATION PER USER
        const limitDate = new Date() < endDate ? new Date() : endDate;

        const report = profiles.map(profile => {
             const stats = {
                user: profile,
                leaves: 0,
                absent: 0,
                missedCheckout: 0,
                present: 0,
                overtimeMinutes: 0,
                shortfallMinutes: 0,
                totalScore: 0
            };

            // Parse Work Config
            const config = profile.work_config || {};
            let expectedDailyMinutes = 540; // Default 9 hours
            let workDays = [1, 2, 3, 4, 5]; // Default Mon-Fri

            if (config.mode === 'flexible' && config.flexible?.daily_hours) {
                expectedDailyMinutes = config.flexible.daily_hours * 60;
                if (config.flexible.work_days) workDays = config.flexible.work_days;
            } else if (config.fixed?.start_time && config.fixed?.end_time) {
                 const [sh, sm] = config.fixed.start_time.split(':').map(Number);
                 const [eh, em] = config.fixed.end_time.split(':').map(Number);
                 expectedDailyMinutes = (eh * 60 + em) - (sh * 60 + sm);
                 if (config.fixed.work_days) workDays = config.fixed.work_days;
            }

            // Iterate Dates
            const loopDate = new Date(startDate);
            while (loopDate <= limitDate) {
                const dateStr = loopDate.toISOString().split('T')[0];
                const dayOfWeek = loopDate.getDay(); // 0=Sun, 6=Sat

                // Only check if it's a working day for this user
                if (workDays.includes(dayOfWeek)) {
                    const isLeave = leaveMap.get(profile.id)?.has(dateStr);
                    const attRecord = attendanceMap.get(`${profile.id}_${dateStr}`);

                    if (isLeave) {
                        // User on Leave: No expectation
                        if (dateStr >= startDateStr && dateStr <= endDateStr) {
                             stats.leaves += 1; // Simplistic day count
                        }
                    } else if (attRecord) {
                        // User Present
                        stats.present += 1;
                        
                        // Use stored deviation (Worked - Expected)
                        if (attRecord.check_in && !attRecord.check_out && dateStr < todayStr) {
                             stats.missedCheckout += 1;
                             // User Request: Missed checkout = 0 shortfall, 0 overtime (Neutral)
                        } else if (typeof attRecord.deviation_minutes === 'number') {
                             if (attRecord.deviation_minutes > 0) {
                                 stats.overtimeMinutes += attRecord.deviation_minutes;
                             } else {
                                 stats.shortfallMinutes += Math.abs(attRecord.deviation_minutes);
                             }
                        }
                    } else {
                        // User Absent (No record, No leave, Working Day)
                        if (dateStr < todayStr) {
                            stats.absent += 1;
                            stats.shortfallMinutes += expectedDailyMinutes; // Full day lost
                        }
                    }
                }

                loopDate.setDate(loopDate.getDate() + 1);
            }

            // Calculate Score
            const shortfallHours = stats.shortfallMinutes / 60;
            // Violation Score (Higher is Worse)
            stats.totalScore = (stats.absent * 3) + (stats.missedCheckout * 1) + (stats.leaves * 0.5) + (shortfallHours * 0.5);

            return stats;
        });

        // 6. SORT based on TYPE
        if (type === 'performers') {
            // Rank: High Present -> Low Absent -> Low Leaves -> Low Missed -> High Overtime
            report.sort((a, b) => {
                if (b.present !== a.present) return b.present - a.present; // Highest Present first
                if (a.absent !== b.absent) return a.absent - b.absent; // Lowest Absent next
                if (a.leaves !== b.leaves) return a.leaves - b.leaves; // Lowest Leaves next
                if (a.missedCheckout !== b.missedCheckout) return a.missedCheckout - b.missedCheckout; // Lowest MissedOut next
                return b.overtimeMinutes - a.overtimeMinutes; // Highest Overtime last
            });
        } else {
            // Rank: High Absent -> High Shortfall -> High Missed -> Fallback Score
            report.sort((a, b) => {
                 if (b.absent !== a.absent) return b.absent - a.absent; // Highest Absent first
                 if (b.shortfallMinutes !== a.shortfallMinutes) return b.shortfallMinutes - a.shortfallMinutes; // Highest Shortfall next
                 if (b.missedCheckout !== a.missedCheckout) return b.missedCheckout - a.missedCheckout; // Highest MissedOut next
                 return b.totalScore - a.totalScore; // Fallback
            });
        }

        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedData = report.slice(startIndex, endIndex);

        return NextResponse.json({
            data: paginatedData,
            meta: {
                total: report.length,
                page,
                limit,
                month,
                year,
                type
            }
        });

    } catch (error: any) {
        console.error('Report Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
