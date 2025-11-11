import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Service role client to bypass potential RLS restricted views if needed, 
// though 'profiles' should be viewable. Admin view is safer with service role.
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    try {
        // Fetch all profiles' departments
        // Supabase doesn't have a distinct() modifier easily on select, 
        // we fetch column and distinct in JS or use .rpc if needed. 
        // For small number of profiles, JS distinct is fine.
        // 1. Fetch from 'department_leave_limits' (The configured departments)
        // using supabaseAdmin to bypass policies if needed, though they are usually open.
        const { data: limitsData, error: limitsError } = await supabaseAdmin
            .from('department_leave_limits')
            .select('department');

        if (limitsError) throw limitsError;

        // 2. Fetch from 'profiles' (To catch any departments assigned to users but not configured)
        const { data: profilesData, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('department');

        if (profilesError) throw profilesError;

        // Merge and Distinct
        const depts = new Set<string>();
        
        limitsData?.forEach(item => {
            if (item.department && item.department.trim()) {
                depts.add(item.department.trim());
            }
        });

        profilesData?.forEach(item => {
            if (item.department && item.department.trim()) {
                depts.add(item.department.trim());
            }
        });

        const departments = Array.from(depts).sort();

        return NextResponse.json(departments);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
