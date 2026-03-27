"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Menu, X, TrendingUp, Calculator, Crosshair, Lock, Headset, Sun, Moon } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useModal } from "@/lib/ModalContext";
import { useTrial } from "@/components/TrialGuard";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { confirm } = useModal();
  const { plan } = useTrial();

  const toggleSidebar = () => setIsExpanded(!isExpanded);

  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    setIsDarkMode(!document.documentElement.classList.contains("light"));
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.remove("dark");
      root.classList.add("light");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
  };

  const navItems = [
    { label: "Dashboard", href: plan === "free" ? "/free-dashboard" : "/dashboard", icon: <LayoutDashboard size={20} /> },
    { label: "Calculator", href: "/calculator", icon: <Calculator size={20} /> },
    { label: "Target", href: "/target", icon: <Crosshair size={20} />, locked: plan === "free" },
  ];

  return (
    <aside
      className={cn(
        "shrink-0 sticky top-0 z-40 h-[100dvh] transition-all duration-300 ease-in-out bg-zinc-950 border-r border-white/10 flex flex-col",
        isExpanded ? "w-64 absolute md:relative shadow-2xl md:shadow-none" : "w-16"
      )}
    >
      <div className={cn("flex items-center border-b border-white/10 h-16 shrink-0", isExpanded ? "justify-between px-4" : "justify-center")}>
        {isExpanded && (
          <div className="flex items-center gap-3 overflow-hidden transition-all">
            <TrendingUp className="text-emerald-500 shrink-0" size={24} />
          </div>
        )}
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
          const isNavItemLocked = "locked" in item && item.locked;
          
          return (
            <Link
              key={item.href}
              href={isNavItemLocked ? "/billing" : item.href}
              className={cn(
                "flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all group relative",
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 font-medium"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900",
                isNavItemLocked && "opacity-50 grayscale cursor-not-allowed"
              )}
              title={!isExpanded ? item.label : undefined}
            >
              <div className="shrink-0 flex items-center justify-center w-8">
                {isNavItemLocked ? <Lock size={16} className="text-zinc-600" /> : item.icon}
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
                  {item.label} {isNavItemLocked ? " (Pro Only)" : ""}
                </div>
              )}
            </Link>
          );
        })}
      </nav>
      
      <div className={cn("px-2 py-4 border-t border-white/10 flex items-center gap-2", isExpanded ? "justify-start pl-4" : "justify-center flex-col")}>
        <button
          onClick={() => window.dispatchEvent(new Event("openSupportModal"))}
          className="p-2.5 text-zinc-400 hover:text-[#00FFB2] hover:bg-[#00FFB2]/10 rounded-lg transition-colors relative group"
          title="Support Chat"
        >
          <Headset size={20} />
          {!isExpanded && (
            <div className="absolute left-14 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
              Support
            </div>
          )}
        </button>
        <button
          onClick={toggleTheme}
          className="p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors relative group"
          title="Toggle Theme"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          {!isExpanded && (
            <div className="absolute left-14 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
              Theme
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
