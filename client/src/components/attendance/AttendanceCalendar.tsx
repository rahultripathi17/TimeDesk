"use client";

import { JSX, useEffect, useState, useMemo } from "react";
import {
  addMonths,
  addDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  format,
  isSameMonth,
  isSameDay,
  startOfDay,
  isBefore,
  getDay,
  eachDayOfInterval,
} from "date-fns";
import { cn } from "@/lib/utils"; // shadcn helper
import { Card, CardContent } from "@/components/ui/card";

// ------------ Types ------------

type AttendanceStatus =
  | "OFFICE" // Present
  | "REMOTE" // Remote / WFH
  | "PL" // Privilege Leave
  | "CL" // Casual Leave
  | "SL" // Sick Leave
  | "BL" // Bereavement Leave
  | "ABSENT";

type AttendanceRecord = {
  date: string; // '2025-11-03'
  status: AttendanceStatus;
};

type StatusStyle = {
  label: string; // full text for inside the cell
  short: string; // small code for legend
  bg: string;
  text: string;
  border: string;
};

// ------------ Styles per status ------------

const statusStyles: Record<AttendanceStatus, StatusStyle> = {
  OFFICE: {
    label: "Present",
    short: "P",
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    border: "border-emerald-300",
  },
  REMOTE: {
    label: "Remote / Work from Home",
    short: "R",
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-300",
  },
  PL: {
    label: "Privilege Leave",
    short: "PL",
    bg: "bg-orange-100",
    text: "text-orange-800",
    border: "border-orange-300",
  },
  CL: {
    label: "Casual Leave",
    short: "CL",
    bg: "bg-orange-100",
    text: "text-orange-800",
    border: "border-orange-300",
  },
  SL: {
    label: "Sick Leave",
    short: "SL",
    bg: "bg-orange-100",
    text: "text-orange-800",
    border: "border-orange-300",
  },
  BL: {
    label: "Bereavement Leave",
    short: "BL",
    bg: "bg-orange-100",
    text: "text-orange-800",
    border: "border-orange-300",
  },
  ABSENT: {
    label: "Absent",
    short: "A",
    bg: "bg-rose-100",
    text: "text-rose-800",
    border: "border-rose-300",
  },
};

// ------------ Mock data (replace with API later) ------------

const mockRecordsForMonth = (month: Date): AttendanceRecord[] => {
  const monthStr = format(month, "yyyy-MM");
  return [
    { date: `${monthStr}-03`, status: "CL" },
    { date: `${monthStr}-04`, status: "OFFICE" },
    { date: `${monthStr}-05`, status: "OFFICE" },
    { date: `${monthStr}-06`, status: "OFFICE" },
    { date: `${monthStr}-07`, status: "OFFICE" },
    { date: `${monthStr}-10`, status: "OFFICE" },
    { date: `${monthStr}-13`, status: "PL" },
    { date: `${monthStr}-17`, status: "OFFICE" },
    { date: `${monthStr}-20`, status: "SL" },
    { date: `${monthStr}-21`, status: "OFFICE" },
    { date: `${monthStr}-22`, status: "BL" },
    { date: `${monthStr}-24`, status: "ABSENT" },
    { date: `${monthStr}-26`, status: "REMOTE" },
  ];
};

function getRecordForDate(records: AttendanceRecord[], date: Date) {
  const iso = format(date, "yyyy-MM-dd");
  return records.find((r) => r.date === iso);
}

// ------------ Component ------------

export function AttendanceCalendar({ employeeId }: { employeeId: string }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  // today (date-only)
  const today = startOfDay(new Date());

  useEffect(() => {
    // later: fetch from API with employeeId + month
    setRecords(mockRecordsForMonth(currentMonth));
  }, [currentMonth, employeeId]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  // Calculate stats
  const stats = useMemo(() => {
    let present = 0;
    let wfh = 0;
    let leave = 0;
    let absent = 0;

    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    daysInMonth.forEach((day) => {
      const rec = getRecordForDate(records, day);
      
      if (rec) {
        if (rec.status === "OFFICE") present++;
        else if (rec.status === "REMOTE") wfh++;
        else if (["PL", "CL", "SL", "BL"].includes(rec.status)) leave++;
        else if (rec.status === "ABSENT") absent++;
      } else {
        // Auto-ABSENT logic
        if (isBefore(day, today) && getDay(day) !== 0) {
          absent++;
        }
      }
    });

    return { present, wfh, leave, absent };
  }, [records, monthStart, monthEnd, today]);

  const rows: JSX.Element[] = [];
  let day = gridStart;

  while (day <= gridEnd) {
    const days: JSX.Element[] = [];

    for (let i = 0; i < 7; i++) {
      const inMonth = isSameMonth(day, monthStart);
      const rec = getRecordForDate(records, day);
      const explicitStyle = rec ? statusStyles[rec.status] : undefined;
      const isToday = isSameDay(day, today);

      // 🔸 Auto-ABSENT logic:
      // If no record, day is in this month, is before today, and not Sunday → Absent
      let effectiveStyle = explicitStyle;
      if (!explicitStyle && inMonth && isBefore(day, today) && getDay(day) !== 0) {
        effectiveStyle = statusStyles.ABSENT;
      }

      days.push(
        <div
          key={day.toISOString()}
          className={cn(
            "flex min-h-[60px] sm:min-h-[72px] lg:min-h-[82px] w-full flex-col border border-slate-100 p-1.5 sm:p-2 text-left text-[10px] sm:text-xs transition-colors",
            !inMonth && "bg-slate-50/70 text-slate-300",
            effectiveStyle && inMonth && `${effectiveStyle.bg} ${effectiveStyle.border}`,
            !effectiveStyle && inMonth && "bg-white",
            isToday && "ring-2 ring-slate-900 ring-offset-1 z-10"
          )}
        >
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[10px] sm:text-[11px] font-medium",
                isToday
                  ? "bg-slate-900 text-slate-50"
                  : effectiveStyle
                  ? "bg-white/70 text-slate-800"
                  : "bg-slate-50 text-slate-600"
              )}
            >
              {format(day, "d")}
            </span>
          </div>

          {effectiveStyle && (
            <div
              className={cn(
                "mt-1.5 line-clamp-2 leading-snug font-semibold",
                effectiveStyle.text
              )}
            >
              {effectiveStyle.label}
            </div>
          )}

          {!effectiveStyle && inMonth && (
            <div className="mt-1.5 text-[10px] text-slate-400">
              -
            </div>
          )}
        </div>
      );

      day = addDays(day, 1);
    }

    rows.push(
      <div key={day.toISOString()} className="grid grid-cols-7">
        {days}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Present</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.present}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">WFH</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">{stats.wfh}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Leave</p>
            <p className="mt-1 text-2xl font-bold text-orange-600">{stats.leave}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Absent</p>
            <p className="mt-1 text-2xl font-bold text-rose-600">{stats.absent}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mx-auto w-full max-w-full overflow-hidden rounded-xl border bg-white shadow-sm">
        {/* header with prev/next month */}
        <div className="flex items-center justify-between border-b px-3 sm:px-4 py-2.5 sm:py-3">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900"
            onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
          >
            <span aria-hidden>◀</span> Prev
          </button>
          <div className="text-sm font-semibold text-slate-900">
            {format(currentMonth, "MMMM yyyy")}
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            Next <span aria-hidden>▶</span>
          </button>
        </div>

        {/* weekday header */}
        <div className="grid grid-cols-7 border-b bg-slate-50 text-center text-[10px] sm:text-[11px] font-medium text-slate-500">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="px-1.5 py-1.5">
              {d}
            </div>
          ))}
        </div>

        {/* days grid */}
        <div>{rows}</div>

        {/* legend */}
        <div className="flex flex-wrap gap-2 sm:gap-3 border-t px-3 sm:px-4 py-2.5 text-[10px] sm:text-[11px] text-slate-500">
          <span className="font-medium">Legend:</span>
          {(
            [
              "OFFICE",
              "REMOTE",
              "PL",
              "CL",
              "SL",
              "BL",
              "ABSENT",
            ] as AttendanceStatus[]
          ).map((key) => {
            const val = statusStyles[key];
            return (
              <span key={key} className="inline-flex items-center gap-1">
                <span
                  className={cn(
                    "h-3 w-3 rounded-sm border",
                    val.bg,
                    val.border
                  )}
                />
                <span className="font-medium">{val.short}</span>
                <span className="hidden sm:inline text-slate-400">
                  · {val.label}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
