"use client";

import type { ReactNode } from "react";
import { DesktopSidebar, MobileSidebar } from "./sidebar";

type Role = "employee" | "manager" | "hr" | "admin";

export function AppShell({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar (hidden on mobile) */}
      <DesktopSidebar role={role} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header (visible on mobile only) */}
        <header className="flex h-14 items-center border-b bg-white px-4 md:hidden">
          <MobileSidebar role={role} />
          <div className="ml-4 font-semibold text-slate-900">TimeDesk</div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
