"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function HrDashboardPage() {
  return (
    <AppShell role="hr">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <header className="mb-4">
          <h1 className="text-lg font-semibold text-slate-900">
            HR Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            Company-wide attendance and leave overview.
          </p>
        </header>

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
