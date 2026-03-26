"use client";

import { useState, useEffect } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import PlanHeroCard from "@/components/billing/PlanHeroCard";
import PlanProgressBar from "@/components/billing/PlanProgressBar";
import PlanActions from "@/components/billing/PlanActions";
import PlanComparison from "@/components/billing/PlanComparison";
import PaymentHistory from "@/components/billing/PaymentHistory";
import SubscriptionDetails from "@/components/billing/SubscriptionDetails";
import UpgradeModal from "@/components/UpgradeModal";
import { Loader2 } from "lucide-react";
import { useModal } from "@/lib/ModalContext";

export default function BillingPage() {
  const { user } = useAuth();
  const { alert } = useModal();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Upgrade Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeTargetPlan, setUpgradeTargetPlan] = useState<"monthly" | "yearly">("yearly");

  useEffect(() => {
    if (!user) return;

    // Real-time listener on the user's secure profile document
    const unsub = onSnapshot(doc(db, "users", user.uid, "settings", "profile"), (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      } else {
        // Fallback for new users without a profile document
        setProfile({
          plan: "free",
          isPro: false,
          payment_history: []
        });
      }
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleUpgradeClick = (plan: "monthly" | "yearly" = "yearly") => {
    setUpgradeTargetPlan(plan);
    setIsUpgradeModalOpen(true);
  };

  const handleManageClick = async () => {
    await alert({
      title: "Contact Support",
      message: "Please reach out to support@tradevault.com to manage or cancel your existing subscription.",
      variant: "safe"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  const { plan = "free", isPro = false, plan_expiry_date = null, payment_history = [] } = profile || {};
  
  // Extract the most recent payment ID for the meta details
  const lastPaymentId = payment_history && payment_history.length > 0 
    ? [...payment_history].sort((a, b) => b.date - a.date)[0]?.payment_id 
    : undefined;

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto pb-16 space-y-12">
      
      {/* 1. Header & Hero Section */}
      <section className="fade-slide-up" style={{ animationDelay: "100ms" }}>
        <PlanHeroCard plan={plan} isPro={isPro} expiryDate={plan_expiry_date} />
        
        <div className="px-8 pb-8 -mt-6 bg-[#0B0F14] border-x border-b border-white/5 rounded-b-2xl shadow-xl">
          <PlanProgressBar plan={plan} isPro={isPro} expiryDate={plan_expiry_date} />
          <PlanActions 
            plan={plan} 
            isPro={isPro} 
            expiryDate={plan_expiry_date} 
            onUpgradeClick={() => handleUpgradeClick(plan === "pro_monthly" ? "yearly" : "yearly")} 
            onManageClick={handleManageClick} 
          />
        </div>
      </section>

      {/* 2. Subscription Meta Data */}
      <section className="fade-slide-up" style={{ animationDelay: "200ms" }}>
        <SubscriptionDetails isPro={isPro} expiryDate={plan_expiry_date} lastPaymentId={lastPaymentId} />
      </section>

      {/* 3. Upsell / Plan Highlights */}
      <section className="fade-slide-up" style={{ animationDelay: "300ms" }}>
        <PlanComparison currentPlan={plan} onSelectPlan={handleUpgradeClick} />
      </section>

      {/* 4. Payment Ledger */}
      <section className="fade-slide-up" style={{ animationDelay: "400ms" }}>
        <PaymentHistory history={payment_history} />
      </section>

      {/* Razorpay Injection Wrapper */}
      {isUpgradeModalOpen && (
        <UpgradeModal 
          onClose={() => setIsUpgradeModalOpen(false)} 
          initialPlan={upgradeTargetPlan}
        />
      )}

    </div>
  );
}
