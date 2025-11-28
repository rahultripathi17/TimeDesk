"use client";

import { AppShell } from "@/components/layout/AppShell";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, Home, MapPin, Globe, Palmtree, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/utils/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

export default function EmployeeDashboardPage() {
  const [status, setStatus] = useState<"available" | "remote" | "leave" | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodayStatus();
  }, []);

  const fetchTodayStatus = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const todayDate = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance')
        .select('status, created_at')
        .eq('user_id', user.id) // Assuming we have a user_id that matches profile id
        .eq('date', todayDate)
        .single();

      if (data) {
        setStatus(data.status as any);
        setLastUpdated(format(new Date(data.created_at), "h:mm a"));
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: "available" | "remote" | "leave") => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("You must be logged in to update status.");
        return;
      }

      const todayDate = new Date().toISOString().split('T')[0];

      // Upsert attendance record
      const { error } = await supabase
        .from('attendance')
        .upsert({
          user_id: user.id, // This assumes the auth user ID matches the profile ID
          date: todayDate,
          status: newStatus,
          created_at: new Date().toISOString()
        }, { onConflict: 'user_id, date' });

      if (error) throw error;

      setStatus(newStatus);
      setLastUpdated(format(new Date(), "h:mm a"));
    } catch (error: any) {
      console.error('Error updating status:', error);
      alert("Failed to update status: " + error.message);
    }
  };

  const getStatusDisplay = () => {
    if (!status) {
      return {
        label: "No Status Updated",
        icon: AlertCircle,
        color: "text-slate-500",
        bgColor: "bg-slate-50",
        borderColor: "border-slate-200"
      };
    }
    switch (status) {
      case "available":
        return {
          label: "Working from Office",
          icon: MapPin,
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
          borderColor: "border-emerald-100"
        };
      case "remote":
        return {
          label: "Working Remotely",
          icon: Globe,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-100"
        };
      case "leave":
        return {
          label: "On Leave",
          icon: Palmtree,
          color: "text-amber-600",
          bgColor: "bg-amber-50",
          borderColor: "border-amber-100"
        };
    }
  };

  const currentStatus = getStatusDisplay();
  const StatusIcon = currentStatus.icon;

  return (
    <AppShell role="employee">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <DashboardHeader title="My Dashboard" />

        <section className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          {/* Today's status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Home className="h-5 w-5" />
                Today&apos;s Status
              </CardTitle>
              <CardDescription className="text-xs">
                View or update your work location.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs ${currentStatus.bgColor} ${currentStatus.borderColor}`}>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">
                    Current
                  </p>
                  <p className={`mt-1 flex items-center gap-1.5 text-sm font-semibold ${currentStatus.color}`}>
                    <StatusIcon className="h-4 w-4" />
                    {currentStatus.label}
                  </p>
                </div>
                {lastUpdated && (
                  <span className="text-[11px] text-slate-400">
                    Last updated {lastUpdated}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <Button
                  variant={status === "available" ? "default" : "outline"}
                  className={status === "available" ? "bg-emerald-600 hover:bg-emerald-700" : "justify-start"}
                  onClick={() => updateStatus("available")}
                  disabled={loading}
                >
                  <Home className="mr-2 h-4 w-4" />
                  Office
                </Button>
                <Button
                  variant={status === "remote" ? "default" : "outline"}
                  className={status === "remote" ? "bg-blue-600 hover:bg-blue-700" : "justify-start"}
                  onClick={() => updateStatus("remote")}
                  disabled={loading}
                >
                  <Globe className="mr-2 h-4 w-4" />
                  Remote
                </Button>
                <Button
                  variant={status === "leave" ? "default" : "outline"}
                  className={status === "leave" ? "bg-amber-600 hover:bg-amber-700" : "justify-start"}
                  onClick={() => updateStatus("leave")}
                  disabled={loading}
                >
                  <Palmtree className="mr-2 h-4 w-4" />
                  On leave
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-5 w-5" />
                Last 7 days
              </CardTitle>
              <CardDescription className="text-xs">
                Quick snapshot of your week.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] text-slate-500">Office</p>
                <p className="mt-1 text-lg font-semibold">3</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] text-slate-500">WFH</p>
                <p className="mt-1 text-lg font-semibold">2</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] text-slate-500">Leave</p>
                <p className="mt-1 text-lg font-semibold">1</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
