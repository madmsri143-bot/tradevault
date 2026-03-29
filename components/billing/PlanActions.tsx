"use client";

import { differenceInDays } from "date-fns";
import { AlertCircle } from "lucide-react";

interface PlanActionsProps {
  plan: string;
  isPro: boolean;
  expiryDate: string | number | null;
  onUpgradeClick: () => void;
  onManageClick: () => void;
  onCancelTrial?: () => void;
}

export default function PlanActions({ plan, isPro, expiryDate, onUpgradeClick, onManageClick, onCancelTrial }: PlanActionsProps) {
  const isMonthly = plan === "pro_monthly";
  const daysLeft = expiryDate ? differenceInDays(new Date(expiryDate), new Date()) : 0;
  const isExpired = isPro && daysLeft < 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 pt-8 border-t border-[#111827]">
      
      {plan === "trial" ? (
        <div className="flex flex-col gap-3 w-full sm:w-auto">
          {daysLeft === 1 && (
            <div className="p-3 mb-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold w-full flex items-center gap-2">
              <AlertCircle size={14} /> Your free trial is ending. Upgrade to Pro or continue with Standard Free plan.
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
             <button 
               onClick={onUpgradeClick}
               className="w-full sm:w-auto px-8 py-3.5 bg-[#111827] border border-[#C9A646]/50 text-[#C9A646] hover:bg-[#C9A646]/10 font-bold rounded-xl hover:shadow-[0_0_10px_rgba(201,166,70,0.15)] hover:-translate-y-0.5 transition-all text-sm"
             >
               Upgrade Now
             </button>
             <button 
               onClick={onCancelTrial}
               className="w-full sm:w-auto px-6 py-3.5 bg-transparent border border-zinc-800 text-[#E5E7EB] font-medium rounded-xl hover:bg-zinc-800 hover:text-[#E5E7EB] transition-all text-sm"
             >
               Switch to Standard Free
             </button>
          </div>
        </div>
      ) : !isPro ? (
        <>
          <button 
            onClick={onUpgradeClick}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#111827] border border-[#C9A646]/50 text-[#C9A646] hover:bg-[#C9A646]/10 font-bold rounded-xl hover:shadow-[0_0_10px_rgba(201,166,70,0.15)] hover:-translate-y-0.5 transition-all text-sm flex items-center gap-2"
          >
            Upgrade to Pro
          </button>
          <button 
            onClick={onManageClick}
            className="w-full sm:w-auto px-6 py-3.5 bg-transparent border border-zinc-800 text-[#E5E7EB] font-medium rounded-xl hover:bg-zinc-800 hover:text-[#E5E7EB] transition-all text-sm"
          >
            Contact Support
          </button>
        </>
      ) : (
        <>
          {isMonthly && (
             <button 
               onClick={onUpgradeClick}
               className="w-full sm:w-auto px-8 py-3.5 bg-zinc-800 border border-zinc-700 text-[#E5E7EB] font-bold rounded-xl hover:border-[#C9A646] hover:bg-zinc-800 transition-all text-sm group relative overflow-hidden"
             >
               <span className="relative z-10 flex items-center gap-2">
                 Switch to Pro Elite <span className="bg-[#111827] border border-[#C9A646]/50 text-[#C9A646] hover:bg-[#C9A646]/10 px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase">Save 40%</span>
               </span>
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#C9A646]/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
             </button>
          )}
          <button 
            onClick={onManageClick}
            className="w-full sm:w-auto px-6 py-3.5 bg-transparent text-[#9CA3AF] font-medium rounded-xl hover:text-[#E5E7EB] transition-all text-sm underline decoration-white/20 underline-offset-4"
          >
            Manage Subscription
          </button>
        </>
      )}

    </div>
  );
}
