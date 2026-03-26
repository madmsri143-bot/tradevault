"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Lock, Zap, ChevronRight } from "lucide-react";
import UpgradeModal from "./UpgradeModal";

interface TrialStatus {
  isTrial: boolean;
  daysLeft: number;
  isExpired: boolean;
  loading: boolean;
}

export function useTrial() {
  const { user } = useAuth();
  const [status, setStatus] = useState<TrialStatus>({ isTrial: true, daysLeft: 7, isExpired: false, loading: true });

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid, "settings", "profile"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const now = Date.now();
        
        // 1. Friend Access Whitelist 
        // Note: NEXT_PUBLIC_ is used so the frontend can read evaluating strict logic natively.
        const friendEmails = (process.env.NEXT_PUBLIC_FRIEND_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
        const isFriend = user.email ? friendEmails.includes(user.email.toLowerCase()) : false;

        if (isFriend) {
          setStatus({ isTrial: false, daysLeft: 0, isExpired: false, loading: false });
          return;
        }

        // 2. Paid Subscription Systems
        const hasPaidPlan = data.plan === "pro_monthly" || data.plan === "pro_yearly";
        if (hasPaidPlan && data.plan_expiry_date) {
           if (now < data.plan_expiry_date) {
              const daysLeft = Math.max(0, Math.floor((data.plan_expiry_date - now) / (1000 * 60 * 60 * 24)));
              setStatus({ isTrial: false, daysLeft, isExpired: false, loading: false });
              return;
           }
           // Fallthrough if plan is expired
        }

        // 3. Trial System Fallback
        const trialStart = data.trial_started_at || data.trialStartedAt || now; // handle legacy too
        const trialEnd = data.trial_end_date || (trialStart + (7 * 24 * 60 * 60 * 1000));
        const diffDays = Math.floor((trialEnd - now) / (1000 * 60 * 60 * 24));
        const remainingTrial = Math.max(0, diffDays);

        const isTrialActive = now <= trialEnd;

        setStatus({
          isTrial: true,
          daysLeft: remainingTrial,
          isExpired: !isTrialActive && !data.isPro, // Legacy check integration
          loading: false
        });
      } else {
        setStatus({ isTrial: true, daysLeft: 7, isExpired: false, loading: false });
      }
    });
    return () => unsub();
  }, [user]);

  return status;
}

export function TrialBanner() {
  const { isExpired, daysLeft, loading, isTrial } = useTrial();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (loading || !isTrial || isExpired) return null;

  return (
    <div className="bg-gradient-to-r from-[#00FFB2] to-[#3B82F6] p-[1px] rounded-xl mb-6 shadow-lg shadow-[#00FFB2]/5 animate-in slide-in-from-top-2 duration-500">
      <div className="bg-[#0B0F14] rounded-[11px] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
           <Zap size={18} className="text-[#00FFB2] fill-[#00FFB2]/20" />
           <p className="text-sm font-bold text-white">
             You are on a <span className="text-[#00FFB2]">Professional Trial</span>. {daysLeft} days remaining.
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
  const { isExpired, loading, isTrial } = useTrial();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (loading) return <div className="animate-pulse h-64 bg-white/5 rounded-3xl" />;

  if (isTrial && isExpired) {
    return (
      <div className="relative group">
        <div className="filter blur-md pointer-events-none opacity-40 select-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center p-6">
           <div className="bg-[#11161D] border-2 border-[#00FFB2]/20 p-8 rounded-[32px] max-w-sm text-center space-y-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-300">
              <div className="mx-auto w-16 h-16 bg-[#00FFB2]/10 rounded-2xl flex items-center justify-center border border-[#00FFB2]/20">
                <Lock size={32} className="text-[#00FFB2]" />
              </div>
              <div className="space-y-2">
                 <h3 className="text-xl font-bold text-white">Trial Expired</h3>
                 <p className="text-zinc-400 text-sm leading-relaxed">
                   Your 7-day trial of <strong>{featureName}</strong> has ended. Upgrade to Pro to continue tracking like a professional.
                 </p>
              </div>
              <button onClick={() => setShowUpgrade(true)} className="w-full bg-[#00FFB2] text-black font-black py-4 rounded-2xl hover:shadow-[0_0_20px_rgba(0,255,178,0.4)] transition-all">
                 Unlock Professional Access
              </button>
              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Immediate unlocking • Cancel anytime</p>
           </div>
        </div>
        {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
      </div>
    );
  }

  return <>{children}</>;
}
