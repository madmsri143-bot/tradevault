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
    <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 pt-8 border-t border-zinc-200 dark:border-[#111827]">
      
      {plan === "trial" ? (
        <div className="flex flex-col gap-3 w-full sm:w-auto">
          {daysLeft === 1 && (
            <div className="p-3 mb-2 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold w-full flex items-center gap-2">
              <AlertCircle size={14} /> Your free trial is ending. Upgrade to Pro or continue with Standard Free plan.
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
             <button 
               onClick={onUpgradeClick}
               className="luxury-button-gold w-full sm:w-auto px-8 py-3.5 h-auto text-sm"
             >
               Upgrade Now
             </button>
             <button 
               onClick={onCancelTrial}
               className="w-full sm:w-auto px-6 py-3.5 bg-transparent border border-white/10 text-[#E5E7EB] font-medium rounded-xl hover:bg-white/5 transition-all text-sm"
             >
               Switch to Standard Free
             </button>
          </div>
        </div>
      ) : !isPro ? (
        <>
          <button 
            onClick={onUpgradeClick}
            className="luxury-button-gold w-full sm:w-auto px-8 py-3.5 h-auto text-sm"
          >
            Upgrade to Pro
          </button>
          <button 
            onClick={onManageClick}
            className="w-full sm:w-auto px-6 py-3.5 bg-transparent border border-white/10 text-[#E5E7EB] font-medium rounded-xl hover:bg-white/5 transition-all text-sm"
          >
            Contact Support
          </button>
        </>
      ) : (
        <>
          {isMonthly && (
             <button 
               onClick={onUpgradeClick}
               className="w-full sm:w-auto px-8 py-3.5 bg-white/5 border border-white/10 text-[#E5E7EB] font-bold rounded-xl hover:border-[#D4AF37] hover:bg-white/10 transition-all text-sm group relative overflow-hidden h-auto uppercase tracking-widest"
             >
               <span className="relative z-10 flex items-center gap-2">
                 Switch to Pro Elite <span className="bg-black/40 border border-[#D4AF37]/50 text-[#D4AF37] px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase">Save 40%</span>
               </span>
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37]/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
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
