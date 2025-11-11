"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getDepartmentPolicies() {
    const supabase = await createClient();
    
    // 1. Get all unique departments from profiles (to list them all)
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('department');
    
    // 2. Get existing policies
    const { data: policies, error: policyError } = await supabase
        .from('department_policies')
        .select('*');

    if (profileError) throw new Error(profileError.message);
    if (policyError) throw new Error(policyError.message);

    // Extract unique departments
    const uniqueDepartments = Array.from(new Set(profiles?.map(p => p.department).filter(Boolean)));

    // Merge with policies
    const mergedData = uniqueDepartments.map(dept => {
        const policy = policies?.find(p => p.department === dept);
        return {
            department: dept,
            is_enabled: policy?.is_enabled || false,
            policy_url: policy?.policy_url || "",
            id: policy?.id // To know if we update or insert
        };
    }).sort((a, b) => a.department.localeCompare(b.department));

    return mergedData;
}

import { createAdminClient } from "@/utils/supabase/admin";

export async function saveDepartmentPolicy(department: string, is_enabled: boolean, policy_url: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Explicitly verify role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
        throw new Error("Unauthorized: Admin access required");
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Server Error: Configuration missing (Service Role Key).");
    }

    // Use Service Role to bypass RLS for the write operation
    const adminSb = createAdminClient();
    
    const { error } = await adminSb
        .from('department_policies')
        .upsert({
            department,
            is_enabled,
            policy_url,
            updated_at: new Date().toISOString()
        }, { onConflict: 'department' });

    if (error) {
        throw new Error("Database Error: " + error.message);
    }

    revalidatePath('/admin/policies');
    return { success: true };
}
