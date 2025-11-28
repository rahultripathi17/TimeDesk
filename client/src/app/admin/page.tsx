"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

export default function AdminDashboardPage() {
  return (
    <AppShell role="admin">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <DashboardHeader
          title="Admin Dashboard"
          description="Control panel for users, roles, and company settings."
        />

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Users &amp; roles</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600">
              Manage employees, managers, HR users and assign roles here.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Attendance configuration</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600">
              Configure working days, holidays, and integration settings.
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
