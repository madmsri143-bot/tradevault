"use client";

import { ShieldCheck, Calendar, Hash } from "lucide-react";
import { format } from "date-fns";

interface SubscriptionDetailsProps {
  isPro: boolean;
  expiryDate: string | number | null;
  lastPaymentId?: string;
}

export default function SubscriptionDetails({ isPro, expiryDate, lastPaymentId }: SubscriptionDetailsProps) {
  if (!isPro) return null;

  return (
    <div className="mt-8 pt-8 border-t border-[#111827] opacity-80 hover:opacity-100 transition-opacity">
      <h3 className="text-sm font-bold tracking-widest uppercase text-[#9CA3AF] mb-6">Subscription Meta</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} className="text-blue-400" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] mb-1">Billing Method</div>
            <div className="text-sm font-medium text-[#E5E7EB] flex items-center gap-2">
              Razorpay SECURE
            </div>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Hash size={18} className="text-purple-400" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] mb-1">Last Transaction ID</div>
            <div className="text-sm font-mono text-[#E5E7EB]">
              {lastPaymentId !== "mock" ? lastPaymentId : "N/A (Trial)"}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Calendar size={18} className="text-emerald-400" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] mb-1">Next Billing Date</div>
            <div className="text-sm font-medium text-[#E5E7EB]">
              {expiryDate ? format(new Date(expiryDate), "MMM dd, yyyy") : "N/A"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
