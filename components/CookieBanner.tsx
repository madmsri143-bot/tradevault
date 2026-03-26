"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Cookie } from "lucide-react";

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only run on client after hydration to avoid UI mismatch
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      // Small delay for smooth and non-intrusive entrance
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setIsVisible(false);
  };

  const handleDismiss = () => {
    // Optionally we can set a temporary dismissal, but for a simple banner, we'll just hide it until reload
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-96 z-[100] animate-in slide-in-from-bottom-8 fade-in duration-700">
      <div className="bg-zinc-900 border border-white/10 shadow-2xl rounded-2xl p-5 relative overflow-hidden group">
        {/* Glow effect element */}
        <div className="absolute -top-10 -left-10 w-24 h-24 bg-emerald-500/20 blur-2xl rounded-full pointer-events-none group-hover:bg-emerald-500/30 transition-colors duration-500" />
        
        <div className="relative z-10">
          <div className="flex items-start gap-4 mb-5">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500 shrink-0">
              <Cookie size={22} />
            </div>
            <div className="flex-1 pt-0.5">
              <h3 className="font-semibold text-white text-[15px] mb-1">We use cookies to improve your experience.</h3>
              <p className="text-xs text-zinc-400 leading-relaxed pr-2">
                Just essential ones to keep your session secure and save your simple preferences. No heavy tracking or ads.
              </p>
            </div>
            <button 
              onClick={handleDismiss}
              className="text-zinc-500 hover:text-white hover:bg-white/5 rounded-md transition-colors p-1"
              aria-label="Dismiss temporarily"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="flex items-center gap-3 mt-2">
            <button 
              onClick={handleAccept}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold py-3 rounded-xl transition-all shadow-md hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 active:translate-y-0"
            >
              Accept
            </button>
            <Link 
              href="/privacy"
              onClick={() => setIsVisible(false)}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-sm font-semibold py-3 rounded-xl transition-all text-center border border-black/10 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none hover:border-white/10"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
