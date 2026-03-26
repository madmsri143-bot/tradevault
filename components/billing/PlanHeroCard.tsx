"use client";

import { CheckCircle2, AlertCircle, Clock, Zap } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface PlanHeroCardProps {
  plan: string;
  isPro: boolean;
  expiryDate: string | number | null;
}

export default function PlanHeroCard({ plan, isPro, expiryDate }: PlanHeroCardProps) {
  const isMonthly = plan === "pro_monthly";
  const isYearly = plan === "pro_yearly";

  const getStatus = () => {
    if (!isPro) return { text: "Trial / Free", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", icon: Clock };
    
    // Check if expired
    const isExpired = expiryDate ? new Date(expiryDate).getTime() < Date.now() : false;
    if (isExpired) return { text: "Expired", color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20", icon: AlertCircle };

    return { text: "Active", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", icon: CheckCircle2 };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  const daysLeft = expiryDate ? differenceInDays(new Date(expiryDate), new Date()) : 0;
  const isExpired = daysLeft < 0;

  return (
    <div className="relative group overflow-hidden rounded-2xl border border-white/5 bg-[#0B0F14] p-8 shadow-2xl transition-all hover:border-[#00FFB2]/20">
      {/* Subtle Glow Background */}
      {status.text === "Active" && (
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#00FFB2]/5 blur-3xl rounded-full pointer-events-none transition-all group-hover:bg-[#00FFB2]/10" />
      )}

      {/* Header / Status */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-medium text-white flex items-center gap-2">
            <Zap size={20} className="text-[#00FFB2]" />
            Current Plan
          </h2>
          <p className="text-sm text-zinc-400 mt-1">Manage your subscription and billing</p>
        </div>
        
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${status.bg} ${status.border}`}>
          <StatusIcon size={14} className={status.color} />
          <span className={`text-xs font-semibold tracking-wide uppercase ${status.color}`}>
            {status.text}
          </span>
        </div>
      </div>

      {/* Main Hero Content */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-zinc-950/50 p-6 rounded-xl border border-white/5">
        
        {/* Left: Plan Info */}
        <div>
          <h3 className="text-3xl font-bold text-white mb-2">
            {isYearly ? "Pro Elite" : isMonthly ? "Pro Starter" : "Professional Trial"}
          </h3>
          <div className="text-[#00FFB2] font-semibold text-lg mb-2">
            {isYearly ? "₹1999 / year" : isMonthly ? "₹299 / month" : "₹0 / forever"}
          </div>
          <p className="text-sm text-zinc-400 max-w-sm">
            Full analytics, pacing targets, and artificial intelligence psychological mistake detection.
          </p>
        </div>

        {/* Right: Expiry Info */}
        <div className="md:text-right flex flex-col items-start md:items-end">
          {isPro && !isExpired && (
            <>
              <div className="text-5xl font-black text-white tracking-tighter mb-1">
                {daysLeft} <span className="text-lg font-medium text-zinc-500 tracking-normal">days left</span>
              </div>
              <div className="text-sm text-zinc-400 mt-2">
                Renews on <span className="text-white font-medium">{expiryDate ? format(new Date(expiryDate), "MMM dd, yyyy") : "N/A"}</span>
              </div>
            </>
          )}
          {isPro && isExpired && (
            <>
              <div className="text-5xl font-black text-red-500 tracking-tighter mb-1">
                0 <span className="text-lg font-medium text-red-500/50 tracking-normal">days left</span>
              </div>
              <div className="text-sm text-red-400 mt-2">
                Expired on <span className="text-white font-medium">{expiryDate ? format(new Date(expiryDate), "MMM dd, yyyy") : "N/A"}</span>
              </div>
            </>
          )}
          {!isPro && (
            <>
               <div className="text-3xl font-black text-amber-500 tracking-tighter mb-1">
                Waiting for Upgrade
              </div>
              <div className="text-sm text-amber-400/70 mt-2">
                Unlock full access today.
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
