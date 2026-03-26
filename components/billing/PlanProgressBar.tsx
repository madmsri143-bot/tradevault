"use client";

import { useEffect, useState } from "react";
import { differenceInDays } from "date-fns";

interface PlanProgressBarProps {
  plan: string;
  isPro: boolean;
  expiryDate: string | number | null;
}

export default function PlanProgressBar({ plan, isPro, expiryDate }: PlanProgressBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isPro || !expiryDate) {
      setProgress(0);
      return;
    }

    const end = new Date(expiryDate).getTime();
    const now = Date.now();

    // Determine the start date of the current billing cycle
    const isYearly = plan === "pro_yearly";
    const cycleLengthDays = isYearly ? 365 : 30;
    const cycleLengthMs = cycleLengthDays * 24 * 60 * 60 * 1000;
    
    // Approximate start date
    const start = end - cycleLengthMs;

    if (now >= end) {
      setProgress(100); // Expired
    } else if (now <= start) {
      setProgress(0);
    } else {
      const totalDuration = end - start;
      const elapsed = now - start;
      const percentage = (elapsed / totalDuration) * 100;
      
      // Animate progress on load
      setTimeout(() => {
        setProgress(Math.min(100, Math.max(0, percentage)));
      }, 300);
    }
  }, [isPro, expiryDate, plan]);

  if (!isPro && !expiryDate) return null;

  return (
    <div className="w-full mt-6 animate-in fade-in duration-1000">
      <div className="flex items-center justify-between text-xs font-medium text-zinc-400 mb-2">
        <span>Current Cycle Usage</span>
        <span className={progress >= 90 ? "text-red-400" : "text-[#00FFB2]"}>
          {Math.round(progress)}% used
        </span>
      </div>
      
      {/* Premium Progress Bar Wrapper */}
      <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5 relative">
        <div 
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-[#00FFB2] rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
        {/* Shine effect overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] bg-[length:200%_100%] animate-[shimmer_2s_infinite]" style={{ clipPath: `inset(0 ${100 - progress}% 0 0)` }} />
      </div>
    </div>
  );
}
