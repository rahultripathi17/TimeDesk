export type Profile = {
    id: string;
    username: string;
    email: string | null;
    full_name: string;
    avatar_url: string | null;
    role: 'admin' | 'hr' | 'manager' | 'employee';
    designation: string | null;
    department: string | null;
    date_of_joining: string | null;
    reporting_managers: string[] | null;
    created_at: string;
};

export type UserDetails = {
    id: string;
    personal_email: string | null;
    phone_number: string | null;
    dob: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    pan_number: string | null;
    aadhaar_number: string | null;
    bank_name: string | null;
    account_number: string | null;
    ifsc_code: string | null;
};

export type Attendance = {
    id: string;
    user_id: string;
    date: string;
    status: 'available' | 'remote' | 'leave' | 'absent';
    check_in: string | null;
    check_out: string | null;
    created_at: string;
};

export type Leave = {
    id: string;
    user_id: string;
    type: string;
    start_date: string;
    end_date: string;
    reason: string | null;
    status: 'pending' | 'approved' | 'rejected';
    approver_id: string | null;
    created_at: string;
};
