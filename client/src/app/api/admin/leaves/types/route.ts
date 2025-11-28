import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const department = searchParams.get("department");

    try {
        let query = supabase
            .from('department_leave_limits')
            .select('leave_type, color, department');

        if (department && department !== 'all') {
            query = query.eq('department', department);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching leave types:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // If no specific types found for department (or all), return unique types
        // We might want to aggregate if 'all' is selected, or just return all unique types across all departments

        // Deduplicate by leave_type if 'all' is selected or multiple entries exist
        const uniqueTypes = Array.from(new Map(data.map(item => [item.leave_type, item])).values());

        return NextResponse.json(uniqueTypes);

    } catch (error: any) {
        console.error("Internal Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
