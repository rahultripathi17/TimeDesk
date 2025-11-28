"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

export default function HrDashboardPage() {
  return (
    <AppShell role="hr">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <DashboardHeader
          title="HR Dashboard"
          description="Company-wide attendance and leave overview."
        />

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Attendance summary</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600">
              Show counts: in office, WFH, leave, etc. for the whole company.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Escalated approvals</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600">
              Manager leave requests and escalated employee cases.
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
