"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookText, Menu, X, TrendingUp, Calculator, Settings, Crosshair, BarChart3 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => setIsExpanded(!isExpanded);

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
    { label: "Journal", href: "/journal", icon: <BookText size={20} /> },
    { label: "Calculator", href: "/calculator", icon: <Calculator size={20} /> },
    { label: "Target", href: "/target", icon: <Crosshair size={20} /> },
    { label: "Analytics", href: "/analytics", icon: <BarChart3 size={20} /> },
  ];

  return (
    <aside
      className={cn(
        "shrink-0 sticky top-0 z-40 h-[100dvh] transition-all duration-300 ease-in-out bg-zinc-950 border-r border-white/10 flex flex-col",
        isExpanded ? "w-64 absolute md:relative shadow-2xl md:shadow-none" : "w-16"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-white/10 h-16 shrink-0">
        <div className={cn("flex items-center gap-3 overflow-hidden transition-all", !isExpanded && "w-0 opacity-0")}>
          <TrendingUp className="text-emerald-500 shrink-0" size={24} />
          <span className="font-semibold text-white whitespace-nowrap tracking-tight">TradeJournal</span>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
          aria-label="Toggle Sidebar"
        >
          {isExpanded ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <nav className="flex-1 py-4 flex flex-col gap-2 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all group relative",
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 font-medium"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              )}
              title={!isExpanded ? item.label : undefined}
            >
              <div className="shrink-0 flex items-center justify-center w-8">
                {item.icon}
              </div>
              <span
                className={cn(
                  "whitespace-nowrap transition-all duration-300",
                  !isExpanded ? "opacity-0 w-0 hidden" : "opacity-100"
                )}
              >
                {item.label}
              </span>
              
              {!isExpanded && (
                <div className="absolute left-14 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>
      
      <div className="px-2 py-4 border-t border-white/10 flex flex-col gap-2">
        <Link
          href="/billing"
          className={cn(
            "flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all group relative",
            pathname === "/billing"
              ? "bg-emerald-500/10 text-emerald-400 font-medium"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          )}
          title={!isExpanded ? "Billing" : undefined}
        >
          <div className="shrink-0 flex items-center justify-center w-8">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          </div>
          <span
            className={cn(
              "whitespace-nowrap transition-all duration-300",
              !isExpanded ? "opacity-0 w-0 hidden" : "opacity-100"
            )}
          >
            Billing
          </span>
          {!isExpanded && (
            <div className="absolute left-14 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
              Billing
            </div>
          )}
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all group relative mt-1",
            pathname === "/settings"
              ? "bg-emerald-500/10 text-emerald-400 font-medium"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          )}
          title={!isExpanded ? "Settings" : undefined}
        >
          <div className="shrink-0 flex items-center justify-center w-8">
            <Settings size={20} />
          </div>
          <span
            className={cn(
              "whitespace-nowrap transition-all duration-300",
              !isExpanded ? "opacity-0 w-0 hidden" : "opacity-100"
            )}
          >
            Settings
          </span>
          {!isExpanded && (
            <div className="absolute left-14 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
              Settings
            </div>
          )}
        </Link>
        <div className={cn("text-xs text-zinc-500 transition-all text-center mt-2", !isExpanded && "opacity-0 hidden")}>
          v1.0.0 &copy; 2026
        </div>
      </div>
    </aside>
  );
}
