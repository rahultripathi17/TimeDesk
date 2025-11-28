
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

async function checkData() {
    console.log('--- Checking Profiles ---');
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, department, role')
        .limit(5);

    if (profileError) console.error('Profile Error:', profileError);
    else console.table(profiles);

    console.log('\n--- Checking leave_policies Table ---');
    const { data: policies, error: policiesError } = await supabase
        .from('leave_policies')
        .select('*');

    if (policiesError) console.error('leave_policies Error:', policiesError);
    else console.table(policies);

    console.log('\n--- Checking department_leave_limits Table ---');
    const { data: limits, error: limitsError } = await supabase
        .from('department_leave_limits')
        .select('*');

    if (limitsError) console.error('department_leave_limits Error:', limitsError);
    else console.table(limits);
}

checkData();
