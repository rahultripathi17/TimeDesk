import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, type, startDate, endDate, reason, approverId, session } = body;

        if (!userId || !type || !startDate || !endDate) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Get User's Department and Role
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('department, role')
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
        }

        const department = profile.department;
        const isAdmin = profile.role === 'admin';

        // Calculate requested days
        let requestedDays = 0;
        let finalSession = 'full_day';

        if (type === 'Half Day') {
            requestedDays = 0.5;
            finalSession = session || 'first_half'; // Default to first half if missing

            // Validate session
            if (!['first_half', 'second_half'].includes(finalSession)) {
                return NextResponse.json({ error: 'Invalid session for Half Day leave' }, { status: 400 });
            }
        } else {
            const start = new Date(startDate);
            const end = new Date(endDate);
            requestedDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        }

        // 3. Check for Overlapping Leaves (Prevent Duplicate Requests)
        const { data: overlappingLeaves, error: overlapError } = await supabaseAdmin
            .from('leaves')
            .select('id, start_date, end_date, status')
            .eq('user_id', userId)
            .neq('status', 'rejected') // Check both pending and approved
            .lte('start_date', endDate) // Overlap logic: Start <= NewEnd
            .gte('end_date', startDate); // Overlap logic: End >= NewStart

        if (overlapError) throw overlapError;

        if (overlappingLeaves && overlappingLeaves.length > 0) {
            const hasApproved = overlappingLeaves.some(l => l.status === 'approved');
            
            if (hasApproved) {
                return NextResponse.json({
                    error: "That day leave is already approved. You can't apply. Contact admin."
                }, { status: 400 });
            } else {
                return NextResponse.json({
                    error: "You already have a leave request for this date. Please cancel it to proceed."
                }, { status: 400 });
            }
        }

        if (department) {
            // 2. Get Leave Limit for Department & Type
            const { data: limitData, error: limitError } = await supabaseAdmin
                .from('department_leave_limits')
                .select('limit_days')
                .eq('department', department)
                .eq('leave_type', type)
                .single();

            if (limitData) {
                const maxDays = limitData.limit_days;

                // 4. Calculate used/pending days in current year/cycle
                const { data: resetData } = await supabaseAdmin
                    .from('system_settings')
                    .select('value')
                    .eq('key', 'leave_reset_date')
                    .single();

                const startDate = resetData?.value || `${new Date().getFullYear()}-01-01`;
                const endDate = `${new Date().getFullYear()}-12-31`;

                const { data: existingLeaves, error: leavesError } = await supabaseAdmin
                    .from('leaves')
                    .select('start_date, end_date, duration')
                    .eq('user_id', userId)
                    .eq('type', type)
                    .neq('status', 'rejected') // Count pending and approved
                    .gt('start_date', startDate) // Strictly after reset date to match balance logic
                    .lte('end_date', endDate);

                if (leavesError) throw leavesError;

                let usedDays = 0;
                existingLeaves?.forEach((leave: any) => {
                    if (leave.duration) {
                        usedDays += Number(leave.duration);
                    } else {
                        const lStart = new Date(leave.start_date);
                        const lEnd = new Date(leave.end_date);
                        usedDays += Math.ceil((lEnd.getTime() - lStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    }
                });

                if (usedDays + requestedDays > maxDays) {
                    return NextResponse.json({
                        error: `Leave limit exceeded. You have used ${usedDays} of ${maxDays} ${type} leaves. Requesting ${requestedDays} days would exceed the limit.`
                    }, { status: 400 });
                }
            }
        }

        // 5. Insert Leave Request
        // If Admin, auto-approve
        const status = isAdmin ? 'approved' : 'pending';
        // If Admin, they approve themselves (or system approves)
        const finalApproverId = isAdmin ? userId : approverId;

        const { data, error } = await supabaseAdmin
            .from('leaves')
            .insert({
                user_id: userId,
                type,
                start_date: startDate,
                end_date: endDate,
                reason,
                approver_id: finalApproverId,
                status,
                duration: requestedDays,
                session: finalSession
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Error submitting leave:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const userId = searchParams.get('userId');

        if (!id || !userId) {
            return NextResponse.json({ error: 'Missing id or userId' }, { status: 400 });
        }

        // Verify ownership and status
        const { data: leave, error: fetchError } = await supabaseAdmin
            .from('leaves')
            .select('user_id, status')
            .eq('id', id)
            .single();

        if (fetchError || !leave) {
            return NextResponse.json({ error: 'Leave not found' }, { status: 404 });
        }

        if (leave.user_id !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        if (leave.status !== 'pending') {
            return NextResponse.json({ error: 'Only pending leaves can be cancelled' }, { status: 400 });
        }

        // Delete
        const { error: deleteError } = await supabaseAdmin
            .from('leaves')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error deleting leave:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
