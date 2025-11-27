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
import { ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (authData.user) {
        // Fetch user profile to get role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          // Fallback or handle error. For now, redirect to dashboard as fallback.
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
      setError(err.message || "An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      {/* top logo bar with small padding so height stays compact */}
      <header className="px-4 pt-4 sm:px-8 sm:pt-6">
        <div className="flex items-center gap-3">
          <Image
            src="/hoora-logo.png"
            alt="Hoora logo"
            width={130}
            height={40}
            className="h-8 w-auto"
          />
          <span className="text-xs text-slate-500">Internal HR portal</span>
        </div>
      </header>

      {/* center card vertically; keep some padding but not too much */}
      <div className="flex flex-1 items-center justify-center px-4 pb-6 pt-4 sm:px-8 sm:pb-8 sm:pt-4">
        <Card className="w-full max-w-5xl border-slate-200 bg-white shadow-xl">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-center">
              {/* LEFT: login form */}
              <section>
                <CardHeader className="px-0 pb-3">
                  <CardTitle className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                    Hello there! <span className="align-middle">👋</span>
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-500">
                    Sign in to manage your attendance and leaves.
                  </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-10"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        href="/forgot-password"
                        className="font-medium text-sky-600 hover:text-sky-500 hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-10"
                      disabled={loading}
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="mt-1 flex w-full items-center justify-center gap-2"
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

                  <p className="pt-2 text-[10px] leading-snug text-slate-500">
                    By logging in, you agree to Hoora&apos;s{" "}
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
              <section className="hidden h-full flex-col justify-between rounded-2xl bg-slate-50 p-5 md:flex">
                <div>
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                    Attendance
                  </span>

                  <h2 className="mt-3 text-lg font-semibold text-slate-900 sm:text-xl">
                    Simple daily check-ins.
                  </h2>

                  <ul className="mt-3 space-y-1.5 text-xs text-slate-700 sm:text-sm">
                    <li>• Mark status from Microsoft Teams</li>
                    <li>• Quick leave approvals</li>
                    <li>• Clean reports for HR</li>
                  </ul>
                </div>

                <div className="mt-4 flex items-end justify-end">
                  <div className="relative h-52 w-full sm:h-60 md:h-64">
                    <Image
                      src="/storyset-login.svg"
                      alt="Hoora attendance illustration"
                      fill
                      className="object-contain"
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
