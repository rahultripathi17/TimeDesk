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
    const [managersList, setManagersList] = useState<{ value: string, label: string }[]>([]);
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
    const [designation, setDesignation] = useState("");

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
                .select('id, full_name')
                .eq('role', 'manager');

            if (error) throw error;

            if (data) {
                setManagersList(data.map(user => ({
                    value: user.id,
                    label: user.full_name
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
            setDesignation(data.designation || "");
            setDepartment(data.department || "");
            setDoj(data.date_of_joining || "");
            setSelectedManagers(data.reporting_managers || []);
            setProfilePic(data.avatar_url || null);

            const details = data.details;
            if (details) {
                setPersonalEmail(details.personal_email || "");
                setPhone(details.phone_number || "");
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

    const getInitials = (name: string) => {
        if (!name) return "U";
        const parts = name.trim().split(" ");
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePic(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
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
                pan,
                aadhaar,

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
                // Fix: Default to 'employee' if empty or invalid
                role: role && role !== "select role" ? role : "employee",
                designation,
                reportingManagers: selectedManagers
            };

            // Basic Validation
            if (!formData.fullName || !formData.email || (!isEditMode && !formData.password) || !formData.dateOfJoining) {
                throw new Error("Please fill in all required fields (marked with *)");
            }

            if (formData.password && formData.password.length < 6) {
                throw new Error("Password must be at least 6 characters long");
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

                                <div className="flex items-center gap-6 mb-6">
                                    <Avatar className="h-20 w-20 border-2 border-slate-100">
                                        <AvatarImage src={profilePic || undefined} className="object-cover" />
                                        <AvatarFallback className="text-xl font-semibold bg-blue-50 text-blue-600">
                                            {getInitials(fullName)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="picture" className="text-xs font-medium">
                                            Profile Picture
                                        </Label>
                                        <Input
                                            id="picture"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="w-full max-w-xs text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        />
                                        <p className="text-[10px] text-slate-500">
                                            Upload a profile picture. Initials will be shown if no image is uploaded.
                                        </p>
                                    </div>
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
                                            Personal Email
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
                                            Phone Number
                                        </Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            placeholder="e.g. +91 9876543210"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="gender" className="text-xs font-medium">
                                            Gender
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
                                            Date of Birth
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
                                            Address
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
                                            City
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
                                            State
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
                                            Pincode
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
                                        <Label htmlFor="designation" className="text-xs font-medium">
                                            Designation
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
                                            Reporting Manager(s)
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
                                                                    {manager.label}
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
