"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Lock, Zap, ChevronRight, Clock, ShieldAlert, Calendar } from "lucide-react";
import { format } from "date-fns";
import UpgradeModal from "./UpgradeModal";

// ── VIP Override: These emails ALWAYS get forced premium access ──
// They bypass all trial limits, expiry, and feature restrictions.
// To add more VIP users, simply append their email (lowercase) to this array.
const VIP_EMAILS: string[] = [
  "sribharathi72@gmail.com",
  "madhis770@gmail.com",
];

export interface UserAccessState {
  access: "premium" | "free";
  plan: "trial" | "free" | "pro";
  planName?: string;
  hasUsedTrial: boolean;
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
    hasUsedTrial: false,
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
        
        let currentState: UserAccessState = { access: "free", plan: "free", hasUsedTrial: false, trial_days_left: 0, subscription_days_left: 0, loading: false };

        // 1. VIP Override — hardcoded list + optional env var fallback
        const envEmails = (process.env.NEXT_PUBLIC_FRIEND_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
        const allVipEmails = [...VIP_EMAILS, ...envEmails];
        const isVIP = user.email ? allVipEmails.includes(user.email.toLowerCase()) : false;
        
        // Trial Calculations (Bug #3 fix: normalize dual timestamp fields)
        const trialStart = data.trial_started_at || data.trialStartedAt || null;
        const trialEnd = data.trial_end_date || (trialStart ? trialStart + (7 * 24 * 60 * 60 * 1000) : null);
        const trialLeft = trialEnd ? Math.max(0, Math.floor((trialEnd - now) / (1000 * 60 * 60 * 24))) : 0;
        // CRITICAL: Trial is active ONLY if the Firestore plan field says "trial" AND the dates are valid
        const isTrialActive = data.plan === "trial" && trialEnd !== null && now <= trialEnd;

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

        let planName = data.plan === "pro_monthly" ? "Pro Monthly" : data.plan === "pro_yearly" ? "Pro Yearly" : data.plan === "trial" ? "Professional Trial" : "Free";
        if (isVIP && !hasPaidPlan) planName = "Pro (VIP Access)";

        // Auto-Downgrade Logic (VIP users are exempt)
        // Bug #1 fix: guard with data.plan !== "free" to prevent snapshot write loop
        // Bug #2 fix: also downgrade expired paid subscriptions, not just trials
        const needsTrialDowngrade = data.plan === "trial" && !isTrialActive;
        const needsSubDowngrade = hasPaidPlan && data.plan_expiry_date && !isSubActive;
        
        if ((needsTrialDowngrade || needsSubDowngrade) && !isVIP && data.plan !== "free") {
          import("firebase/firestore").then(({ updateDoc }) => {
            updateDoc(doc(db, "users", user.uid, "settings", "profile"), { plan: "free", isPro: false })
              .catch(e => console.error("Failed to auto-downgrade:", e));
          });
        }

        if (isVIP || isSubActive) {
           currentState = {
             access: "premium",
             plan: "pro",
             planName,
             hasUsedTrial: data.hasUsedTrial || data.plan === "trial" || false,
             expiryDate: data.plan_expiry_date || null,
             trial_days_left: trialLeft,
             subscription_days_left: isVIP ? 999 : subDaysLeft,
             loading: false
           };
        } else if (isTrialActive) {
           currentState = {
             access: "premium",
             plan: "trial",
             planName: "Professional Trial",
             hasUsedTrial: true,
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
             hasUsedTrial: data.hasUsedTrial || data.plan === "trial" || false,
             expiryDate: null,
             trial_days_left: 0,
             subscription_days_left: 0,
             loading: false
           };
        }

        setStatus(currentState);
      } else {
        setStatus({ access: "premium", plan: "trial", planName: "Professional Trial", hasUsedTrial: true, trial_days_left: 7, subscription_days_left: 0, loading: false });
      }
    });
    return () => unsub();
  }, [user]);

  return status;
}

/**
 * Returns the 7-day trial date window for the current user.
 * trialStartDate = Firestore trial_started_at (or account creation)
 * trialEndDate = trialStartDate + 7 days
 * Returns null dates if user is paid pro (no restrictions).
 * ACTIVE trial users (plan === "trial") ARE restricted to their 7-day window.
 */
export function useTrialWindow() {
  const { user } = useAuth();
  const { plan } = useTrial();
  const [trialWindow, setTrialWindow] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });

  // Trial restrictions apply when plan is "trial" OR "free" (expired trial)
  const isTrialRestricted = plan === "trial" || plan === "free";

  useEffect(() => {
    if (!user || !isTrialRestricted) {
      setTrialWindow({ start: null, end: null });
      return;
    }

    // Listen for the profile to get trial_started_at
    const unsub = onSnapshot(doc(db, "users", user.uid, "settings", "profile"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const trialStart = data.trial_started_at || data.trialStartedAt || null;
        if (trialStart) {
          const startDate = new Date(trialStart);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(trialStart + (7 * 24 * 60 * 60 * 1000));
          endDate.setHours(23, 59, 59, 999);
          setTrialWindow({ start: startDate, end: endDate });
        }
      }
    });

    return () => unsub();
  }, [user, isTrialRestricted]);

  return { trialStart: trialWindow.start, trialEnd: trialWindow.end, isTrialRestricted };
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
    <>
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
    
    {plan === "trial" && trial_days_left <= 1 && (
      <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl mb-6 flex items-center gap-3 animate-in fade-in">
        <ShieldAlert size={18} className="text-amber-500 shrink-0" />
        <p className="text-sm text-amber-400 font-medium">
          Your free trial {trial_days_left === 0 ? "ends today" : "ends tomorrow"}. <span className="text-white font-bold">Upgrade to continue Pro features.</span>
        </p>
      </div>
    )}
    </>
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

/**
 * Reusable overlay for gated sections.
 * Shows blurred children behind a centered lock card.
 */
export function FeatureBlockOverlay({
  children,
  title,
  subtitle,
  show,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  show: boolean;
}) {
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (!show) return <>{children}</>;

  return (
    <div className="relative">
      <div className="filter blur-[6px] pointer-events-none opacity-30 select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-6 z-10">
        <div className="bg-[#11161D]/95 backdrop-blur-sm border-2 border-[#00FFB2]/15 p-8 rounded-[28px] max-w-sm text-center space-y-5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] scale-100 animate-in zoom-in-95 duration-300">
          <div className="mx-auto w-14 h-14 bg-zinc-800/80 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
            <Lock size={28} className="text-zinc-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">{subtitle}</p>
          </div>
          <button
            onClick={() => setShowUpgrade(true)}
            className="w-full bg-[#00FFB2] text-black font-black py-3.5 rounded-2xl hover:shadow-[0_0_20px_rgba(0,255,178,0.4)] transition-all pointer-events-auto cursor-pointer text-sm"
          >
            Upgrade to Professional
          </button>
          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
            Instant access • Cancel anytime
          </p>
        </div>
      </div>
      {showUpgrade && (
        <div className="pointer-events-auto">
          <UpgradeModal onClose={() => setShowUpgrade(false)} />
        </div>
      )}
    </div>
  );
}
