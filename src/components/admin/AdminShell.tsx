"use client";

import { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickActionNotice, setQuickActionNotice] = useState<string | null>(null);

  const handleQuickAction = (actionName: string) => {
    setQuickActionNotice(actionName);
  };

  const closeNotice = () => {
    setQuickActionNotice(null);
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#111827] flex flex-col antialiased">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#071A33]/50 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <AdminSidebar onCloseMobile={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <AdminHeader
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onQuickAction={handleQuickAction}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        <footer className="border-t border-[#E4E8EF] bg-white px-4 sm:px-6 lg:px-8 py-3 text-xs text-[#667085] flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Abroad Bulletin — Admin Management Panel (Phase 1 Foundation)</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Backend Ready • Mock System Connected
          </span>
        </footer>
      </div>

      {/* Quick Action Info Modal */}
      {quickActionNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071A33]/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-[#E4E8EF] p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#1769E0]/10 text-[#1769E0] flex items-center justify-center shrink-0 font-bold">
                +
              </div>
              <div>
                <h3 className="text-base font-bold text-[#111827]">
                  {quickActionNotice}
                </h3>
                <p className="text-xs text-[#667085]">Action Triggered</p>
              </div>
            </div>

            <div className="mt-4 p-3.5 bg-[#F7F9FC] border border-[#E4E8EF] rounded-lg text-sm text-[#4B5563] leading-relaxed">
              <p className="font-semibold text-[#111827] mb-1">
                Phase 1: Admin Panel Foundation
              </p>
              This action interface will be connected in Phase 2 with database CRUD handlers and validation schemas.
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={closeNotice}
                className="px-4 py-2 text-sm font-medium text-white bg-[#1769E0] hover:bg-[#1357bd] rounded-lg transition-colors cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
