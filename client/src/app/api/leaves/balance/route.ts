import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        // 1. Get Current User if not provided
        let targetUserId = userId;
        if (!targetUserId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            targetUserId = user.id;
        }

        // 2. Get User Profile to find Department
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("department")
            .eq("id", targetUserId)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        const department = profile.department;
        if (!department) {
            return NextResponse.json({ balances: [] }); // No department, no limits
        }

        // 3. Get Leave Limits for Department
        const { data: limits, error: limitsError } = await supabase
            .from("department_leave_limits")
            .select("leave_type, limit_days")
            .eq("department", department);

        if (limitsError) {
            throw limitsError;
        }

        // 4. Get Approved Leaves for User (Current Year)
        const currentYear = new Date().getFullYear();
        const startDate = `${currentYear}-01-01`;
        const endDate = `${currentYear}-12-31`;

        const { data: leaves, error: leavesError } = await supabase
            .from("leaves")
            .select("type, start_date, end_date")
            .eq("user_id", targetUserId)
            .eq("status", "approved")
            .gte("start_date", startDate)
            .lte("end_date", endDate);

        if (leavesError) {
            throw leavesError;
        }

        // 5. Calculate Used Days per Type
        const usedMap: Record<string, number> = {};

        if (leaves) {
            leaves.forEach((leave: { type: string; start_date: string; end_date: string }) => {
                const start = new Date(leave.start_date);
                const end = new Date(leave.end_date);
                // Calculate difference in days (inclusive)
                const diffTime = Math.abs(end.getTime() - start.getTime());
                const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                usedMap[leave.type] = (usedMap[leave.type] || 0) + days;
            });
        }

        // 6. Construct Response
        const balances = limits.map((limit: { leave_type: string; limit_days: number }) => {
            const used = usedMap[limit.leave_type] || 0;
            return {
                leave_type: limit.leave_type,
                limit: limit.limit_days,
                used: used,
                remaining: Math.max(0, limit.limit_days - used)
            };
        });

        return NextResponse.json({ balances });

    } catch (error: any) {
        console.error("Error fetching leave balance:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
