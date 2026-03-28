"use client";

import { useState, useEffect } from "react";
import { X, Check, Loader2, Zap } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface UpgradeModalProps {
  onClose: () => void;
  initialPlan?: "monthly" | "yearly";
}

export default function UpgradeModal({ onClose, initialPlan = "yearly" }: UpgradeModalProps) {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">(initialPlan);
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = async () => {
    console.log("PAYMENT CLICKED");
    
    if (!user) {
      console.warn("PAYMENT BLOCKED: No active user session detected in AuthContext");
      return;
    }
    
    setLoading(true);
    setPaymentStatus("idle");

    try {
      if (!(window as any).Razorpay) {
        throw new Error("Razorpay SDK not loaded");
      }

      console.log("CALLING API");
      // Step 1: Create Order on Backend
      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan, userId: user.uid }),
      });

      console.log("RESPONSE RECEIVED");
      const orderData = await orderRes.json();
      console.log("API ORDER RESP:", orderData);
      
      if (!orderRes.ok) throw new Error(orderData.error);

      // Step 2: Initialize Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_mock", 
        amount: orderData.amount, 
        currency: orderData.currency,
        order_id: orderData.id,
        name: "TradeVault",
        description: selectedPlan === "yearly" ? "TradeVault Pro Elite" : "TradeVault Pro Starter",
        handler: async function (response: any) {
          try {
             setPaymentStatus("verifying");
             // Step 3: Verify Payment securely on Backend
             const verifyRes = await fetch("/api/payment/verify", {
               method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id || orderData.id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  userId: user.uid,
                  plan: selectedPlan
                })
             });
             
             const verifyData = await verifyRes.json();

             if (!verifyRes.ok) {
                throw new Error(verifyData.error || "Payment Verification Failed by Server");
             }
             
             setPaymentStatus("success");
             setLoading(false);
             setTimeout(() => window.location.reload(), 2000);
          } catch (error: any) {
            console.error("Backend verification failed:", error);
            setLoading(false);
            setPaymentStatus("error");
          }
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
            setPaymentStatus("error");
          }
        },
        prefill: { email: user.email || "" },
        theme: { color: "#00FFB2" },
      };

      const razorpayInstance = new (window as any).Razorpay(options);
      
      // If mock order, intercept and bypass checkout
      if (orderData.mock) {
         options.handler({ razorpay_payment_id: "pay_mock_" + Date.now() });
      } else {
         razorpayInstance.open();
      }
      
    } catch (err) {
      console.error(err);
      setLoading(false);
      setPaymentStatus("error");
    }
  };

  // Remove old full-screen success check

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0B0F14] border border-white/10 w-full max-w-3xl rounded-[32px] overflow-hidden shadow-2xl relative">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00FFB2]/10 rounded-xl flex items-center justify-center border border-[#00FFB2]/20">
              <Zap size={20} className="text-[#00FFB2]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Upgrade to Professional</h2>
              <p className="text-xs text-zinc-400">Unlock the full power of TradeVault.</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-white bg-white/5 rounded-full hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          
          {/* Monthly Plan */}
          <div 
            onClick={() => setSelectedPlan("monthly")}
            className={`cursor-pointer rounded-[24px] p-6 border-2 transition-all duration-300 relative overflow-hidden ${selectedPlan === "monthly" ? "border-[#00FFB2] bg-[#00FFB2]/5 scale-[1.02]" : "border-white/5 bg-[#11161D] hover:border-white/20"}`}
          >
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Pro Starter</h3>
                <p className="text-3xl font-black text-white">$2.99 <span className="text-sm text-zinc-500 font-medium">/ month</span></p>
              </div>
              <ul className="space-y-3 pt-4 border-t border-white/5">
                <li className="flex items-center gap-3"><Check size={16} className={selectedPlan === "monthly" ? "text-[#00FFB2]" : "text-zinc-500"} /> <span className="text-sm text-zinc-300">Full Analytics</span></li>
                <li className="flex items-center gap-3"><Check size={16} className={selectedPlan === "monthly" ? "text-[#00FFB2]" : "text-zinc-500"} /> <span className="text-sm text-zinc-300">Pacing Targets</span></li>
                <li className="flex items-center gap-3"><Check size={16} className={selectedPlan === "monthly" ? "text-[#00FFB2]" : "text-zinc-500"} /> <span className="text-sm text-zinc-300">Mistake Intelligence</span></li>
              </ul>
            </div>
          </div>

          {/* Yearly Plan */}
          <div 
            onClick={() => setSelectedPlan("yearly")}
            className={`cursor-pointer rounded-[24px] p-6 border-2 transition-all duration-300 relative overflow-hidden shadow-2xl ${selectedPlan === "yearly" ? "border-[#00FFB2] bg-[#00FFB2]/10 scale-[1.02] shadow-[0_0_30px_rgba(0,255,178,0.15)]" : "border-white/5 bg-[#11161D] hover:border-white/20"}`}
          >
            {/* Save 40% Badge */}
            <div className="absolute top-0 right-0 p-4">
              <span className="px-3 py-1 bg-[#00FFB2] text-black text-[10px] font-black uppercase rounded-full">Save 40%</span>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#00FFB2]">Pro Elite (Best Value)</h3>
                <p className="text-3xl font-black text-white">$20.99 <span className="text-sm text-zinc-500 font-medium">/ year</span></p>
                <p className="text-xs text-[#00FFB2] font-semibold mt-1">Breaks down to $1.75/month</p>
              </div>
              <ul className="space-y-3 pt-4 border-t border-[#00FFB2]/10">
                <li className="flex items-center gap-3"><Check size={16} className="text-[#00FFB2]" /> <span className="text-sm font-medium text-white">Full Analytics</span></li>
                <li className="flex items-center gap-3"><Check size={16} className="text-[#00FFB2]" /> <span className="text-sm font-medium text-white">Pacing Targets</span></li>
                <li className="flex items-center gap-3"><Check size={16} className="text-[#00FFB2]" /> <span className="text-sm font-medium text-white">Mistake Intelligence</span></li>
              </ul>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-[#11161D] flex flex-col items-center">
           <button 
             onClick={handlePayment}
             disabled={loading || paymentStatus === "success"}
             className="w-full md:w-auto md:min-w-[300px] bg-[#00FFB2] text-black font-black py-4 px-8 rounded-2xl hover:shadow-[0_0_25px_rgba(0,255,178,0.4)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:-translate-y-0 flex items-center justify-center"
           >
             {loading && paymentStatus !== "verifying" ? <Loader2 className="animate-spin text-black" size={20} /> : paymentStatus === "success" ? "Unlocked" : "Continue to Payment"}
           </button>
           
           <div className="h-6 mt-3 font-medium flex items-center justify-center">
             {paymentStatus === "idle" && <p className="text-zinc-500 text-xs">You will only be charged after choosing a plan.</p>}
             {paymentStatus === "verifying" && <p className="text-blue-400 text-sm animate-pulse">Checking payment status...</p>}
             {paymentStatus === "success" && <p className="text-[#00FFB2] text-sm font-bold flex items-center gap-1"><Check size={16} /> Payment successful. You can now start your journey.</p>}
             {paymentStatus === "error" && <p className="text-red-400 text-sm">Payment not completed. Please try again.</p>}
           </div>
           
           <div className="mt-3 flex items-center gap-4 text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">
             <span className="flex items-center gap-1"><Zap size={12} className="text-emerald-500" /> Secure</span>
             <span className="flex items-center gap-1"><Zap size={12} className="text-emerald-500" /> Encrypted</span>
             <span>Powered by Razorpay</span>
           </div>
        </div>
      </div>
    </div>
  );
}
