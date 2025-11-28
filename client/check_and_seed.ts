
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    // 1. Get all distinct departments from profiles
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('department');

    if (profileError) {
        console.error('Error fetching profiles:', profileError);
        return;
    }

    const departments = [...new Set(profiles.map(p => p.department).filter(Boolean))];
    console.log('Found departments:', departments);

    // 2. For each department, check if limits exist
    for (const dept of departments) {
        const { data: limits } = await supabase
            .from('department_leave_limits')
            .select('*')
            .eq('department', dept);

        if (!limits || limits.length === 0) {
            console.log(`No limits found for ${dept}. Seeding defaults...`);
            const defaults = [
                { department: dept, leave_type: 'Sick', limit_days: 10 },
                { department: dept, leave_type: 'Casual', limit_days: 12 },
                { department: dept, leave_type: 'Privilege', limit_days: 15 },
            ];

            const { error: insertError } = await supabase
                .from('department_leave_limits')
                .insert(defaults);

            if (insertError) console.error(`Error seeding ${dept}:`, insertError);
            else console.log(`Seeded limits for ${dept}`);
        } else {
            console.log(`Limits already exist for ${dept}:`, limits.length);
        }
    }
}

seed();
