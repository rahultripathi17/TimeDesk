"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
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
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { supabase } from "@/utils/supabase/client";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);
        setSuccess(false);

        try {
            // 1. Check if email exists in Auth (using a secure server function)
            const { data: userExists, error: rpcError } = await supabase
                .rpc('check_user_exists', { email_input: email.trim() });

            if (rpcError) {
                console.error("RPC Error:", rpcError);
                // Fallback or specific error if function doesn't exist
                throw new Error("System configuration error. Please contact admin to run the SQL migration.");
            }

            if (!userExists) {
                throw new Error("Email address not found in our system.");
            }

            // 2. If exists, send reset link
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: `${window.location.origin}/update-password`,
            });

            if (error) {
                console.error("Supabase Reset Error:", error);
                throw new Error(error.message);
            }


            setSuccess(true);
        } catch (err: any) {
            console.error("Catch Error:", err);
            setError(err.message || "An error occurred. Please try again.");
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
                        <CardTitle className="text-2xl font-bold">Forgot password</CardTitle>
                        <CardDescription>
                            Enter your email address and we will send you a link to reset your password.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {success ? (
                            <div className="flex flex-col items-center justify-center space-y-4 py-4 text-center">
                                <div className="rounded-full bg-green-100 p-3">
                                    <Mail className="h-6 w-6 text-green-600" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-slate-900">Check your email</h3>
                                    <p className="text-sm text-slate-500">
                                        We have sent a password reset link to <span className="font-medium text-slate-900">{email}</span>
                                    </p>
                                </div>
                                <Button asChild className="mt-4 w-full" variant="outline">
                                    <Link href="/">Back to Login</Link>
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                                        {error}
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                                <Button className="w-full" type="submit" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Sending link...
                                        </>
                                    ) : (
                                        "Send Reset Link"
                                    )}
                                </Button>
                                <div className="flex items-center justify-center">
                                    <Link
                                        href="/"
                                        className="flex items-center text-sm text-slate-600 hover:text-slate-900 hover:underline"
                                    >
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Back to Login
                                    </Link>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
