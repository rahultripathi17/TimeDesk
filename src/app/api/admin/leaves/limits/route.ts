import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const department = searchParams.get('department');

        if (!department) {
            return NextResponse.json({ error: 'Department is required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('department_leave_limits')
            .select('*')
            .eq('department', department);

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error fetching leave limits:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { department, limits } = body; // limits: [{ leave_type: 'Sick', limit_days: 10 }, ...]

        if (!department || !Array.isArray(limits)) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        // 1. Get existing types for this department
        const { data: existingData } = await supabaseAdmin
            .from('department_leave_limits')
            .select('leave_type')
            .eq('department', department);

        const existingTypes = existingData?.map((d: any) => d.leave_type) || [];
        const newTypes = limits.map((l: any) => l.leave_type);

        // 2. Find types to delete
        const typesToDelete = existingTypes.filter((t: string) => !newTypes.includes(t));

        if (typesToDelete.length > 0) {
            await supabaseAdmin
                .from('department_leave_limits')
                .delete()
                .eq('department', department)
                .in('leave_type', typesToDelete);
        }

        // 3. Upsert limits
        const upsertData = limits.map((limit: any) => ({
            department,
            leave_type: limit.leave_type,
            limit_days: limit.limit_days,
            color: limit.color,
            is_paid: limit.is_paid
        }));

        if (upsertData.length > 0) {
            const { data, error } = await supabaseAdmin
                .from('department_leave_limits')
                .upsert(upsertData, { onConflict: 'department, leave_type' })
                .select();

            if (error) throw error;
            return NextResponse.json(data);
        }

        return NextResponse.json({ message: 'Limits updated successfully' });
    } catch (error: any) {
        console.error('Error saving leave limits:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
