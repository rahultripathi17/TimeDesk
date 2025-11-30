"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, CheckCircle2, AlertCircle, Lock, Mail, Eye, EyeOff, User, Camera, Upload } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { toast } from "sonner";
import { ProfilePictureUpload } from "@/components/ui/profile-picture-upload";
import { validatePhone, validatePincode, validateAadhaar, validatePAN, validateRequired } from "@/utils/validation";

const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands",
    "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Lakshadweep", "Delhi", "Puducherry", "Ladakh", "Jammu and Kashmir"
];

export default function SettingsPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"employee" | "manager" | "hr" | "admin">("employee");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [success, setSuccess] = useState(false);
    const [countdown, setCountdown] = useState(5);

    // Password Visibility State
    const [showPassword, setShowPassword] = useState(false);

    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Profile Edit State
    const [activeTab, setActiveTab] = useState("account");
    const [profileLoading, setProfileLoading] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        full_name: "",
        phone_number: "",
        personal_email: "",
        gender: "",
        dob: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        bank_name: "",
        account_number: "",
        ifsc_code: "",
        pan_number: "",
        aadhaar_number: ""
    });

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setEmail(user.email || "");

                    // Fetch role and details
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role, full_name, avatar_url')
                        .eq('id', user.id)
                        .single();

                    const { data: details } = await supabase
                        .from('user_details')
                        .select('*')
                        .eq('id', user.id)
                        .single();

                    if (profile) {
                        setRole(profile.role);
                        setAvatarPreview(profile.avatar_url);
                        setFormData(prev => ({ ...prev, full_name: profile.full_name }));
                    }

                    if (details) {
                        setFormData(prev => ({
                            ...prev,
                            phone_number: details.phone_number || "",
                            personal_email: details.personal_email || "",
                            gender: details.gender || "",
                            dob: details.dob || "",
                            address: details.address || "",
                            city: details.city || "",
                            state: details.state || "",
                            pincode: details.pincode || "",
                            bank_name: details.bank_name || "",
                            account_number: details.account_number || "",
                            ifsc_code: details.ifsc_code || "",
                            pan_number: details.pan_number || "",
                            aadhaar_number: details.aadhaar_number || ""
                        }));
                    }
                }
            } catch (error) {
                console.error("Error fetching user:", error);
            } finally {
                setPageLoading(false);
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (success && countdown > 0) {
            timer = setTimeout(() => {
                setCountdown((prev) => prev - 1);
            }, 1000);
        } else if (success && countdown === 0) {
            router.push("/dashboard");
        }
        return () => clearTimeout(timer);
    }, [success, countdown, router]);

    const handlePasswordUpdate = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters long");
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) {
                throw new Error(error.message);
            }

            setSuccess(true);
            setPassword("");
            setConfirmPassword("");
            setCountdown(5); // Reset countdown
        } catch (err: any) {
            toast.error(err.message || "Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async (e: FormEvent) => {
        e.preventDefault();
        setProfileLoading(true);

        // Strict Validation
        const errors: string[] = [];

        // Required Fields Check
        const requiredFields = [
            { key: "full_name", label: "Full Name" },
            { key: "phone_number", label: "Phone Number" },
            { key: "personal_email", label: "Personal Email" },
            { key: "gender", label: "Gender" },
            { key: "dob", label: "Date of Birth" },
            { key: "address", label: "Address" },
            { key: "city", label: "City" },
            { key: "state", label: "State" },
            { key: "pincode", label: "Pincode" },
            { key: "bank_name", label: "Bank Name" },
            { key: "account_number", label: "Account Number" },
            { key: "ifsc_code", label: "IFSC Code" }
        ];

        requiredFields.forEach(field => {
            const error = validateRequired(formData[field.key as keyof typeof formData], field.label);
            if (error) errors.push(error);
        });

        // Specific Format Validation
        const phoneError = validatePhone(formData.phone_number);
        if (phoneError) errors.push(phoneError);

        const pincodeError = validatePincode(formData.pincode);
        if (pincodeError) errors.push(pincodeError);

        const aadhaarError = validateAadhaar(formData.aadhaar_number);
        if (aadhaarError) errors.push(aadhaarError);

        const panError = validatePAN(formData.pan_number);
        if (panError) errors.push(panError);

        if (errors.length > 0) {
            toast.error(errors[0]); // Show first error
            setProfileLoading(false);
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            let avatarUrl = avatarPreview;

            // Use the base64 preview string directly if it exists (whether from crop or initial load)
            // But we only want to send it if it changed. 
            // Ideally we should track if it changed, but sending the string again is fine for now.
            if (avatarPreview) {
                avatarUrl = avatarPreview;
            }

            // Update Profile & Details via API
            const res = await fetch('/api/profile/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    avatar_url: avatarUrl,
                    ...formData,
                    pan_number: formData.pan_number || null,
                    aadhaar_number: formData.aadhaar_number || null
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to update profile");
            }

            toast.success("Profile updated successfully");
            setSuccess(true);
            setCountdown(5);
            setAvatarFile(null); // Reset file input
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to update profile");
        } finally {
            setProfileLoading(false);
        }
    };

    if (pageLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <AppShell role={role}>
            <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:py-8">
                <header className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                    <p className="text-sm text-slate-500">
                        Manage your account settings and preferences.
                    </p>
                </header>

                <div className="flex gap-4 mb-6 border-b">
                    <button
                        onClick={() => setActiveTab("account")}
                        className={`pb-2 text-sm font-medium transition-colors ${activeTab === "account" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
                    >
                        Account & Security
                    </button>
                    <button
                        onClick={() => setActiveTab("profile")}
                        className={`pb-2 text-sm font-medium transition-colors ${activeTab === "profile" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
                    >
                        Personal Information
                    </button>
                </div>

                {activeTab === "account" ? (
                    <div className="space-y-6">
                        {/* Account Information Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-slate-500" />
                                    Account Information
                                </CardTitle>
                                <CardDescription>
                                    Your account details. The email address is managed by your administrator.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input
                                        id="email"
                                        value={email}
                                        disabled
                                        className="bg-slate-50 text-slate-500"
                                    />
                                    <p className="text-[10px] text-slate-400">
                                        This email is linked to your employee profile and cannot be changed directly.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Password Update Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Lock className="h-4 w-4 text-slate-500" />
                                    Security
                                </CardTitle>
                                <CardDescription>
                                    Update your password to keep your account secure.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {success ? (
                                    <div className="flex flex-col items-center justify-center space-y-4 py-6 text-center animate-in fade-in zoom-in duration-300">
                                        <div className="rounded-full bg-green-100 p-3">
                                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="font-semibold text-lg text-slate-900">Password Updated!</h3>
                                            <p className="text-sm text-slate-500 max-w-xs mx-auto">
                                                Your password has been successfully changed. You can now use your new password to log in.
                                            </p>
                                            <p className="text-xs text-slate-400 mt-2">
                                                Redirecting to dashboard in {countdown} seconds...
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => router.push("/dashboard")}
                                            className="mt-2"
                                        >
                                            Go to Dashboard Now
                                        </Button>
                                    </div>
                                ) : (
                                    <form onSubmit={handlePasswordUpdate} className="space-y-4">
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="password">New Password</Label>
                                                <div className="relative">
                                                    <Input
                                                        id="password"
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder="••••••••"
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        required
                                                        minLength={6}
                                                        className="pr-10"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff className="h-4 w-4" />
                                                        ) : (
                                                            <Eye className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-slate-500">
                                                    Must be at least 6 characters long.
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                                <div className="relative">
                                                    <Input
                                                        id="confirmPassword"
                                                        type={showConfirmPassword ? "text" : "password"}
                                                        placeholder="••••••••"
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        required
                                                        minLength={6}
                                                        className="pr-10"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                    >
                                                        {showConfirmPassword ? (
                                                            <EyeOff className="h-4 w-4" />
                                                        ) : (
                                                            <Eye className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </div>
                                                {confirmPassword && password !== confirmPassword && (
                                                    <p className="text-[10px] text-red-500 mt-1">
                                                        Passwords do not match.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex justify-end">
                                            <Button type="submit" disabled={loading}>
                                                {loading ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Updating...
                                                    </>
                                                ) : (
                                                    "Update Password"
                                                )}
                                            </Button>
                                        </div>
                                    </form>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {success ? (
                            <div className="flex flex-col items-center justify-center space-y-4 py-6 text-center animate-in fade-in zoom-in duration-300">
                                <div className="rounded-full bg-green-100 p-3">
                                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-lg text-slate-900">Profile Updated!</h3>
                                    <p className="text-sm text-slate-500 max-w-xs mx-auto">
                                        Your profile details have been successfully updated.
                                    </p>
                                    <p className="text-xs text-slate-400 mt-2">
                                        Redirecting to dashboard in {countdown} seconds...
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => router.push("/dashboard")}
                                    className="mt-2"
                                >
                                    Go to Dashboard Now
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleProfileUpdate}>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <User className="h-4 w-4 text-slate-500" />
                                            Profile Details
                                        </CardTitle>
                                        <CardDescription>
                                            Update your personal information and profile picture.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* Avatar Upload */}
                                        <ProfilePictureUpload
                                            currentImage={avatarPreview}
                                            name={formData.full_name}
                                            onImageChange={(file: File | null, preview: string | null) => {
                                                setAvatarFile(file);
                                                setAvatarPreview(preview);
                                            }}
                                            onRemove={() => {
                                                setAvatarFile(null);
                                                setAvatarPreview(null);
                                            }}
                                        />

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="full_name">Full Name <span className="text-red-500">*</span></Label>
                                                <Input
                                                    id="full_name"
                                                    value={formData.full_name}
                                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
                                                <Input
                                                    id="phone"
                                                    value={formData.phone_number}
                                                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                                    placeholder="e.g. 9876543210"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="personal_email">Personal Email <span className="text-red-500">*</span></Label>
                                                <Input
                                                    id="personal_email"
                                                    type="email"
                                                    value={formData.personal_email}
                                                    onChange={(e) => setFormData({ ...formData, personal_email: e.target.value })}
                                                    placeholder="you@gmail.com"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="gender">Gender <span className="text-red-500">*</span></Label>
                                                <select
                                                    id="gender"
                                                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                    value={formData.gender}
                                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                                >
                                                    <option value="">Select Gender</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="dob">Date of Birth <span className="text-red-500">*</span></Label>
                                                <Input
                                                    id="dob"
                                                    type="date"
                                                    value={formData.dob}
                                                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="address">Address <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="address"
                                                value={formData.address}
                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-3">
                                            <div className="space-y-2">
                                                <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
                                                <Input
                                                    id="city"
                                                    value={formData.city}
                                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="state">State <span className="text-red-500">*</span></Label>
                                                <select
                                                    id="state"
                                                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                    value={formData.state}
                                                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                                >
                                                    <option value="">Select State</option>
                                                    {INDIAN_STATES.map(state => (
                                                        <option key={state} value={state}>{state}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="pincode">Pincode <span className="text-red-500">*</span></Label>
                                                <Input
                                                    id="pincode"
                                                    value={formData.pincode}
                                                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t">
                                            <h3 className="text-sm font-medium text-slate-900 mb-4">Bank & Statutory Details</h3>
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="space-y-2">
                                                    <Label htmlFor="bank_name">Bank Name <span className="text-red-500">*</span></Label>
                                                    <Input
                                                        id="bank_name"
                                                        value={formData.bank_name}
                                                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="account_number">Account Number <span className="text-red-500">*</span></Label>
                                                    <Input
                                                        id="account_number"
                                                        value={formData.account_number}
                                                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="ifsc">IFSC Code <span className="text-red-500">*</span></Label>
                                                    <Input
                                                        id="ifsc"
                                                        value={formData.ifsc_code}
                                                        onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="pan">PAN Number</Label>
                                                    <Input
                                                        id="pan"
                                                        value={formData.pan_number}
                                                        onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="aadhaar">Aadhaar Number</Label>
                                                    <Input
                                                        id="aadhaar"
                                                        value={formData.aadhaar_number}
                                                        onChange={(e) => setFormData({ ...formData, aadhaar_number: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-4">
                                            <Button type="submit" disabled={profileLoading}>
                                                {profileLoading ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    "Save Changes"
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </form>
                        )}
                    </div>
                )}
            </div>



        </AppShell >
    );
}
