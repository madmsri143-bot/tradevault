"use client";

import { useState } from "react";
import { Headset, X, Mail } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useTrial } from "@/components/TrialGuard";

export default function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { isTrial, loading } = useTrial();

  const handleEmailSupport = () => {
    const isPro = (!loading && !isTrial) ? "Pro" : "Free";
    const userEmail = user?.email || "Not logged in";
    
    const subject = encodeURIComponent("TradeVault Support Request");
    const bodyText = `Hi,

I need help with:

[Describe your issue]



User Email: ${userEmail}
Plan (Free / Pro): ${isPro}

Please include screenshot if possible.`;

    const body = encodeURIComponent(bodyText);
    window.location.href = `mailto:yourmail@gmail.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Popover Panel */}
      {isOpen && (
        <div className="mb-4 w-72 bg-[#11161D] border border-white/10 p-5 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-white font-bold text-lg tracking-tight">Need help?</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            Contact support via email. Our team will get back to you within 24 hours.
          </p>
          <button 
            onClick={handleEmailSupport}
            className="w-full flex items-center justify-center gap-2 bg-[#00FFB2] text-black font-black py-3 rounded-xl hover:shadow-[0_0_20px_rgba(0,255,178,0.4)] transition-all"
          >
            <Mail size={16} /> Email Support
          </button>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-[#11161D] border border-white/10 rounded-full flex items-center justify-center text-white shadow-xl hover:bg-zinc-800 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all group relative"
      >
        <span className="absolute inset-0 rounded-full group-hover:bg-[#00FFB2]/5 transition-colors" />
        <Headset size={24} className="group-hover:text-[#00FFB2] transition-colors relative z-10" />
      </button>
    </div>
  );
}
