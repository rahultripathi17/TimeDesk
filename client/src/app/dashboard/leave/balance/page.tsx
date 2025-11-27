"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LeaveType = {
  id: string;
  label: string;
  granted: number;
  balance: number;
  consumed: number;
  color: string;
};

const leaveTypes: LeaveType[] = [
  { id: "cl", label: "Casual Leave", granted: 6, balance: 4, consumed: 2, color: "text-blue-600" },
  { id: "pl", label: "Privilege Leave", granted: 5, balance: 5, consumed: 0, color: "text-emerald-600" },
  { id: "sl", label: "Sick Leave", granted: 6, balance: 4, consumed: 2, color: "text-orange-600" },
  { id: "bl", label: "Bereavement Leave", granted: 3, balance: 3, consumed: 0, color: "text-purple-600" },
  { id: "rh", label: "Restricted Holiday", granted: 3, balance: 3, consumed: 0, color: "text-indigo-600" },
];

export default function LeaveBalancePage() {
  return (
    <AppShell role="employee">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Leave Balances
            </h1>
            <p className="text-xs text-slate-500">
              View your leave grants and balances for the current year.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9">
              Apply
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <Download className="h-4 w-4" />
            </Button>
            <Select defaultValue="2025-2026">
              <SelectTrigger className="h-9 w-[120px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025-2026">2025 - 2026</SelectItem>
                <SelectItem value="2024-2025">2024 - 2025</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {leaveTypes.map((leave) => (
            <Card key={leave.id} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {leave.label}
                </CardTitle>
                <span className="text-xs text-slate-400">Granted: {leave.granted}</span>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center py-4">
                  <div className={`text-4xl font-bold ${leave.color}`}>
                    {leave.balance.toString().padStart(2, "0")}
                  </div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                    Balance
                  </div>
                  <Button variant="link" className="mt-2 h-auto p-0 text-xs text-blue-600">
                    View Details
                  </Button>
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                    <span>{leave.consumed} of {leave.granted} Consumed</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(leave.consumed / leave.granted) * 100}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
