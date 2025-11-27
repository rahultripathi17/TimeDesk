"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Info, Check, ChevronsUpDown, Plus } from "lucide-react";
import { format, differenceInCalendarDays, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useState, useMemo } from "react";
import { DateRange } from "react-day-picker";

// Mock data for leave balances
const LEAVE_BALANCES: Record<string, number> = {
  cl: 12,
  pl: 18,
  sl: 10,
  bl: 3,
};

// Mock data for users
const USERS = [
  { value: "rahul", label: "Rahul Tripathi" },
  { value: "aditya", label: "Aditya Kumar" },
  { value: "priya", label: "Priya Singh" },
  { value: "amit", label: "Amit Sharma" },
  { value: "sneha", label: "Sneha Gupta" },
];

export default function LeaveApplyPage() {
  const [date, setDate] = useState<DateRange | undefined>();
  const [leaveType, setLeaveType] = useState<string>("");
  const [openCC, setOpenCC] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedCC, setSelectedCC] = useState<string[]>([]);

  const leaveBalance = useMemo(() => {
    return leaveType ? LEAVE_BALANCES[leaveType] : 0;
  }, [leaveType]);

  const applyingForDays = useMemo(() => {
    if (date?.from && date?.to) {
      const diff = differenceInCalendarDays(date.to, date.from);
      return diff >= 0 ? diff + 1 : 0;
    } else if (date?.from) {
      return 1;
    }
    return 0;
  }, [date]);

  const toggleCC = (value: string) => {
    setSelectedCC((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  return (
    <AppShell role="employee">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
        <header className="mb-6">
          <h1 className="text-lg font-semibold text-slate-900">Leave Apply</h1>
        </header>

        {/* Tabs (Visual only) */}
        <div className="mb-6 flex border-b">
          <button className="border-b-2 border-blue-500 px-6 py-2 text-sm font-medium text-blue-600">
            Apply
          </button>
          <button className="px-6 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">
            Pending
          </button>
          <button className="px-6 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">
            History
          </button>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="mb-6 rounded-md bg-yellow-50 p-3 text-xs text-yellow-800 flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                Leave is earned by an employee and granted by the employer to take
                time off work. The employee is free to avail this leave in
                accordance with the company policy.
              </p>
            </div>

            <form className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Left Column */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="leave-type" className="text-xs font-medium">
                      Leave type <span className="text-red-500">*</span>
                    </Label>
                    <Select value={leaveType} onValueChange={setLeaveType}>
                      <SelectTrigger id="leave-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cl">Casual Leave</SelectItem>
                        <SelectItem value="pl">Privilege Leave</SelectItem>
                        <SelectItem value="sl">Sick Leave</SelectItem>
                        <SelectItem value="bl">Bereavement Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Date Range</Label>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="date"
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date?.from ? (
                            date.to ? (
                              <>
                                {format(date.from, "LLL dd, y")} -{" "}
                                {format(date.to, "LLL dd, y")}
                              </>
                            ) : (
                              format(date.from, "LLL dd, y")
                            )
                          ) : (
                            <span>Pick a date range</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={date?.from}
                          selected={date}
                          onSelect={setDate}
                          numberOfMonths={1}
                        />
                        <div className="p-3 border-t border-slate-100">
                          <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 h-8 text-xs"
                            onClick={() => setIsCalendarOpen(false)}
                          >
                            Done
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  {/* Placeholder for alignment if needed, or just empty space where sessions were */}
                  <div className="h-[72px] hidden md:block"></div>

                  <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-500 mt-auto">
                    <p className="font-medium text-slate-700">
                      Leave Balance:{" "}
                      {leaveType ? (
                        <span className="font-bold text-blue-600">
                          {leaveBalance}
                        </span>
                      ) : (
                        "-"
                      )}
                    </p>
                    <p>
                      Applying For:{" "}
                      <span className="font-semibold text-slate-900">
                        {applyingForDays} Days
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="applying-to" className="text-xs font-medium">
                    Applying to
                  </Label>
                  <Select>
                    <SelectTrigger id="applying-to">
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager1">
                        Rahul Tripathi (Manager)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cc-to" className="text-xs font-medium">
                    CC to
                  </Label>
                  <Popover open={openCC} onOpenChange={setOpenCC}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openCC}
                        className="w-full justify-between"
                      >
                        {selectedCC.length > 0
                          ? `${selectedCC.length} selected`
                          : "Select people..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Search people..." />
                        <CommandList>
                          <CommandEmpty>No person found.</CommandEmpty>
                          <CommandGroup>
                            {USERS.map((user) => (
                              <CommandItem
                                key={user.value}
                                value={user.value}
                                onSelect={() => {
                                  toggleCC(user.value);
                                  // Keep open for multiple selection
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedCC.includes(user.value)
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {user.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {selectedCC.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedCC.map((value) => {
                        const user = USERS.find((u) => u.value === value);
                        return (
                          <div
                            key={value}
                            className="bg-slate-100 text-slate-800 text-xs px-2 py-1 rounded-full flex items-center"
                          >
                            {user?.label}
                            <button
                              type="button"
                              onClick={() => toggleCC(value)}
                              className="ml-1 hover:text-red-500"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason" className="text-xs font-medium">
                  Reason
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Enter reason for leave"
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline">Cancel</Button>
                <Button className="bg-blue-600 hover:bg-blue-700">Apply</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
