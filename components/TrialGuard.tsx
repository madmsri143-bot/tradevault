"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Lock, Zap, ChevronRight, Clock, ShieldAlert, Calendar } from "lucide-react";
import { format } from "date-fns";
import UpgradeModal from "./UpgradeModal";

export interface UserAccessState {
  access: "premium" | "free";
  plan: "trial" | "free" | "pro";
  planName?: string;
  expiryDate?: number | null;
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

        let planName = data.plan === "pro_monthly" ? "Pro Starter" : data.plan === "pro_yearly" ? "Pro Elite" : "Trial";
        if (isFriend && !hasPaidPlan) planName = "Pro (Friend Access)";

        // Auto-Downgrade Logic
        if (data.plan === "trial" && !isTrialActive && !isSubActive && !isFriend) {
          import("firebase/firestore").then(({ updateDoc }) => {
            updateDoc(doc(db, "users", user.uid, "settings", "profile"), { plan: "free" })
              .catch(e => console.error("Failed to auto-downgrade:", e));
          });
        }

        if (isFriend || isSubActive) {
           currentState = {
             access: "premium",
             plan: "pro",
             planName,
             expiryDate: data.plan_expiry_date || null,
             trial_days_left: trialLeft,
             subscription_days_left: isFriend ? 999 : subDaysLeft,
             loading: false
           };
        } else if (isTrialActive) {
           currentState = {
             access: "premium",
             plan: "trial",
             planName: "Professional Trial",
             expiryDate: trialEnd,
             trial_days_left: trialLeft,
             subscription_days_left: 0,
             loading: false
           };
        } else {
           currentState = {
             access: "free",
             plan: "free",
             planName: "Free",
             expiryDate: null,
             trial_days_left: 0,
             subscription_days_left: 0,
             loading: false
           };
        }

        setStatus(currentState);
      } else {
        setStatus({ access: "premium", plan: "trial", planName: "Professional Trial", trial_days_left: 7, subscription_days_left: 0, loading: false });
      }
    });
    return () => unsub();
  }, [user]);

  return status;
}

export function TrialBanner() {
  const { access, plan, planName, expiryDate, trial_days_left, subscription_days_left, loading } = useTrial();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (loading) return null;

  const styles = {
    pro: {
      cardBorder: "border-emerald-500/20",
      iconBg: "bg-emerald-500/10",
      iconBorder: "border-emerald-500/20",
      iconColor: "text-emerald-500",
      badgeBg: "bg-emerald-500/10",
      badgeText: "text-emerald-500",
      badgeBorder: "border-emerald-500/20",
      Icon: Zap
    },
    trial: {
      cardBorder: "border-blue-500/20",
      iconBg: "bg-blue-500/10",
      iconBorder: "border-blue-500/20",
      iconColor: "text-blue-500",
      badgeBg: "bg-blue-500/10",
      badgeText: "text-blue-500",
      badgeBorder: "border-blue-500/20",
      Icon: Clock
    },
    free: {
      cardBorder: "border-red-500/20",
      iconBg: "bg-red-500/10",
      iconBorder: "border-red-500/20",
      iconColor: "text-red-500",
      badgeBg: "bg-red-500/10",
      badgeText: "text-red-500",
      badgeBorder: "border-red-500/20",
      Icon: ShieldAlert
    }
  };

  const currStyle = styles[plan];
  const Icon = currStyle.Icon;
  const daysLeft = plan === "pro" ? subscription_days_left : trial_days_left;

  return (
    <div className={`bg-zinc-900 border ${currStyle.cardBorder} shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-5 rounded-xl mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-500`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full ${currStyle.iconBg} flex items-center justify-center border ${currStyle.iconBorder} shrink-0`}>
          <Icon size={20} className={currStyle.iconColor} />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-white tracking-tight">{planName}</h3>
            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${currStyle.badgeBg} ${currStyle.badgeText} border ${currStyle.badgeBorder}`}>
              {plan === "pro" ? "Active" : plan === "trial" ? "Trial Active" : "Expired"}
            </span>
          </div>
          <p className="text-sm text-zinc-400 flex items-center gap-2">
            <Calendar size={14} className="text-zinc-500" /> 
            {expiryDate ? `Expires on ${format(new Date(expiryDate), "MMM dd, yyyy")}` : "No expiry date set"} 
            <span className="text-zinc-600 font-bold">•</span> 
            <span className="text-zinc-300 font-medium">{daysLeft} days remaining</span>
          </p>
        </div>
      </div>
      
      {(plan === "trial" || plan === "free") && (
        <button 
          onClick={() => setShowUpgrade(true)} 
          className="w-full md:w-auto px-6 py-2.5 bg-[#00FFB2] text-black font-bold rounded-xl hover:shadow-[0_0_20px_rgba(0,255,178,0.4)] transition-all text-sm flex items-center justify-center gap-2 shrink-0 group"
        >
          Upgrade to Pro
          <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>
      )}

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
