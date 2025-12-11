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
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('department');

        if (error) throw error;

        // Extract unique non-null departments
        const departments = Array.from(new Set(
            data?.map(p => p.department)
            .filter(d => d && d.trim() !== '')
        )).sort();

        return NextResponse.json(departments);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
