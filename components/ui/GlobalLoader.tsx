"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";

export default function GlobalLoader() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Start loading on mount
    setLoading(true);

    // Minimum display time of 2.8 seconds to avoid flicker and show branding
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0B0F14] animate-in fade-in duration-500">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#00FFB2]/10 blur-[100px] rounded-full animate-pulse" />
      
      <div className="relative flex flex-col items-center gap-6">
        <div className="w-20 h-20 bg-gradient-to-br from-[#11161D] to-[#0D1218] rounded-[24px] border border-[#00FFB2]/20 flex items-center justify-center shadow-[0_0_40px_rgba(0,255,178,0.1)] animate-bounce-subtle">
          <TrendingUp size={40} className="text-[#00FFB2]" />
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-0.5">
            TradeVault
            <span className="w-2 h-2 bg-[#00FFB2] rounded-full animate-pulse mt-3 ml-1" />
          </h1>
          <div className="flex items-center gap-2">
            <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
               <div className="h-full bg-[#00FFB2] animate-loading-bar" style={{ width: "100%" }} />
            </div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] animate-pulse">
              Securing Workspace
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-loading-bar {
          animation: loading-bar 1.5s infinite linear;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
