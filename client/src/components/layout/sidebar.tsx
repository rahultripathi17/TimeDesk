"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  FileSpreadsheet,
  ShieldCheck,
  UserCog,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  ChevronDown,
  UserPlus,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/utils/supabase/client";

type Role = "employee" | "manager" | "hr" | "admin";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children?: NavItem[];
  exact?: boolean;
};

const baseItems: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard, exact: true },
];

const employeeExtra: NavItem[] = [
  { label: "My Attendance", href: "/dashboard/attendance", icon: CalendarDays },
  {
    label: "Leave",
    href: "/dashboard/leave",
    icon: FileSpreadsheet,
    children: [
      { label: "Leave Apply", href: "/dashboard/leave/apply", icon: FileSpreadsheet },
      { label: "Leave Balances", href: "/dashboard/leave/balance", icon: FileSpreadsheet },
    ],
  },
];

const managerExtra: NavItem[] = [
  { label: "Team Overview", href: "/manager", icon: Users },
  { label: "Team Attendance", href: "/manager/attendance", icon: CalendarDays },
  { label: "Approvals", href: "/manager/approvals", icon: FileSpreadsheet },
];

const hrExtra: NavItem[] = [
  { label: "Company Overview", href: "/hr", icon: LayoutDashboard },
  { label: "All Attendance", href: "/hr/attendance", icon: CalendarDays },
  { label: "Teams & Depts", href: "/hr/teams", icon: Users },
  { label: "Reports", href: "/hr/reports", icon: FileSpreadsheet },
  { label: "Policies", href: "/hr/policies", icon: ShieldCheck },
];

const adminExtra: NavItem[] = [
  { label: "Admin Home", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Users & Roles", href: "/admin/users", icon: Users, exact: true },
  { label: "Add New User", href: "/admin/users/new", icon: UserPlus, exact: true },
  { label: "Master Attendance", href: "/admin/attendance", icon: CalendarDays },
  { label: "Reports", href: "/admin/reports", icon: FileSpreadsheet },
];

export function navForRole(role: Role): NavItem[] {
  switch (role) {
    case "employee":
      return [...baseItems, ...employeeExtra];
    case "manager":
      return [...baseItems, ...managerExtra];
    case "hr":
      return [...baseItems, ...hrExtra];
    case "admin":
      return [...baseItems, ...adminExtra];
    default:
      return baseItems;
  }
}

// ------------------- Desktop Sidebar -------------------

export function DesktopSidebar({ role }: { role: Role }) {
  const router = useRouter();
  const pathname = usePathname();
  const items = navForRole(role);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Expanded if NOT collapsed OR if hovered while collapsed
  const isExpanded = !isCollapsed || isHovered;

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const isActive = item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isItemExpanded = expandedItems.includes(item.label);

    return (
      <div key={item.href}>
        {hasChildren ? (
          <div
            className={cn(
              "flex items-center gap-3 rounded-md px-2.5 py-2 transition-colors relative group cursor-pointer",
              isActive && !hasChildren
                ? "bg-slate-900 text-slate-50"
                : "text-slate-600 hover:bg-slate-100",
              !isExpanded && "justify-center px-2",
              depth > 0 && "ml-4" // Indent children
            )}
            onClick={() => toggleExpand(item.label)}
            title={!isExpanded ? item.label : undefined}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 shrink-0" />
                <span
                  className={cn(
                    "whitespace-nowrap transition-all duration-300 origin-left",
                    isExpanded
                      ? "w-auto opacity-100 scale-100"
                      : "w-0 opacity-0 scale-0 hidden"
                  )}
                >
                  {item.label}
                </span>
              </div>
              {isExpanded && (
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    isItemExpanded && "rotate-180"
                  )}
                />
              )}
            </div>
          </div>
        ) : (
          <Link
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-2.5 py-2 transition-colors relative group cursor-pointer",
              isActive
                ? "bg-slate-900 text-slate-50"
                : "text-slate-600 hover:bg-slate-100",
              !isExpanded && "justify-center px-2",
              depth > 0 && "ml-4" // Indent children
            )}
            title={!isExpanded ? item.label : undefined}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span
              className={cn(
                "whitespace-nowrap transition-all duration-300 origin-left",
                isExpanded
                  ? "w-auto opacity-100 scale-100"
                  : "w-0 opacity-0 scale-0 hidden"
              )}
            >
              {item.label}
            </span>
          </Link>
        )}

        {/* Render children */}
        {hasChildren && isExpanded && isItemExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map((child) => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Placeholder to reserve space in the flex layout */}
      <div
        className={cn(
          "hidden shrink-0 transition-all duration-300 md:block",
          isCollapsed ? "w-16" : "w-64"
        )}
      />

      {/* Actual Sidebar (Fixed) */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r bg-white transition-all duration-300 ease-in-out md:flex",
          isExpanded ? "w-64 shadow-xl" : "w-16"
        )}
        onMouseEnter={() => isCollapsed && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Logo header */}
        <div className="flex h-14 items-center justify-between border-b px-3">
          <div
            className={cn(
              "flex items-center gap-2 overflow-hidden transition-all duration-300",
              isExpanded ? "w-auto opacity-100" : "w-0 opacity-0"
            )}
          >
            <Image
              src="/hoora-logo.png"
              alt="Hoora logo"
              width={100}
              height={28}
              className="h-6 w-auto object-contain"
            />
          </div>

          {/* Toggle Button */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "ml-auto text-slate-400 hover:text-slate-600",
              !isExpanded && "mx-auto"
            )}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Nav list */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4 text-sm scrollbar-thin scrollbar-thumb-slate-200">
          {items.map((item) => renderNavItem(item))}
        </nav>

        {/* bottom area */}
        <div className="border-t px-3 py-3 text-xs text-slate-500 space-y-2">
          <div
            className={cn(
              "flex items-center overflow-hidden",
              isExpanded ? "justify-between" : "justify-center"
            )}
          >
            <span
              className={cn(
                "capitalize whitespace-nowrap",
                !isExpanded && "hidden"
              )}
            >
              {role === "hr" ? "HR" : role} panel
            </span>
            <button
              className={cn(
                "flex items-center gap-1 rounded-md p-1.5 text-[11px] hover:bg-slate-100",
                !isExpanded && "justify-center"
              )}
              title="Settings"
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span className={cn(!isExpanded && "hidden")}>Settings</span>
            </button>
          </div>

          <button
            onClick={handleLogout}
            className={cn(
              "flex w-full items-center gap-2 rounded-md p-1.5 text-[11px] text-red-600 hover:bg-red-50",
              !isExpanded && "justify-center"
            )}
            title="Logout"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={cn(!isExpanded && "hidden")}>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

// ------------------- Mobile Sidebar -------------------

export function MobileSidebar({ role }: { role: Role }) {
  const router = useRouter();
  const pathname = usePathname();
  const items = navForRole(role);
  const [open, setOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const isActive = item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isItemExpanded = expandedItems.includes(item.label);

    return (
      <div key={item.href}>
        {hasChildren ? (
          <div
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors cursor-pointer",
              isActive && !hasChildren
                ? "bg-slate-900 text-slate-50"
                : "text-slate-600 hover:bg-slate-100",
              depth > 0 && "ml-4"
            )}
            onClick={() => {
              if (hasChildren) {
                toggleExpand(item.label);
              } else {
                setOpen(false);
              }
            }}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  isItemExpanded && "rotate-180"
                )}
              />
            </div>
          </div>
        ) : (
          <Link
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors cursor-pointer",
              isActive
                ? "bg-slate-900 text-slate-50"
                : "text-slate-600 hover:bg-slate-100",
              depth > 0 && "ml-4"
            )}
            onClick={() => setOpen(false)}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        )}

        {hasChildren && isItemExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map((child) => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden shrink-0">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b p-4 h-14 flex justify-center">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <div className="flex items-center gap-2">
            <Image
              src="/hoora-logo.png"
              alt="Hoora logo"
              width={110}
              height={32}
              className="h-7 w-auto"
              priority
            />
          </div>
        </SheetHeader>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4 text-sm">
          {items.map((item) => renderNavItem(item))}
        </nav>

        <div className="border-t p-4 text-xs text-slate-500 space-y-3">
          <div className="flex items-center justify-between">
            <span className="capitalize">
              {role === "hr" ? "HR" : role} panel
            </span>
            <button className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-slate-100">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
