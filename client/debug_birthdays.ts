import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { getMonth, getDate, parseISO, format } from 'date-fns';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugBirthdays() {
    console.log("--- Debugging Birthdays ---");

    const now = new Date();
    console.log(`Current System Time: ${now.toString()}`);
    console.log(`Current Month (0-11): ${getMonth(now)}`);
    console.log(`Current Day: ${getDate(now)}`);

    const { data: details, error } = await supabase
        .from('user_details')
        .select('id, dob');

    if (error) {
        console.error("Error fetching details:", error);
        return;
    }

    console.log(`Fetched ${details.length} user details.`);

    const currentMonth = getMonth(now);
    const currentDay = getDate(now);

    details.forEach(u => {
        if (!u.dob) {
            console.log(`User ${u.id}: No DOB`);
            return;
        }

        const dobDate = parseISO(u.dob);
        const month = getMonth(dobDate);
        const day = getDate(dobDate);

        const isMonthMatch = month === currentMonth;
        const isUpcoming = day >= currentDay;

        console.log(`User ${u.id}:`);
        console.log(`  Raw DOB: ${u.dob}`);
        console.log(`  Parsed: ${format(dobDate, 'yyyy-MM-dd')} (Month: ${month}, Day: ${day})`);
        console.log(`  Match Month? ${isMonthMatch} (Target: ${currentMonth})`);
        console.log(`  Upcoming? ${isUpcoming} (Target Day >= ${currentDay})`);

        if (isMonthMatch && isUpcoming) {
            console.log("  >>> SHOULD SHOW IN SLIDER <<<");
        } else {
            console.log("  >>> FILTERED OUT <<<");
        }
    });
}

debugBirthdays();
