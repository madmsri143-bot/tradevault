"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trade, Currency } from "@/types";
import { useAuth } from "@/lib/AuthContext";
import { useTrial } from "@/components/TrialGuard";
import { Lock, Zap, ArrowRight, TrendingUp, BarChart, ShieldAlert } from "lucide-react";
import Link from "next/link";

import TradeForm from "@/components/dashboard/TradeForm";
import MetricsCards from "@/components/dashboard/MetricsCards";
import TradeList from "@/components/dashboard/TradeList";

export default function FreeDashboardPage() {
  const { user } = useAuth();
  const { planName } = useTrial();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    // Limit to last 20 trades for free users
    const q = query(collection(db, "users", user.uid, "trades"), orderBy("date", "desc"), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTrades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Trade[];
      setTrades(fetchedTrades);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      
      {/* Premium Upgrade Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#11161D] to-[#0D1218] border-2 border-[#00FFB2]/20 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_50px_rgba(0,255,178,0.05)]">
         <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none" />
         <div className="flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 bg-[#00FFB2]/10 rounded-2xl flex items-center justify-center border border-[#00FFB2]/20 shadow-inner">
               <Zap size={28} className="text-[#00FFB2] animate-pulse" />
            </div>
            <div>
               <h2 className="text-xl font-black text-white tracking-tight">You are on the <span className="text-[#00FFB2]">Standard Free Plan</span></h2>
               <p className="text-zinc-400 text-sm mt-1 font-medium">Unlock Advanced Analytics, AI Insights, and Unlimited Exports.</p>
            </div>
         </div>
         <Link href="/billing" className="relative z-10 px-8 py-3 bg-[#00FFB2] text-black font-black rounded-xl hover:shadow-[0_0_20px_rgba(0,255,178,0.4)] hover:-translate-y-0.5 transition-all text-sm flex items-center gap-2 group">
            Upgrade to Professional
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
         </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#00FFB2]">Free Workspace</h2>
          <p className="text-sm text-zinc-400 mt-1 italic">Basic logging enabled for disciplined traders.</p>
        </div>
      </div>

      {/* Content Layout */}
      <div className="flex flex-col xl:flex-row gap-6 mt-6">
        
        {/* Left Side: Fixed Form Panel */}
        <div className="w-full xl:w-[380px] shrink-0">
          <TradeForm />
        </div>
        
        {/* Right Side: Metrics, Graphics, and Lists */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          <MetricsCards trades={trades} displayCurrency="USD" />
          
          {/* Locked Analytics Preview */}
          <div className="relative group w-full">
             <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-[3px] rounded-[2rem] border border-white/5 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center border border-white/10">
                   <Lock className="text-zinc-500" size={32} />
                </div>
                <div>
                   <h3 className="text-xl font-bold text-white">Advanced Analytics Locked</h3>
                   <p className="text-zinc-500 text-sm max-w-xs mt-2">Win rate probability, equity curves, and behavioral heatmaps are exclusive to Pro users.</p>
                </div>
                <Link href="/billing" className="text-[#00FFB2] font-black text-xs uppercase tracking-widest hover:underline flex items-center gap-2">
                   See Pro Features <ArrowRight size={14} />
                 </Link>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-20 grayscale pointer-events-none">
                <div className="h-64 bg-zinc-900 border border-white/5 rounded-[2rem]" />
                <div className="h-64 bg-zinc-900 border border-white/5 rounded-[2rem]" />
             </div>
          </div>

          <div className="w-full">
            <TradeList trades={trades} displayCurrency="USD" />
          </div>
        </div>

      </div>

      {/* Upgrade Call-to-Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
         <LockedFeature icon={<TrendingUp size={20}/>} title="AI Trade Insights" />
         <LockedFeature icon={<BarChart size={20}/>} title="Excel/PDF Export" />
         <LockedFeature icon={<ShieldAlert size={20}/>} title="Multi-Device Sync" />
      </div>

    </div>
  );
}

function LockedFeature({ icon, title }: { icon: any, title: string }) {
  return (
    <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl flex items-center gap-3 group opacity-60">
       <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-zinc-500 group-hover:text-[#00FFB2] transition-colors">{icon}</div>
       <div className="flex-1">
          <p className="text-xs font-bold text-zinc-300">{title}</p>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">Pro Feature</p>
       </div>
       <Lock size={14} className="text-zinc-700" />
    </div>
  );
}
