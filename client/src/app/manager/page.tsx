"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

export default function ManagerDashboardPage() {
  return (
    <AppShell role="manager">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <DashboardHeader
          title="Manager Dashboard"
          description="Overview of your team's attendance and leaves."
        />

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Today&apos;s team status</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600">
              {/* later: table of team members */}
              Show list of your team with status (Office / WFH / Leave).
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pending approvals</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600">
              {/* later: list of leave requests */}
              Approve or reject leave requests from your team here.
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
