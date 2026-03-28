"use client";

import { CheckCircle2 } from "lucide-react";

interface PlanComparisonProps {
  currentPlan: string;
  onSelectPlan: (plan: "monthly" | "yearly") => void;
}

export default function PlanComparison({ currentPlan, onSelectPlan }: PlanComparisonProps) {
  return (
    <div className="mt-12">
      <h3 className="text-xl font-bold text-white mb-6">Available Plans</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Card */}
        <div 
          onClick={() => onSelectPlan("monthly")}
          className={`relative p-8 rounded-2xl border transition-all cursor-pointer ${
             currentPlan === "pro_monthly" 
               ? "bg-[#00FFB2]/5 border-[#00FFB2]/50 shadow-[0_0_20px_rgba(0,255,178,0.1)]" 
               : "bg-[#0B0F14] border-white/5 hover:border-white/20"
          }`}
        >
          {currentPlan === "pro_monthly" && (
            <div className="absolute top-4 right-4 bg-[#00FFB2]/20 text-[#00FFB2] text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
               <CheckCircle2 size={12} />
               Current Plan
            </div>
          )}
          <h4 className="text-[#00FFB2] font-semibold tracking-widest text-sm uppercase mb-2">Pro Starter</h4>
          <div className="text-white text-4xl font-black tracking-tighter mb-1">
            $2.99 <span className="text-lg font-medium text-zinc-500 tracking-normal">/ mo</span>
          </div>
          <p className="text-zinc-400 text-sm mb-6 pb-6 border-b border-white/5">
            Perfect for casual traders looking to establish their execution baseline.
          </p>
          <ul className="space-y-4 text-sm text-zinc-300">
            <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-[#00FFB2]" /> Full Trade Analytics</li>
            <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-[#00FFB2]" /> Pacing Targets</li>
            <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-[#00FFB2]" /> Mistake Intelligence</li>
          </ul>
        </div>

        {/* Yearly Card (Highlighted) */}
        <div 
          onClick={() => onSelectPlan("yearly")}
          className={`relative p-8 rounded-2xl border transition-all cursor-pointer transform md:-translate-y-2 flex flex-col ${
             currentPlan === "pro_yearly" 
               ? "bg-[#00FFB2]/10 border-[#00FFB2] shadow-[0_0_30px_rgba(0,255,178,0.2)]" 
               : "bg-gradient-to-br from-[#0B0F14] to-zinc-900 border-[#00FFB2]/30 hover:border-[#00FFB2]/60"
          }`}
        >
          <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-[#00FFB2] text-black text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(0,255,178,0.4)]">
            Best Value &mdash; Save 40%
          </div>

          {currentPlan === "pro_yearly" && (
            <div className="absolute top-4 right-4 bg-[#00FFB2]/20 text-[#00FFB2] text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
               <CheckCircle2 size={12} />
               Current Plan
            </div>
          )}

          <h4 className="text-white font-semibold tracking-widest text-sm uppercase mb-2">Pro Elite</h4>
          <div className="text-white text-4xl font-black tracking-tighter mb-1 flex items-baseline gap-3">
            $20.99 <span className="text-lg font-medium text-zinc-500 tracking-normal">/ yr</span>
            <span className="text-sm text-zinc-500 line-through tracking-normal font-normal">$36</span>
          </div>
          <div className="text-[#00FFB2] text-sm font-bold mb-6 pb-6 border-b border-white/5">
            Breaks down to strictly $1.75/month.
          </div>
          
          <ul className="space-y-4 text-sm text-zinc-100 flex-1">
            <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-[#00FFB2]" /> Everything in Pro Starter, plus:</li>
            <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-[#00FFB2]" /> Long-Term Pattern Recognition</li>
            <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-[#00FFB2]" /> 40% Annual Discount</li>
            <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-[#00FFB2]" /> Priority Infrastructure</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
