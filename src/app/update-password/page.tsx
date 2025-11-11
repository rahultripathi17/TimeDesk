"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/utils/supabase/client";

export default function UpdatePasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            // Check for errors in the URL hash first
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const errorDescription = hashParams.get("error_description");
            const error = hashParams.get("error");

            if (error || errorDescription) {
                setError(errorDescription?.replace(/\+/g, " ") || error || "Invalid or expired link");
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError("Invalid or expired password reset link. Please try requesting a new one.");
            } else {
                setEmail(session.user.email || "");
            }
        };
        checkSession();
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters long");
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

            setTimeout(() => {
                router.push("/dashboard");
            }, 3000);

        } catch (err: any) {
            setError(err.message || "An error occurred while updating your password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex min-h-screen flex-col bg-slate-50">
            <header className="px-4 pt-4 sm:px-8 sm:pt-6">
                <div className="flex items-center gap-3">
                    <Image
                        src="/timedesk-logo.png"
                        alt="TimeDesk logo"
                        width={130}
                        height={40}
                        className="h-8 w-auto"
                    />
                </div>
            </header>

            <div className="flex flex-1 items-center justify-center px-4 pb-6 pt-4 sm:px-8 sm:pb-8 sm:pt-4">
                <Card className="w-full max-w-md border-slate-200 bg-white shadow-xl">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold">Set new password</CardTitle>
                        <CardDescription>
                            Enter a new password for <span className="font-medium text-slate-900">{email}</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {success ? (
                            <div className="flex flex-col items-center justify-center space-y-4 py-4 text-center">
                                <div className="rounded-full bg-green-100 p-3">
                                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-slate-900">Password updated!</h3>
                                    <p className="text-sm text-slate-500">
                                        Your password has been successfully updated. Redirecting you to the dashboard...
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <div className="flex items-start gap-3 rounded-md bg-red-50 p-3 text-sm text-red-600">
                                        <AlertCircle className="h-5 w-5 shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="password">New Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            if (error) setError(null);
                                        }}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            if (error) setError(null);
                                        }}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                                <Button className="w-full" type="submit" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        "Update Password"
                                    )}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
