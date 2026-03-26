"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Lock, Zap, ChevronRight } from "lucide-react";
import UpgradeModal from "./UpgradeModal";

export interface UserAccessState {
  access: "premium" | "free";
  plan: "trial" | "free" | "pro";
  trial_days_left: number;
  subscription_days_left: number;
  loading: boolean;
}

export function useTrial() {
  const { user } = useAuth();
  const [status, setStatus] = useState<UserAccessState>({ 
    access: "free", 
    plan: "free", 
    trial_days_left: 0, 
    subscription_days_left: 0, 
    loading: true 
  });

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid, "settings", "profile"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const now = Date.now();
        
        let currentState: UserAccessState = { access: "free", plan: "free", trial_days_left: 0, subscription_days_left: 0, loading: false };

        // 1. Friend Access Whitelist
        const friendEmails = (process.env.NEXT_PUBLIC_FRIEND_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
        const isFriend = user.email ? friendEmails.includes(user.email.toLowerCase()) : false;
        
        // Trial Calculations
        const trialStart = data.trial_started_at || data.trialStartedAt || now;
        const trialEnd = data.trial_end_date || (trialStart + (7 * 24 * 60 * 60 * 1000));
        const trialLeft = Math.max(0, Math.floor((trialEnd - now) / (1000 * 60 * 60 * 24)));
        const isTrialActive = now <= trialEnd;

        // Subscription Calculations
        const hasPaidPlan = data.plan === "pro_monthly" || data.plan === "pro_yearly" || data.isPro;
        let subDaysLeft = 0;
        let isSubActive = false;
        if (hasPaidPlan && data.plan_expiry_date) {
           subDaysLeft = Math.max(0, Math.floor((data.plan_expiry_date - now) / (1000 * 60 * 60 * 24)));
           isSubActive = now < data.plan_expiry_date;
        } else if (data.isPro && !data.plan_expiry_date) {
           isSubActive = true; 
           subDaysLeft = 999; // Legacy handling
        }

        if (isFriend || isSubActive) {
           currentState = {
             access: "premium",
             plan: "pro",
             trial_days_left: trialLeft,
             subscription_days_left: isFriend ? 999 : subDaysLeft,
             loading: false
           };
        } else if (isTrialActive) {
           currentState = {
             access: "premium",
             plan: "trial",
             trial_days_left: trialLeft,
             subscription_days_left: 0,
             loading: false
           };
        } else {
           currentState = {
             access: "free",
             plan: "free",
             trial_days_left: 0,
             subscription_days_left: 0,
             loading: false
           };
        }

        setStatus(currentState);
      } else {
        setStatus({ access: "premium", plan: "trial", trial_days_left: 7, subscription_days_left: 0, loading: false });
      }
    });
    return () => unsub();
  }, [user]);

  return status;
}

export function TrialBanner() {
  const { access, plan, trial_days_left, loading } = useTrial();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (loading) return null;

  if (access === "premium" && plan === "pro") {
     return (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-4 py-3 rounded-xl mb-6 flex items-center justify-between text-sm font-bold animate-in fade-in duration-500">
           <div className="flex items-center gap-2"><Zap size={16} /> TradeVault Pro Active</div>
        </div>
     );
  }

  if (access === "free" || plan === "free") {
     return (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl mb-6 flex items-center justify-between text-sm font-bold animate-in fade-in duration-500">
           <div className="flex items-center gap-2"><Lock size={16} /> Trial Expired. Upgrade to Pro required.</div>
           <button onClick={() => setShowUpgrade(true)} className="px-4 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
              Upgrade Now
           </button>
           {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
        </div>
     );
  }

  return (
    <div className="bg-gradient-to-r from-[#00FFB2] to-[#3B82F6] p-[1px] rounded-xl mb-6 shadow-lg shadow-[#00FFB2]/5 animate-in slide-in-from-top-2 duration-500">
      <div className="bg-[#0B0F14] rounded-[11px] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
           <Zap size={18} className="text-[#00FFB2] fill-[#00FFB2]/20" />
           <p className="text-sm font-bold text-white">
             You are on a <span className="text-[#00FFB2]">Professional Trial</span>. Trial ends in {trial_days_left} days. <span className="text-zinc-400 font-medium">No charges applied.</span>
           </p>
        </div>
        <button onClick={() => setShowUpgrade(true)} className="text-xs font-black uppercase tracking-widest text-[#00FFB2] hover:text-white transition-colors flex items-center gap-1 group">
           Upgrade Now <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}

export function TrialGuard({ children, featureName }: { children: React.ReactNode; featureName: string }) {
  const { access, loading } = useTrial();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (loading) return <div className="animate-pulse h-64 bg-white/5 rounded-3xl" />;

  if (access === "free") {
    return (
      <div className="relative group">
        <div className="filter blur-md pointer-events-none opacity-40 select-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center p-6 z-10">
           <div className="bg-[#11161D] border-2 border-[#00FFB2]/20 p-8 rounded-[32px] max-w-sm text-center space-y-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-300">
              <div className="mx-auto w-16 h-16 bg-[#00FFB2]/10 rounded-2xl flex items-center justify-center border border-[#00FFB2]/20">
                <Lock size={32} className="text-[#00FFB2]" />
              </div>
              <div className="space-y-2">
                 <h3 className="text-xl font-bold text-white">Access Locked</h3>
                 <p className="text-zinc-400 text-sm leading-relaxed">
                   Your free trial has ended. Upgrade to Pro to unlock <strong>{featureName}</strong> and continue tracking like a professional.
                 </p>
              </div>
              <button onClick={() => setShowUpgrade(true)} className="w-full bg-[#00FFB2] text-black font-black py-4 rounded-2xl hover:shadow-[0_0_20px_rgba(0,255,178,0.4)] transition-all pointer-events-auto cursor-pointer">
                 Unlock Professional Access
              </button>
              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Immediate unlocking • Cancel anytime</p>
           </div>
        </div>
        {showUpgrade && <div className="pointer-events-auto"><UpgradeModal onClose={() => setShowUpgrade(false)} /></div>}
      </div>
    );
  }

  return <>{children}</>;
}
