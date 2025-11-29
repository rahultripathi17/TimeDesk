"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/utils/supabase/client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";
import { validatePhone, validatePincode, validateAadhaar, validatePAN, validateRequired } from "@/utils/validation";
import { ProfilePictureUpload } from "@/components/ui/profile-picture-upload";



const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh",
    "Lakshadweep", "Puducherry"
];

export default function AddUserPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AddUserForm />
        </Suspense>
    );
}

function AddUserForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const userId = searchParams.get("id");
    const isEditMode = !!userId;

    const [dob, setDob] = useState<Date>();
    const [openManager, setOpenManager] = useState(false);
    const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
    const [managersList, setManagersList] = useState<{ value: string, label: string, designation?: string, department?: string, role?: string }[]>([]);
    const [fullName, setFullName] = useState("");
    const [profilePic, setProfilePic] = useState<string | null>(null);

    // Additional State for Edit Mode Pre-filling
    const [email, setEmail] = useState("");
    const [personalEmail, setPersonalEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [gender, setGender] = useState("");
    const [address, setAddress] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [pincode, setPincode] = useState("");
    const [pan, setPan] = useState("");
    const [aadhaar, setAadhaar] = useState("");
    const [doj, setDoj] = useState("");
    const [department, setDepartment] = useState("");
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [ifsc, setIfsc] = useState("");
    // Username is now same as email
    const [role, setRole] = useState("");
    const [employmentType, setEmploymentType] = useState("");
    const [salary, setSalary] = useState("");
    const [designation, setDesignation] = useState("");

    // Working Time Configuration State
    const [workMode, setWorkMode] = useState<"fixed" | "flexible">("fixed");
    // Fixed Mode
    const [fixedStartTime, setFixedStartTime] = useState("09:00");
    const [fixedEndTime, setFixedEndTime] = useState("17:00");
    const [fixedWorkDays, setFixedWorkDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
    // Flexible Mode
    const [flexibleDailyHours, setFlexibleDailyHours] = useState("5");

    const toggleWorkDay = (dayIndex: number) => {
        setFixedWorkDays(prev =>
            prev.includes(dayIndex)
                ? prev.filter(d => d !== dayIndex)
                : [...prev, dayIndex].sort()
        );
    };

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [departmentsList, setDepartmentsList] = useState<string[]>([]);

    useEffect(() => {
        fetchManagers();
        fetchDepartments();
        if (isEditMode && userId) {
            fetchUserData(userId);
        }
    }, [isEditMode, userId]);

    const fetchDepartments = async () => {
        try {
            const { data, error } = await supabase
                .from('department_leave_limits')
                .select('department');

            if (error) throw error;

            if (data) {
                // Extract unique departments
                const uniqueDepts = Array.from(new Set(data.map(item => item.department))).sort();
                setDepartmentsList(uniqueDepts);
            }
        } catch (err) {
            console.error("Error fetching departments:", err);
        }
    };

    const fetchManagers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, designation, department, role')
                .in('role', ['manager', 'admin', 'hr']);

            if (error) throw error;

            if (data) {
                setManagersList(data.map(user => ({
                    value: user.id,
                    label: user.full_name,
                    designation: user.designation,
                    department: user.department,
                    role: user.role
                })));
            }
        } catch (err) {
            console.error("Error fetching managers:", err);
        }
    };

    const fetchUserData = async (id: string) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/users?id=${id}`);
            if (!response.ok) {
                throw new Error('Failed to fetch user data');
            }
            const data = await response.json();

            // Populate State
            setFullName(data.full_name || "");
            setEmail(data.email || ""); // This now comes from Auth
            setRole(data.role || "");
            setEmploymentType(data.employment_type || "");
            setDesignation(data.designation || "");
            setDepartment(data.department || "");
            setDoj(data.date_of_joining || "");
            setSelectedManagers(data.reporting_managers || []);
            setProfilePic(data.avatar_url || null);

            // Populate Work Config
            if (data.work_config) {
                setWorkMode(data.work_config.mode || "fixed");
                if (data.work_config.fixed) {
                    setFixedStartTime(data.work_config.fixed.start_time || "09:00");
                    setFixedEndTime(data.work_config.fixed.end_time || "17:00");
                    setFixedWorkDays(data.work_config.fixed.work_days || [1, 2, 3, 4, 5]);
                }
                if (data.work_config.flexible) {
                    setFlexibleDailyHours(data.work_config.flexible.daily_hours?.toString() || "5");
                }
            }

            const details = data.details;
            if (details) {
                setPersonalEmail(details.personal_email || "");
                setPhone(details.phone_number || "");
                setSalary(details.salary?.toString() || "");
                setGender(details.gender || "");
                setDob(details.dob ? new Date(details.dob) : undefined);
                setAddress(details.address || "");
                setCity(details.city || "");
                setState(details.state || "");
                setPincode(details.pincode || "");
                setPan(details.pan_number || "");
                setAadhaar(details.aadhaar_number || "");
                setBankName(details.bank_name || "");
                setAccountNumber(details.account_number || "");
                setIfsc(details.ifsc_code || "");
            }

        } catch (err: any) {
            console.error("Error fetching user:", err);
            setError("Failed to load user data.");
        } finally {
            setLoading(false);
        }
    };

    const toggleManager = (value: string) => {
        setSelectedManagers((current) =>
            current.includes(value)
                ? current.filter((item) => item !== value)
                : [...current, value]
        );
    };

    const removeManager = (value: string) => {
        setSelectedManagers((current) => current.filter((item) => item !== value));
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // Collect all form data
            const formData = {
                userId: isEditMode ? userId : undefined,
                // Personal
                fullName,
                email,
                personalEmail,
                phone,
                // Fix: Convert empty string to null for gender to satisfy check constraint
                gender: gender && gender !== "Select gender" ? gender : null,
                dob: dob ? dob.toISOString().split('T')[0] : null,
                avatarUrl: profilePic,

                // Address
                address,
                city,
                state: state && state !== "Select state" ? state : null,
                pincode,

                // Identity
                pan: pan || null,
                aadhaar: aadhaar || null,
                salary: salary ? parseFloat(salary) : null,

                // Employment
                dateOfJoining: doj,
                department: department && department !== "Select department" ? department : null,

                // Bank
                bankName,
                accountNumber,
                ifsc,

                // Account
                username: email,
                password: (document.getElementById('password') as HTMLInputElement).value, // Password is special, only send if changed

                // Role
                role: role && role !== "select role" ? role : "employee",
                employmentType: employmentType && employmentType !== "select type" ? employmentType : "full_time",
                designation,
                reportingManagers: selectedManagers,
                workConfig: {
                    mode: workMode,
                    fixed: workMode === 'fixed' ? {
                        start_time: fixedStartTime,
                        end_time: fixedEndTime,
                        work_days: fixedWorkDays
                    } : undefined,
                    flexible: workMode === 'flexible' ? {
                        daily_hours: parseInt(flexibleDailyHours) || 5
                    } : undefined
                }
            };

            // Strict Validation
            const errors: string[] = [];

            // Required Fields Check
            const requiredFields = [
                { value: fullName, label: "Full Name" },
                { value: personalEmail, label: "Personal Email" },
                { value: phone, label: "Phone Number" },
                { value: gender, label: "Gender" },
                { value: dob ? dob.toISOString() : "", label: "Date of Birth" },
                { value: address, label: "Address" },
                { value: city, label: "City" },
                { value: state, label: "State" },
                { value: pincode, label: "Pincode" },
                { value: pincode, label: "Pincode" },
                { value: doj, label: "Date of Joining" },
                { value: department, label: "Department" },
                { value: role, label: "Role" },
                { value: employmentType, label: "Employment Type" },
                { value: designation, label: "Designation" }
            ];

            if (selectedManagers.length === 0) {
                errors.push("At least one Reporting Manager is required");
            }

            requiredFields.forEach(field => {
                const error = validateRequired(field.value, field.label);
                if (error) errors.push(error);
            });

            // Specific Format Validation
            const phoneError = validatePhone(phone);
            if (phoneError) errors.push(phoneError);

            const pincodeError = validatePincode(pincode);
            if (pincodeError) errors.push(pincodeError);

            const aadhaarError = validateAadhaar(aadhaar);
            if (aadhaarError) errors.push(aadhaarError);

            const panError = validatePAN(pan);
            if (panError) errors.push(panError);

            if (!isEditMode && !formData.password) {
                errors.push("Password is required for new users");
            }

            if (formData.password && formData.password.length < 6) {
                errors.push("Password must be at least 6 characters long");
            }

            // Working Time Validation
            if (!workMode) {
                errors.push("Work Mode is required");
            } else if (workMode === 'fixed') {
                if (!fixedStartTime || !fixedEndTime) {
                    errors.push("Start Time and End Time are required for Fixed Shift");
                }
            } else if (workMode === 'flexible') {
                if (!flexibleDailyHours || parseInt(flexibleDailyHours) <= 0) {
                    errors.push("Valid Daily Hours are required for Flexible/Part-time");
                }
            }

            if (errors.length > 0) {
                throw new Error(errors[0]);
            }

            const method = isEditMode ? 'PUT' : 'POST';
            const response = await fetch('/api/admin/users', {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save user');
            }

            setSuccess(true);

            if (!isEditMode) {
                // Reset form only on create
                setFullName("");
                setProfilePic(null);
                setSelectedManagers([]);
                setDob(undefined);
                // Reset other states... (simplified for now)
                window.location.reload();
            } else {
                // Optional: Redirect back to list after short delay
                setTimeout(() => {
                    router.push('/admin/users');
                }, 1500);
            }

            window.scrollTo(0, 0);

        } catch (err: any) {
            console.error(err);
            setError(err.message);
            window.scrollTo(0, 0);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <AppShell role="admin">
                <div className="mx-auto max-w-md px-4 py-6 sm:px-6 lg:py-8 mt-10">
                    <Card>
                        <CardContent className="pt-6 text-center space-y-4">
                            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <Check className="h-6 w-6 text-green-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-slate-900">
                                {isEditMode ? "User Updated Successfully!" : "User Added Successfully!"}
                            </h2>
                            <p className="text-sm text-slate-500">
                                {isEditMode
                                    ? "The user details have been updated."
                                    : "The new user has been created and can now log in."}
                            </p>
                            <div className="flex flex-col gap-2 pt-4">
                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                    onClick={() => router.push('/admin/users')}
                                >
                                    Return to Users List
                                </Button>
                                {!isEditMode && (
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => window.location.reload()}
                                    >
                                        Add Another User
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell role="admin">
            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
                <header className="mb-6">
                    <h1 className="text-lg font-semibold text-slate-900">
                        {isEditMode ? "Edit User" : "Add New User"}
                    </h1>
                    <p className="text-xs text-slate-500">
                        {isEditMode ? "Update user details and roles." : "Create a new user account and assign roles."}
                    </p>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">User Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-8" onSubmit={handleSubmit}>
                            {/* Personal Information */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-slate-900 border-b pb-2">
                                    Personal Information
                                </h3>

                                <div className="mb-6">
                                    <Label className="text-xs font-medium mb-2 block">Profile Picture</Label>
                                    <ProfilePictureUpload
                                        currentImage={profilePic}
                                        name={fullName}
                                        onImageChange={(file, preview) => setProfilePic(preview)}
                                        onRemove={() => setProfilePic(null)}
                                    />
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="fullName" className="text-xs font-medium">
                                            Full Name <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="fullName"
                                            placeholder="e.g. Rahul Tripathi"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="personalEmail" className="text-xs font-medium">
                                            Personal Email <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="personalEmail"
                                            type="email"
                                            placeholder="e.g. rahul.personal@gmail.com"
                                            value={personalEmail}
                                            onChange={(e) => setPersonalEmail(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone" className="text-xs font-medium">
                                            Phone Number <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            placeholder="e.g. 9876543210"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="gender" className="text-xs font-medium">
                                            Gender <span className="text-red-500">*</span>
                                        </Label>
                                        <Select value={gender} onValueChange={setGender}>
                                            <SelectTrigger id="gender">
                                                <SelectValue placeholder="Select gender" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Male">Male</SelectItem>
                                                <SelectItem value="Female">Female</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dob" className="text-xs font-medium">
                                            Date of Birth <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="dob"
                                            type="date"
                                            className="w-full"
                                            value={dob ? dob.toISOString().split('T')[0] : ''}
                                            onChange={(e) => setDob(e.target.value ? new Date(e.target.value) : undefined)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Address Details */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-slate-900 border-b pb-2">
                                    Address Details
                                </h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="address" className="text-xs font-medium">
                                            Address <span className="text-red-500">*</span>
                                        </Label>
                                        <Textarea
                                            id="address"
                                            placeholder="e.g. Flat No. 101, Galaxy Apartments"
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="city" className="text-xs font-medium">
                                            City <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="city"
                                            placeholder="e.g. Mumbai"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="state" className="text-xs font-medium">
                                            State <span className="text-red-500">*</span>
                                        </Label>
                                        <Select value={state} onValueChange={setState}>
                                            <SelectTrigger id="state">
                                                <SelectValue placeholder="Select state" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {INDIAN_STATES.map((state) => (
                                                    <SelectItem key={state} value={state}>
                                                        {state}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="pincode" className="text-xs font-medium">
                                            Pincode <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="pincode"
                                            placeholder="e.g. 400001"
                                            maxLength={6}
                                            value={pincode}
                                            onChange={(e) => setPincode(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Identity Documents */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-slate-900 border-b pb-2">
                                    Identity Documents
                                </h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="pan" className="text-xs font-medium">
                                            PAN Number
                                        </Label>
                                        <Input
                                            id="pan"
                                            placeholder="e.g. ABCDE1234F"
                                            className="uppercase"
                                            maxLength={10}
                                            value={pan}
                                            onChange={(e) => setPan(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="aadhaar" className="text-xs font-medium">
                                            Aadhaar Number
                                        </Label>
                                        <Input
                                            id="aadhaar"
                                            placeholder="e.g. 1234 5678 9012"
                                            maxLength={12}
                                            value={aadhaar}
                                            onChange={(e) => setAadhaar(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Employment & Role Details (Combined) */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-slate-900 border-b pb-2">
                                    Employment & Role Details
                                </h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="doj" className="text-xs font-medium">
                                            Date of Joining <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="doj"
                                            type="date"
                                            className="w-full"
                                            value={doj}
                                            onChange={(e) => setDoj(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="department" className="text-xs font-medium">
                                            Department <span className="text-red-500">*</span>
                                        </Label>
                                        <Select value={department} onValueChange={setDepartment}>
                                            <SelectTrigger id="department">
                                                <SelectValue placeholder="Select department" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {departmentsList.map((dept) => (
                                                    <SelectItem key={dept} value={dept}>
                                                        {dept}
                                                    </SelectItem>
                                                ))}
                                                {/* Fallback if list is empty or to allow manual entry? For now, just list. */}
                                                {departmentsList.length === 0 && (
                                                    <SelectItem value="general" disabled>
                                                        No departments found
                                                    </SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="role" className="text-xs font-medium">
                                            Role <span className="text-red-500">*</span>
                                        </Label>
                                        <Select value={role} onValueChange={setRole}>
                                            <SelectTrigger id="role">
                                                <SelectValue placeholder="Select role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="employee">Employee</SelectItem>
                                                <SelectItem value="manager">Manager</SelectItem>
                                                <SelectItem value="hr">HR</SelectItem>
                                                <SelectItem value="admin">Admin</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="employmentType" className="text-xs font-medium">
                                            Employment Type <span className="text-red-500">*</span>
                                        </Label>
                                        <Select value={employmentType} onValueChange={setEmploymentType}>
                                            <SelectTrigger id="employmentType">
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="full_time">Full Time</SelectItem>
                                                <SelectItem value="part_time">Part Time</SelectItem>
                                                <SelectItem value="intern">Intern</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="salary" className="text-xs font-medium">
                                            Salary / CTC
                                        </Label>
                                        <Input
                                            id="salary"
                                            type="number"
                                            placeholder="e.g. 50000"
                                            value={salary}
                                            onChange={(e) => setSalary(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="designation" className="text-xs font-medium">
                                            Designation <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="designation"
                                            placeholder="e.g. Software Engineer"
                                            value={designation}
                                            onChange={(e) => setDesignation(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="manager" className="text-xs font-medium">
                                            Reporting Manager(s) <span className="text-red-500">*</span>
                                        </Label>
                                        <Popover open={openManager} onOpenChange={setOpenManager}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={openManager}
                                                    className="w-full justify-between"
                                                >
                                                    <span className="truncate">
                                                        {selectedManagers.length > 0
                                                            ? `${selectedManagers.length} selected`
                                                            : "Select managers..."}
                                                    </span>
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[400px] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Search manager..." />
                                                    <CommandList>
                                                        <CommandEmpty>No manager found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {managersList.map((manager) => (
                                                                <CommandItem
                                                                    key={manager.value}
                                                                    value={manager.value}
                                                                    onSelect={() => toggleManager(manager.value)}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            selectedManagers.includes(manager.value)
                                                                                ? "opacity-100"
                                                                                : "opacity-0"
                                                                        )}
                                                                    />
                                                                    <div className="flex flex-col">
                                                                        <span>{manager.label}</span>
                                                                        <span className="text-xs text-slate-500">
                                                                            {manager.role?.toUpperCase()} • {manager.designation} • {manager.department}
                                                                        </span>
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>

                                        {/* Selected Managers Tags */}
                                        {selectedManagers.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {selectedManagers.map((value) => {
                                                    const manager = managersList.find((m) => m.value === value);
                                                    return (
                                                        <Badge key={value} variant="secondary" className="pl-2 pr-1 py-1">
                                                            {manager?.label}
                                                            <button
                                                                type="button"
                                                                onClick={() => removeManager(value)}
                                                                className="ml-1 hover:bg-slate-200 rounded-full p-0.5"
                                                            >
                                                                <X className="h-3 w-3 text-slate-500" />
                                                                <span className="sr-only">Remove</span>
                                                            </button>
                                                        </Badge>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            Leave approval requests will be sent to these managers.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Working Time Configuration */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-slate-900 border-b pb-2">
                                    Working Time Configuration <span className="text-red-500">*</span>
                                </h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium">Work Mode</Label>
                                        <RadioGroup
                                            value={workMode}
                                            onValueChange={(val) => setWorkMode(val as "fixed" | "flexible")}
                                            className="flex gap-4"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="fixed" id="mode-fixed" />
                                                <Label htmlFor="mode-fixed" className="text-sm font-normal">Fixed Shift (e.g. 9am - 5pm)</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="flexible" id="mode-flexible" />
                                                <Label htmlFor="mode-flexible" className="text-sm font-normal">Flexible / Part-time</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    {workMode === "fixed" && (
                                        <div className="grid gap-4 md:grid-cols-2 bg-slate-50 p-4 rounded-md border">
                                            <div className="space-y-2">
                                                <Label htmlFor="startTime" className="text-xs font-medium">Start Time</Label>
                                                <Input
                                                    id="startTime"
                                                    type="time"
                                                    value={fixedStartTime}
                                                    onChange={(e) => setFixedStartTime(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="endTime" className="text-xs font-medium">End Time</Label>
                                                <Input
                                                    id="endTime"
                                                    type="time"
                                                    value={fixedEndTime}
                                                    onChange={(e) => setFixedEndTime(e.target.value)}
                                                />
                                            </div>

                                            {/* Total Hours Display */}
                                            <div className="md:col-span-2 text-xs text-slate-500 font-medium">
                                                Total Duration: <span className="text-slate-900">
                                                    {(() => {
                                                        if (!fixedStartTime || !fixedEndTime) return "0h 0m";
                                                        const [startH, startM] = fixedStartTime.split(':').map(Number);
                                                        const [endH, endM] = fixedEndTime.split(':').map(Number);
                                                        let diffM = (endH * 60 + endM) - (startH * 60 + startM);
                                                        if (diffM < 0) diffM += 24 * 60; // Handle overnight shifts
                                                        const hours = Math.floor(diffM / 60);
                                                        const minutes = diffM % 60;
                                                        return `${hours}h ${minutes}m`;
                                                    })()}
                                                </span>
                                            </div>

                                            <div className="space-y-2 md:col-span-2">
                                                <Label className="text-xs font-medium block mb-2">Working Days</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
                                                        <div
                                                            key={day}
                                                            onClick={() => toggleWorkDay(index)}
                                                            className={cn(
                                                                "px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer border transition-colors",
                                                                fixedWorkDays.includes(index)
                                                                    ? "bg-slate-900 text-white border-slate-900"
                                                                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                                                            )}
                                                        >
                                                            {day}
                                                        </div>
                                                    ))}
                                                </div>
                                                <p className="text-[10px] text-slate-500 mt-1">Select the days the employee is expected to work.</p>
                                            </div>
                                        </div>
                                    )}

                                    {workMode === "flexible" && (
                                        <div className="bg-slate-50 p-4 rounded-md border">
                                            <div className="space-y-2 max-w-xs">
                                                <Label htmlFor="dailyHours" className="text-xs font-medium">Daily Working Hours</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        id="dailyHours"
                                                        type="number"
                                                        min="1"
                                                        max="24"
                                                        value={flexibleDailyHours}
                                                        onChange={(e) => setFlexibleDailyHours(e.target.value)}
                                                    />
                                                    <span className="text-sm text-slate-500">Hours</span>
                                                </div>
                                                <p className="text-[10px] text-slate-500">Employee can work these hours at any time during the day.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Bank Information */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-slate-900 border-b pb-2">
                                    Bank Information
                                </h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="bankName" className="text-xs font-medium">
                                            Bank Name
                                        </Label>
                                        <Input
                                            id="bankName"
                                            placeholder="e.g. HDFC Bank"
                                            value={bankName}
                                            onChange={(e) => setBankName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="accountNumber" className="text-xs font-medium">
                                            Account Number
                                        </Label>
                                        <Input
                                            id="accountNumber"
                                            placeholder="e.g. 1234567890"
                                            value={accountNumber}
                                            onChange={(e) => setAccountNumber(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="ifsc" className="text-xs font-medium">
                                            IFSC Code
                                        </Label>
                                        <Input
                                            id="ifsc"
                                            placeholder="e.g. HDFC0001234"
                                            className="uppercase"
                                            maxLength={11}
                                            value={ifsc}
                                            onChange={(e) => setIfsc(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Account Information */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-slate-900 border-b pb-2">
                                    Account Information
                                </h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-xs font-medium">
                                            Official Email (Username) <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="e.g. rahul@company.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                        <p className="text-[10px] text-slate-500">
                                            Use the official email address for login.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password" className="text-xs font-medium">
                                            Password <span className="text-red-500">*</span>
                                        </Label>
                                        <Input id="password" type="password" placeholder="••••••••" minLength={6} />
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    type="button"
                                    disabled={loading}
                                    onClick={() => router.push('/admin/users')}
                                >
                                    Cancel
                                </Button>
                                <Button className="bg-blue-600 hover:bg-blue-700" type="submit" disabled={loading}>
                                    {loading ? (isEditMode ? "Updating..." : "Adding...") : (isEditMode ? "Update User" : "Add User")}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div >
        </AppShell >
    );
}
