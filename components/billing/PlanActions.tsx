"use client";

import { differenceInDays } from "date-fns";

interface PlanActionsProps {
  plan: string;
  isPro: boolean;
  expiryDate: string | number | null;
  onUpgradeClick: () => void;
  onManageClick: () => void;
}

export default function PlanActions({ plan, isPro, expiryDate, onUpgradeClick, onManageClick }: PlanActionsProps) {
  const isMonthly = plan === "pro_monthly";
  const daysLeft = expiryDate ? differenceInDays(new Date(expiryDate), new Date()) : 0;
  const isExpired = isPro && daysLeft < 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 pt-8 border-t border-white/5">
      
      {!isPro ? (
        <>
          <button 
            onClick={onUpgradeClick}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#00FFB2] text-black font-bold rounded-xl hover:shadow-[0_0_20px_rgba(0,255,178,0.4)] hover:-translate-y-0.5 transition-all text-sm"
          >
            Upgrade to Pro
          </button>
        </>
      ) : isExpired ? (
        <>
          <button 
            onClick={onUpgradeClick}
            className="w-full sm:w-auto px-8 py-3.5 bg-red-500 text-white font-bold rounded-xl hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:-translate-y-0.5 transition-all text-sm flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Renew Subscription
          </button>
          <button 
            onClick={onManageClick}
            className="w-full sm:w-auto px-6 py-3.5 bg-transparent border border-zinc-800 text-zinc-300 font-medium rounded-xl hover:bg-zinc-800 hover:text-white transition-all text-sm"
          >
            Contact Support
          </button>
        </>
      ) : (
        <>
          {isMonthly && (
             <button 
               onClick={onUpgradeClick}
               className="w-full sm:w-auto px-8 py-3.5 bg-zinc-800 border border-zinc-700 text-white font-bold rounded-xl hover:border-[#00FFB2] hover:bg-zinc-800 transition-all text-sm group relative overflow-hidden"
             >
               <span className="relative z-10 flex items-center gap-2">
                 Switch to Yearly <span className="bg-[#00FFB2] text-black px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase">Save 40%</span>
               </span>
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00FFB2]/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
             </button>
          )}
          <button 
            onClick={onManageClick}
            className="w-full sm:w-auto px-6 py-3.5 bg-transparent text-zinc-400 font-medium rounded-xl hover:text-white transition-all text-sm underline decoration-white/20 underline-offset-4"
          >
            Cancel Subscription
          </button>
        </>
      )}

    </div>
  );
}
