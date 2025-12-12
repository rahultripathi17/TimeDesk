import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const department = searchParams.get("department");
    const name = searchParams.get("name");

    try {
        // Check if user is admin
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify admin role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (profile?.role !== 'admin' && profile?.role !== 'hr') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        let query = supabase
            .from("attendance")
            .select(`
            *,
        profiles:profiles!attendance_user_id_fkey!inner (
          id,
          full_name,
          department,
          email,
          avatar_url,
          role,
          designation,
          work_config
        )
        )
      `)
            .order("date", { ascending: false });

        if (startDate) {
            query = query.gte("date", startDate);
        }

        if (endDate) {
            query = query.lte("date", endDate);
        }

        if (department && department !== "all") {
            query = query.eq("profiles.department", department);
        }

        if (name) {
            query = query.ilike("profiles.full_name", `%${name}%`);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Supabase error:", error);
            throw error;
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Error fetching attendance:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error", details: error },
            { status: 500 }
        );
    }
}
