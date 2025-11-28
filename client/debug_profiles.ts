
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProfiles() {
    console.log('Fetching profiles...');
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .limit(5);

    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }

    console.log('Profiles data:');
    profiles.forEach(p => {
        console.log(`ID: ${p.id}, Name: ${p.full_name}, Email: ${p.email}, Role: ${p.role}`);
    });
}

checkProfiles();
