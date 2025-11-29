import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { getMonth, getDate, parseISO } from 'date-fns';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBirthdays() {
    console.log("Checking birthdays...");

    const { data: details, error } = await supabase
        .from('user_details')
        .select('id, dob');

    if (error) {
        console.error("Error fetching details:", error);
        return;
    }

    const currentMonth = getMonth(new Date());
    const currentDay = getDate(new Date());

    console.log(`Current Date: ${new Date().toISOString()}`);
    console.log(`Current Month (0-indexed): ${currentMonth}, Current Day: ${currentDay}`);

    const upcoming = details.filter(u => {
        if (!u.dob) return false;
        const dob = parseISO(u.dob);
        const month = getMonth(dob);
        const day = getDate(dob);

        console.log(`User ${u.id}: DOB ${u.dob} -> Month: ${month}, Day: ${day}`);

        return month === currentMonth && day >= currentDay;
    });

    console.log(`Found ${upcoming.length} upcoming birthdays.`);
    upcoming.forEach(u => console.log(`- ID: ${u.id}, DOB: ${u.dob}`));
}

checkBirthdays();
