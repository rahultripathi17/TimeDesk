"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Check if email exists first
      const { data: userExists, error: rpcError } = await supabase
        .rpc('check_user_exists', { email_input: email.trim() });

      if (rpcError) {
        console.error("RPC Error:", rpcError);
        // Fallback to generic login if RPC fails (e.g. function missing)
      } else if (userExists === false) {
        const msg = "Email not found";
        setError(msg);
        toast.error(msg);
        setLoading(false);
        return;
      }

      // 2. Attempt Login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        let msg = authError.message;
        if (authError.message === "Invalid login credentials") {
          msg = "Incorrect password";
        }
        setError(msg);
        toast.error(msg);
        setLoading(false);
        return;
      }

      if (authData.user) {
        toast.success("Login successful! Redirecting...");

        // Fetch user profile to get role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          router.push("/dashboard");
          return;
        }

        const role = profile?.role?.toLowerCase() || "employee";

        // Role-based redirect
        switch (role) {
          case "manager":
            router.push("/manager");
            break;
          case "hr":
            router.push("/hr");
            break;
          case "admin":
            router.push("/admin");
            break;
          case "employee":
          default:
            router.push("/dashboard");
            break;
        }
      }
    } catch (err: any) {
      const msg = err.message || "An error occurred during login";
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      {/* top logo bar */}
      <header className="px-4 pt-4 sm:px-8 sm:pt-6">
        <div className="flex items-center gap-3">
          <Image
            src="/timedesk-logo.png"
            alt="TimeDesk logo"
            width={130}
            height={40}
            className="h-8 w-auto"
          />
          <span className="text-xs text-slate-500">Internal HR portal</span>
        </div>
      </header>

      {/* center card */}
      <div className="flex flex-1 items-center justify-center px-4 py-4 sm:px-8">
        <Card className="w-full max-w-5xl border-slate-200 bg-white shadow-xl">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center">
              {/* LEFT: login form */}
              <section>
                <CardHeader className="px-0 pb-2">
                  <CardTitle className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                    Hello there! <span className="align-middle">👋</span>
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-500">
                    Sign in to manage your attendance and leaves.
                  </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit} className="space-y-3">
                  {error && (
                    <div className="rounded-md bg-red-50 p-2.5 text-sm font-medium text-red-600 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-600 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-xs font-medium text-slate-700">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-9 text-base sm:text-sm"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <Label htmlFor="password" className="font-medium text-slate-700">Password</Label>
                      <Link
                        href="/forgot-password"
                        className="font-medium text-sky-600 hover:text-sky-500 hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-9 pr-10 text-base sm:text-sm"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="mt-2 flex w-full items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white transition-all h-10"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Login</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <p className="pt-2 text-[10px] leading-snug text-slate-500 text-center">
                    By logging in, you agree to TimeDesk&apos;s{" "}
                    <span className="cursor-pointer text-sky-600 hover:underline">
                      Terms of Service
                    </span>{" "}
                    and{" "}
                    <span className="cursor-pointer text-sky-600 hover:underline">
                      Privacy Policy
                    </span>
                    .
                  </p>
                </form>
              </section>

              {/* RIGHT: short text + big image */}
              <section className="hidden h-full flex-col justify-between rounded-2xl bg-slate-50 p-5 lg:flex">
                <div>
                  <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-600 shadow-sm">
                    Attendance
                  </span>

                  <h2 className="mt-4 text-xl font-bold text-slate-900">
                    Simple daily check-ins.
                  </h2>

                  <ul className="mt-4 space-y-2 text-sm text-slate-600 font-medium">
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Mark status from anywhere
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      Quick leave approvals
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Clean reports for HR
                    </li>
                  </ul>
                </div>

                <div className="mt-8 flex items-end justify-end">
                  <div className="relative h-52 w-full sm:h-60 md:h-64">
                    <Image
                      src="/storyset-login.svg"
                      alt="TimeDesk attendance illustration"
                      fill
                      className="object-contain drop-shadow-sm"
                      priority
                    />
                  </div>
                </div>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
