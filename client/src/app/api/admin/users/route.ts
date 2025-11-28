import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            email,
            password,
            fullName,
            role,
            designation,
            department,
            dateOfJoining,
            reportingManagers,
            personalEmail,
            phone,
            gender,
            dob,
            address,
            city,
            state,
            pincode,
            pan,
            aadhaar,
            bankName,
            accountNumber,
            ifsc,
            username,
            avatarUrl
        } = body;

        // Initialize Supabase Admin Client
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // 1. Create User in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true, // Auto-confirm email since admin is creating it
            user_metadata: {
                full_name: fullName,
                role: role
            }
        });

        if (authError) {
            console.error('Auth Creation Error:', authError);
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        const userId = authData.user.id;

        // 2. Insert into Profiles Table
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: userId,
                email: email,
                username: username, // Using username or email as username
                full_name: fullName,
                role: role,
                designation: designation,
                department: department,
                date_of_joining: dateOfJoining,
                reporting_managers: reportingManagers, // Array of UUIDs
                avatar_url: avatarUrl
            });

        if (profileError) {
            console.error('Profile Creation Error:', profileError);
            // Optional: Delete auth user if profile creation fails to maintain consistency
            await supabaseAdmin.auth.admin.deleteUser(userId);
            return NextResponse.json({ error: 'Failed to create user profile: ' + profileError.message }, { status: 500 });
        }

        // 3. Insert into User Details Table
        const { error: detailsError } = await supabaseAdmin
            .from('user_details')
            .insert({
                id: userId,
                personal_email: personalEmail,
                phone_number: phone,
                gender: gender,
                dob: dob,
                address: address,
                city: city,
                state: state,
                pincode: pincode,
                pan_number: pan,
                aadhaar_number: aadhaar,
                bank_name: bankName,
                account_number: accountNumber,
                ifsc_code: ifsc
            });

        if (detailsError) {
            console.error('User Details Creation Error:', detailsError);
            // Note: We might not want to delete the user here, just log the error, 
            // as the main account is created. Or we could transactionally delete.
            return NextResponse.json({ error: 'User created but failed to save details: ' + detailsError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, userId: userId });

    } catch (error: any) {
        console.error('Server Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const {
            userId,
            email,
            password,
            fullName,
            role,
            designation,
            department,
            dateOfJoining,
            reportingManagers,
            personalEmail,
            phone,
            gender,
            dob,
            address,
            city,
            state,
            pincode,
            pan,
            aadhaar,
            bankName,
            accountNumber,
            ifsc,
            username,
            avatarUrl
        } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // 1. Update Auth User (Email/Password/Metadata)
        const authUpdates: any = {
            email: email,
            user_metadata: {
                full_name: fullName,
                role: role
            }
        };
        if (password) authUpdates.password = password;

        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            authUpdates
        );

        if (authError) {
            return NextResponse.json({ error: 'Auth Update Error: ' + authError.message }, { status: 400 });
        }

        // 2. Update Profiles Table
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
                email: email,
                username: username,
                full_name: fullName,
                role: role,
                designation: designation,
                department: department,
                date_of_joining: dateOfJoining,
                reporting_managers: reportingManagers,
                avatar_url: avatarUrl
            })
            .eq('id', userId);

        if (profileError) {
            return NextResponse.json({ error: 'Profile Update Error: ' + profileError.message }, { status: 500 });
        }

        // 3. Update User Details Table
        // Upsert is safer here in case details row doesn't exist for some reason
        const { error: detailsError } = await supabaseAdmin
            .from('user_details')
            .upsert({
                id: userId,
                personal_email: personalEmail,
                phone_number: phone,
                gender: gender,
                dob: dob,
                address: address,
                city: city,
                state: state,
                pincode: pincode,
                pan_number: pan,
                aadhaar_number: aadhaar,
                bank_name: bankName,
                account_number: accountNumber,
                ifsc_code: ifsc
            });

        if (detailsError) {
            return NextResponse.json({ error: 'Details Update Error: ' + detailsError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Server Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('id');

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // Deleting from Auth automatically cascades to profiles and user_details 
        // because of the "on delete cascade" foreign key we set up in SQL.
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Server Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
