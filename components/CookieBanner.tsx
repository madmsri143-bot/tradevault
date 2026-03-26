"use client";

import { useState, useEffect } from "react";

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only run on client after hydration
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      // Small delay so it doesn't instantly flash on load
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleConsent = (choice: "accepted" | "rejected") => {
    localStorage.setItem("cookieConsent", choice);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] w-full bg-zinc-950/95 backdrop-blur-md border-t border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.4)] animate-in slide-in-from-bottom-full duration-500">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-auto md:h-16 py-4 md:py-0 flex flex-col md:flex-row items-center justify-between gap-4">
        
        <p className="text-sm font-medium text-zinc-300 text-center md:text-left">
          We use cookies to enhance your trading experience.
        </p>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => handleConsent("rejected")}
            className="flex-1 md:flex-none px-5 py-2 text-sm font-medium text-zinc-400 bg-transparent border border-zinc-700 hover:border-zinc-500 hover:text-zinc-200 rounded-lg transition-colors"
          >
            Reject All
          </button>
          <button 
            onClick={() => handleConsent("accepted")}
            className="flex-1 md:flex-none px-5 py-2 text-sm font-medium text-black bg-emerald-500 hover:bg-emerald-400 border border-emerald-500 rounded-lg transition-colors shadow-[0_0_10px_rgba(16,185,129,0.2)]"
          >
            Accept
          </button>
        </div>

      </div>
    </div>
  );
}
