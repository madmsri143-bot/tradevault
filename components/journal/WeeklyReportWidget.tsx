"use client";

import { useState } from "react";
import { JournalEntry } from "@/types";
import { BrainCircuit, Lock, ExternalLink, Loader2, Target, CalendarDays, Flame, AlertCircle } from "lucide-react";
import { useTrial } from "@/components/TrialGuard";
import Link from "next/link";

interface ReportData {
  avgScore: number;
  topMistake: string;
  bestDay: string;
  weakness: string;
  advice: string;
}

export default function WeeklyReportWidget({ recentEntries }: { recentEntries: JournalEntry[] }) {
  const { access } = useTrial();
  const isFree = access === "free";
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const generateReport = async () => {
    if (isFree || recentEntries.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/weekly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journals: recentEntries })
      });
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (err) {
      console.error("Failed to generate weekly report:", err);
    }
    setLoading(false);
  };

  if (isFree) {
    return (
      <div className="bg-[#111] border border-[#222] rounded-3xl p-6 relative overflow-hidden group">
        <div className="absolute inset-0 bg-[#00FFB2]/5 blur-3xl rounded-full" />
        
        <div className="relative z-10 flex items-center justify-between mb-6">
          <h3 className="font-brand font-black tracking-tight text-white flex items-center gap-2">
            <BrainCircuit className="text-[#00FFB2]" /> Weekly AI Report
          </h3>
          <span className="text-[10px] uppercase font-black tracking-widest bg-zinc-800 text-zinc-400 px-2 py-1 rounded">Pro Only</span>
        </div>

        {/* Blurred Content */}
        <div className="relative pointer-events-none select-none filter blur-sm opacity-50 space-y-4">
          <div className="flex gap-4">
            <div className="bg-zinc-900 p-4 rounded-xl flex-1 border border-white/5">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black block mb-2">Avg Score</span>
              <p className="text-3xl font-black text-amber-500">68</p>
            </div>
            <div className="bg-zinc-900 p-4 rounded-xl flex-1 border border-white/5">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black block mb-2">Top Mistake</span>
              <p className="text-sm font-black text-red-400 mt-3 truncate">Overtrading</p>
            </div>
          </div>
          <div className="bg-zinc-900 p-4 rounded-xl border border-white/5">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black block mb-1">Advice</span>
            <p className="text-sm font-medium text-zinc-400">Reduce trade frequency after losses and stick to your Daily target edge.</p>
          </div>
        </div>

        {/* Upgrade Overlay */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px]">
           <Lock size={32} className="text-zinc-500 mb-3" />
           <p className="text-sm font-bold text-white mb-4">Unlock Weekly Behavior Analytics</p>
           <Link href="/billing" className="bg-[#00FFB2] text-black text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl hover:scale-105 transition-transform shadow-[0_0_20px_rgba(0,255,178,0.3)]">
             Upgrade to Professional
           </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 relative shadow-inner">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-black text-white flex items-center gap-2">
            <BrainCircuit className="text-[#00FFB2]" /> Weekly Strategy Report
          </h3>
          <p className="text-[11px] text-zinc-500 mt-1 uppercase tracking-widest font-bold">Past 7 Days AI Synthesis</p>
        </div>
        {!reportData && (
          <button 
            onClick={generateReport}
            disabled={loading || recentEntries.length === 0}
            className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <><Loader2 size={12} className="animate-spin" /> Analyzing...</> : "Generate"}
          </button>
        )}
      </div>

      {!reportData && !loading ? (
        <div className="bg-zinc-950/50 rounded-2xl border border-dashed border-white/10 p-8 text-center text-zinc-500 flex flex-col items-center">
           {recentEntries.length === 0 ? (
             <>
               <CalendarDays size={24} className="mb-2 opacity-50" />
               <p className="text-sm font-medium">No journal entries in the last 7 days to analyze.</p>
             </>
           ) : (
             <>
               <BrainCircuit size={24} className="mb-2 opacity-50" />
               <p className="text-sm font-medium">Click Generate to synthesize your performance.</p>
             </>
           )}
        </div>
      ) : loading ? (
        <div className="bg-zinc-950/50 rounded-2xl border border-white/5 p-8 flex flex-col items-center justify-center gap-4 animate-pulse">
           <div className="relative flex items-center justify-center">
             <div className="w-12 h-12 border-2 border-[#00FFB2] border-t-transparent rounded-full animate-spin" />
             <BrainCircuit size={20} className="text-[#00FFB2] absolute" />
           </div>
           <p className="text-xs font-bold uppercase tracking-widest text-[#00FFB2]">Synthesizing {recentEntries.length} entries...</p>
        </div>
      ) : reportData && (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/40 p-4 rounded-2xl border border-white/5 shadow-inner">
               <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black block mb-2 flex items-center gap-1.5"><Flame size={12} className="text-orange-500"/> Avg Score</span>
               <div className={`text-3xl font-black ${reportData.avgScore >= 80 ? 'text-emerald-400' : reportData.avgScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                 {reportData.avgScore} <span className="text-sm text-zinc-600">/100</span>
               </div>
            </div>
            <div className="bg-black/40 p-4 rounded-2xl border border-red-500/10 shadow-inner">
               <span className="text-[10px] text-red-400/80 uppercase tracking-widest font-black block mb-2 flex items-center gap-1.5"><AlertCircle size={12}/> Top Mistake</span>
               <div className="text-sm font-bold text-red-300">{reportData.topMistake}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/40 p-4 rounded-2xl border border-white/5 shadow-inner">
               <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black block mb-2">Best Day</span>
               <div className="text-sm font-bold text-emerald-400">{reportData.bestDay}</div>
            </div>
            <div className="bg-black/40 p-4 rounded-2xl border border-white/5 shadow-inner">
               <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black block mb-2">Weakness</span>
               <div className="text-sm font-bold text-amber-400">{reportData.weakness}</div>
            </div>
          </div>

          <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/20 shadow-inner mt-2">
             <span className="text-[10px] text-blue-400 uppercase tracking-widest font-black block mb-2 flex items-center gap-1.5"><Target size={12} /> Advice</span>
             <p className="text-sm font-medium text-blue-200 leading-relaxed">{reportData.advice}</p>
          </div>
        </div>
      )}
    </div>
  );
}
