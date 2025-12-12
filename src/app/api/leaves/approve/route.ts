import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { eachDayOfInterval, format, parseISO } from "date-fns";

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const { leaveId, status, approverId } = await req.json();

        if (!leaveId || !status || !approverId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Fetch the leave details first
        const { data: leave, error: fetchError } = await supabaseAdmin
            .from('leaves')
            .select('*')
            .eq('id', leaveId)
            .single();

        if (fetchError || !leave) {
            return NextResponse.json({ error: "Leave not found" }, { status: 404 });
        }

        // 2. Update the leave status
        const { error: updateError } = await supabaseAdmin
            .from('leaves')
            .update({ status })
            .eq('id', leaveId);

        if (updateError) {
            return NextResponse.json({ error: "Failed to update leave status" }, { status: 500 });
        }

        // 3. If Approved, update Attendance table
        if (status === 'approved') {
            const startDate = parseISO(leave.start_date);
            const endDate = parseISO(leave.end_date);
            const userId = leave.user_id;

            // SPECIAL HANDLING FOR REGULARIZATION
            if (leave.type === 'Regularization') {
                try {
                    // Start date is the regularization date (single day usually)
                    const dateStr = format(startDate, 'yyyy-MM-dd');
                    
                    // Parse Reason JSON
                    const details = JSON.parse(leave.reason);
                    const { checkIn, checkOut } = details;

                    if (checkIn && checkOut) {
                         // Construct Timestamps
                        const checkInTime = new Date(`${dateStr}T${checkIn}:00`);
                        const checkOutTime = new Date(`${dateStr}T${checkOut}:00`);

                        // Upsert attendance as PRESENT ('available')
                        const { error: regError } = await supabaseAdmin
                            .from('attendance')
                            .upsert({
                                user_id: userId,
                                date: dateStr,
                                status: 'available', // Mark as Present
                                check_in: checkInTime.toISOString(),
                                check_out: checkOutTime.toISOString()
                            }, { onConflict: 'user_id, date' });

                         if (regError) console.error("Error regularizing attendance:", regError);
                    }
                } catch (e) {
                    console.error("Failed to parse regularization details", e);
                }
            } else {
                // NORMAL LEAVE LOGIC
                // Get all dates in the range
                const dates = eachDayOfInterval({ start: startDate, end: endDate });

                // Prepare upsert data
                const attendanceUpdates = dates.map(date => ({
                    user_id: userId,
                    date: format(date, 'yyyy-MM-dd'),
                    status: 'leave',
                    // We don't set check_in/check_out for leaves
                }));

                // Upsert into attendance table
                const { error: attendanceError } = await supabaseAdmin
                    .from('attendance')
                    .upsert(attendanceUpdates, { onConflict: 'user_id, date' });

                if (attendanceError) {
                    console.error("Error updating attendance:", attendanceError);
                }
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Error processing leave approval:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
