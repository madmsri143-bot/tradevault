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
    if (plan === "trial") {
      const isExpired = expiryDate ? new Date(expiryDate).getTime() < Date.now() : false;
      if (isExpired) return { text: "Trial Expired", color: "text-[#FF4D6D]", bg: "bg-[#FF4D6D]/10", border: "border-[#FF4D6D]/20", icon: AlertCircle };
      return { text: "Active Trial", color: "text-[#D4AF37]", bg: "bg-[#D4AF37]/10", border: "border-[#D4AF37]/20", icon: Clock };
    }
    
    if (!isPro) return { text: "Standard Free", color: "text-zinc-600 dark:text-[#A0A0A0]", bg: "bg-white/5", border: "border-white/10", icon: Clock };
    
    // Check if expired
    const isExpired = expiryDate ? new Date(expiryDate).getTime() < Date.now() : false;
    if (isExpired) return { text: "Expired", color: "text-[#FF4D6D]", bg: "bg-[#FF4D6D]/10", border: "border-[#FF4D6D]/20", icon: AlertCircle };

    return { text: "Active Pro", color: "text-[#10B981]", bg: "bg-[#10B981]/10", border: "border-[#10B981]/20", icon: CheckCircle2 };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  const daysLeft = expiryDate ? differenceInDays(new Date(expiryDate), new Date()) : 0;
  const isExpired = daysLeft < 0;

  return (
    <div className="relative group overflow-hidden rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md p-8 shadow-2xl transition-all hover:border-[#D4AF37]/20">
      {/* Subtle Glow Background */}
      {status.text === "Active" && (
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#D4AF37]/5 blur-3xl rounded-full pointer-events-none transition-all group-hover:bg-[#D4AF37]/10" />
      )}

      {/* Header / Status */}
      <div className="flex items-center justify-between mb-8">
        <div>
          {plan === "trial" && !isExpired && (
            <p className="text-xs text-[#9CA3AF] mb-2 font-medium">
              <span className="text-[#10B981] font-bold">Professional Trial</span>
              {" — "}
              {daysLeft === 1 ? "ends tomorrow" : daysLeft === 0 ? "ends today" : `${daysLeft} days remaining`}
            </p>
          )}
          <h2 className="text-xl font-medium text-[#E5E7EB] flex items-center gap-2">
            <Zap size={20} className="text-[#D4AF37]" />
            Current Plan
          </h2>
          <p className="text-sm text-[#9CA3AF] mt-1">Manage your subscription and billing</p>
        </div>
        
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${status.bg} ${status.border}`}>
          <StatusIcon size={14} className={status.color} />
          <span className={`text-xs font-semibold tracking-wide uppercase ${status.color}`}>
            {status.text}
          </span>
        </div>
      </div>

      {/* Main Hero Content */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-black/40 p-6 rounded-xl border border-white/5">
        
        {/* Left: Plan Info */}
        <div>
          <h3 className="text-3xl font-bold text-[#E5E7EB] mb-2">
            {isYearly ? "Pro Yearly" : isMonthly ? "Pro Monthly" : plan === "trial" ? "Professional Trial" : "Standard Free"}
          </h3>
          <div className="text-[#D4AF37] font-semibold text-lg mb-2">
            {isYearly ? "$19.99 / year" : isMonthly ? "$2.99 / month" : plan === "trial" ? "$0 for 7 Days" : "$0 / forever"}
          </div>
          <p className="text-sm text-zinc-600 dark:text-[#A0A0A0] max-w-sm">
            {plan === "free" ? "Limited logging, basic analytics, and no data export functions." : "Full analytics, pacing targets, file exports, and artificial intelligence psychological mistake detection."}
          </p>
        </div>

        {/* Right: Expiry Info */}
        <div className="md:text-right flex flex-col items-start md:items-end">
          {(isPro || plan === "trial") && !isExpired && (
            <>
              <div className="text-5xl font-black text-[#E5E7EB] tracking-tighter mb-1">
                {daysLeft} <span className="text-lg font-medium text-[#9CA3AF] tracking-normal">days left</span>
              </div>
              <div className="text-sm text-[#9CA3AF] mt-2">
                {plan === "trial" ? "Trial ends on" : "Renews on"} <span className="text-[#E5E7EB] font-medium">{expiryDate ? format(new Date(expiryDate), "MMM dd, yyyy") : "N/A"}</span>
              </div>
            </>
          )}
          {(isPro || plan === "trial") && isExpired && (
            <>
              <div className="text-5xl font-black text-[#FF4D6D] tracking-tighter mb-1">
                0 <span className="text-lg font-medium text-[#FF4D6D]/50 tracking-normal">days left</span>
              </div>
              <div className="text-sm text-[#FF4D6D] mt-2">
                Expired on <span className="text-[#E5E7EB] font-medium">{expiryDate ? format(new Date(expiryDate), "MMM dd, yyyy") : "N/A"}</span>
              </div>
            </>
          )}
          {!isPro && plan !== "trial" && (
            <>
               <div className="text-3xl font-black text-[#D4AF37] tracking-tighter mb-1">
                Upgrade Ready
              </div>
              <div className="text-sm text-[#D4AF37]/70 mt-2">
                Unlock full access today.
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
