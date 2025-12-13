"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";
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
  Megaphone,
  ClipboardCheck,
  RotateCcw,
  BarChart3,
  CalendarPlus,
  Scale,
  MapPin,
  Building2,
  Network,
  CalendarCheck2,
  Briefcase,
  Palmtree,
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
import { Badge } from "@/components/ui/badge";

type Role = "employee" | "manager" | "hr" | "admin";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children?: NavItem[];
  exact?: boolean;
  badge?: number;
};

const baseItems: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard, exact: true },
];

const employeeExtra: NavItem[] = [
  { label: "My Attendance", href: "/dashboard/attendance", icon: CalendarDays },
  { label: "Team Attendance", href: "/employee/team", icon: Users },
  {
    label: "Leaves",
    href: "/leaves/apply", // Or keep parent clickable?
    icon: CalendarPlus,
    children: [
      { label: "Apply Leave", href: "/leaves/apply", icon: CalendarPlus },
      {
        label: "Regularization",
        href: "/leaves/regularization",
        icon: CalendarCheck2,
      },
      {
        label: "Extra Work",
        href: "/leaves/extra-working-day",
        icon: Briefcase,
      },
      { label: "Leave Balance", href: "/leaves/balance", icon: Scale },
    ],
  },
];
const managerExtra: NavItem[] = [
  { label: "My Attendance", href: "/dashboard/attendance", icon: CalendarDays },
  { label: "Team Attendance", href: "/manager/attendance", icon: CalendarDays },
  {
    label: "Leaves",
    href: "/admin/leaves",
    icon: CalendarPlus,
    children: [
      {
        label: "Approvals",
        href: "/admin/leaves",
        icon: ClipboardCheck,
        exact: true,
      },
      { label: "Apply Leave", href: "/leaves/apply", icon: CalendarPlus },
      {
        label: "Regularization",
        href: "/leaves/regularization",
        icon: CalendarCheck2,
      },
      {
        label: "Extra Work",
        href: "/leaves/extra-working-day",
        icon: Briefcase,
      },
      { label: "Leave Balance", href: "/leaves/balance", icon: Scale },
    ],
  },
];

const hrExtra: NavItem[] = [
  { label: "My Attendance", href: "/dashboard/attendance", icon: CalendarDays },
  { label: "Teams & Depts", href: "/hr/teams", icon: Users },
  {
    label: "Leaves",
    href: "/leaves/apply",
    icon: CalendarPlus,
    children: [
      {
        label: "Approvals",
        href: "/admin/leaves",
        icon: ClipboardCheck,
        exact: true,
      },
      { label: "Apply Leave", href: "/leaves/apply", icon: CalendarPlus },
      {
        label: "Regularization",
        href: "/leaves/regularization",
        icon: CalendarCheck2,
      },
      {
        label: "Extra Work",
        href: "/leaves/extra-working-day",
        icon: Briefcase,
      },
      { label: "Leave Balance", href: "/leaves/balance", icon: Scale },
    ],
  },
  { label: "Reports", href: "/hr/reports", icon: BarChart3 },
  { label: "Policies", href: "/hr/policies", icon: ShieldCheck },
];

const adminExtra: NavItem[] = [
  // People & Organization
  { label: "Users & Roles", href: "/admin/users", icon: Users, exact: true },
  {
    label: "Add New User",
    href: "/admin/users/new",
    icon: UserPlus,
    exact: true,
  },
  { label: "Hierarchy", href: "/admin/hierarchy", icon: Network },
  { label: "Teams & Depts", href: "/admin/teams", icon: Users },
  { label: "Add Department", href: "/admin/departments", icon: Building2 },
  { label: "Office Locations", href: "/admin/locations", icon: MapPin },

  // Attendance & Time
  { label: "Master Attendance", href: "/admin/attendance", icon: CalendarDays },
  { label: "Holiday Calendar", href: "/admin/holidays", icon: Palmtree },
  {
    label: "Leaves",
    href: "/admin/leaves",
    icon: CalendarPlus,
    children: [
      {
        label: "Approvals",
        href: "/admin/leaves",
        icon: ClipboardCheck,
        exact: true,
      },
      { label: "Limits", href: "/admin/leaves/limits", icon: ShieldCheck },
      { label: "Reset Balances", href: "/admin/leaves/reset", icon: RotateCcw },
    ],
  },

  // Insights & Settings
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Policies", href: "/admin/policies", icon: ShieldCheck },
  { label: "Notice Board", href: "/admin/settings", icon: Megaphone },
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
  const [items, setItems] = useState<NavItem[]>(navForRole(role));
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  // Expanded if NOT collapsed OR if hovered while collapsed
  const isExpanded = !isCollapsed || isHovered;

  useEffect(() => {
    const fetchPendingCount = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { count, error } = await supabase
        .from("leaves")
        .select("*", { count: "exact", head: true })
        .eq("approver_id", user.id) // Align with MobileSidebar and Page logic
        .eq("status", "pending");

      if (!error && count !== null) {
        setPendingCount(count);
      }
    };

    // UPDATED: Fetch Policy Status
    const checkPolicyStatus = async () => {
      if (role === "admin") return; // Admin already has it in static list

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get User Dept
      const { data: profile } = await supabase
        .from("profiles")
        .select("department")
        .eq("id", user.id)
        .single();
      if (!profile?.department) return;

      // 2. Check Policy
      const { data: policy } = await supabase
        .from("department_policies")
        .select("is_enabled")
        .eq("department", profile.department)
        .maybeSingle();

      if (policy?.is_enabled) {
        setItems((prev) => {
          // Prevent duplicate
          if (prev.find((i) => i.label === "Company Policy")) return prev;
          return [
            ...prev,
            { label: "Company Policy", href: "/policy", icon: ShieldCheck },
          ];
        });
      }
    };

    if (role === "admin" || role === "manager" || role === "hr") {
      fetchPendingCount();
    }

    checkPolicyStatus();

    // Simplify interval for now
    const interval = setInterval(() => {
      if (role === "admin" || role === "manager" || role === "hr")
        fetchPendingCount();
    }, 60000);

    // Subscribe to changes
    const channel = supabase
      .channel("leaves_count_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leaves",
        },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [role]);

  // Update items when role changes (basic reset)
  useEffect(() => {
    setItems(navForRole(role));
  }, [role]);

  useEffect(() => {
    const newItems = navForRole(role).map((item) => {
      // Check if this item is "Leaves" (parent)
      if (item.label === "Leaves" && item.children) {
        const newChildren = item.children.map((child) => {
          if (child.label === "Approvals") {
            return {
              ...child,
              badge: pendingCount > 0 ? pendingCount : undefined,
            };
          }
          return child;
        });

        // Also badge the parent if children have badges?
        // User requested "in slider on icon", which implies parent if collapsed.
        // Let's add badge to parent if count > 0
        return {
          ...item,
          children: newChildren,
          badge: pendingCount > 0 ? pendingCount : undefined,
        };
      }
      return item;
    });
    setItems(newItems);
  }, [role, pendingCount]);

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
            <div
              className={cn(
                "flex w-full items-center",
                !isExpanded ? "justify-center" : "justify-between"
              )}
            >
              <div className="flex items-center gap-3 relative">
                <Icon className="h-5 w-5 shrink-0" />
                {/* Collapsed Badge (Parent) */}
                {!isExpanded && item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
                    {item.badge}
                  </span>
                )}
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
                {/* Expanded Badge (Parent) - Optional, maybe just show on child? 
                    Let's show on parent too if it's collapsed, but if expanded, maybe not needed if child has it.
                    Actually, let's show it on parent if expanded too, next to label? 
                    Or just rely on child. 
                    Let's show it on parent only if collapsed.
                */}
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
            <div className="relative flex items-center gap-3">
              <Icon className="h-5 w-5 shrink-0" />
              {/* Collapsed Badge (Child/Leaf) */}
              {!isExpanded && item.badge && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
                  {item.badge}
                </span>
              )}
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
            {/* Expanded Badge (Child/Leaf) */}
            {isExpanded && item.badge && item.badge > 0 && (
              <Badge className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 p-0 text-[10px] text-white hover:bg-red-600">
                {item.badge}
              </Badge>
            )}
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
              src="/timedesk-logo.png"
              alt="TimeDesk logo"
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

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4 text-sm [&::-webkit-scrollbar]:w-0 hover:[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-track]:bg-transparent transition-all">
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
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-1 rounded-md p-1.5 text-[11px] hover:bg-slate-100",
                !isExpanded && "justify-center"
              )}
              title="Settings"
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span className={cn(!isExpanded && "hidden")}>Settings</span>
            </Link>
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

          {/* Developer Credit */}
          <div
            className={cn(
              "pt-2 border-t border-slate-100 mt-2",
              !isExpanded && "hidden"
            )}
          >
            <a
              href="https://rahul-tripathi.web.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[10px] text-slate-400 hover:text-slate-600 text-center transition-colors font-medium"
            >
              Developed by Rahul Tripathi
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}

// ------------------- Mobile Sidebar -------------------

export function MobileSidebar({ role }: { role: Role }) {
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<NavItem[]>(navForRole(role));
  const [open, setOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchPendingCount = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { count, error } = await supabase
        .from("leaves")
        .select("*", { count: "exact", head: true })
        .eq("approver_id", user.id)
        .eq("status", "pending");

      if (!error && count !== null) {
        setPendingCount(count);
      }
    };

    fetchPendingCount();

    // UPDATED: Fetch Policy Status
    const checkPolicyStatus = async () => {
      if (role === "admin") return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("department")
        .eq("id", user.id)
        .single();
      if (!profile?.department) return;

      const { data: policy } = await supabase
        .from("department_policies")
        .select("is_enabled")
        .eq("department", profile.department)
        .maybeSingle();

      if (policy?.is_enabled) {
        setItems((prev) => {
          if (prev.find((i) => i.label === "Company Policy")) return prev;
          return [
            ...prev,
            { label: "Company Policy", href: "/policy", icon: ShieldCheck },
          ];
        });
      }
    };
    checkPolicyStatus();

    const channel = supabase
      .channel("leaves_count_changes_mobile")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leaves",
        },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role]);

  useEffect(() => {
    const newItems = navForRole(role).map((item) => {
      if (item.label === "Leaves" && item.children) {
        const newChildren = item.children.map((child) => {
          if (child.label === "Approvals") {
            return {
              ...child,
              badge: pendingCount > 0 ? pendingCount : undefined,
            };
          }
          return child;
        });
        return {
          ...item,
          children: newChildren,
          badge: pendingCount > 0 ? pendingCount : undefined,
        };
      }
      return item;
    });
    setItems(newItems);
  }, [role, pendingCount]);

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
              "flex items-center gap-3 rounded-md px-3 py-3 transition-colors cursor-pointer", // Increased padding for touch target
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
                {/* Mobile Badge (Parent) - Optional, maybe just show on child? */}
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
              "flex items-center gap-3 rounded-md px-3 py-3 transition-colors cursor-pointer", // Increased padding for touch target
              isActive
                ? "bg-slate-900 text-slate-50"
                : "text-slate-600 hover:bg-slate-100",
              depth > 0 && "ml-4"
            )}
            onClick={() => setOpen(false)}
          >
            <div className="flex items-center gap-3 w-full">
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
              {item.badge && item.badge > 0 && (
                <Badge className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 p-0 text-[10px] text-white hover:bg-red-600">
                  {item.badge}
                </Badge>
              )}
            </div>
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
              src="/timedesk-logo.png"
              alt="TimeDesk logo"
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
            <Link
              href="/settings"
              className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-slate-100"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>

          {/* Developer Credit */}
          <div className="pt-2 border-t border-slate-100 mt-2">
            <a
              href="https://rahul-tripathi.web.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[10px] text-slate-400 hover:text-slate-600 text-center transition-colors font-medium"
            >
              Developed by Rahul Tripathi
            </a>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
