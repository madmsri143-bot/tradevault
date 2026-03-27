"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trade, TradingTarget, TargetType } from "@/types";
import { Target, Calendar as CalendarIcon, CheckCircle2, XCircle, Trash2, Pencil, X, Clock, AlertTriangle, TrendingUp, TrendingDown, Hourglass, Medal } from "lucide-react";
import { format, formatDistanceToNow, differenceInHours, differenceInDays } from "date-fns";
import { useAuth } from "@/lib/AuthContext";
import { useModal } from "@/lib/ModalContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrialGuard } from "@/components/TrialGuard";

// Helper to get local date string YYYY-MM-DD
const getLocalDateString = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

const getHelperDates = (tab: TargetType) => {
  const d = new Date();
  d.setHours(0,0,0,0);
  if (tab === "daily") {
     return { start: d.getTime(), end: new Date(d.getTime() + 86400000 - 1).getTime() };
  }
  if (tab === "weekly") {
     const day = d.getDay() || 7; 
     const monday = new Date(d);
     monday.setDate(d.getDate() - day + 1);
     const sunday = new Date(monday);
     sunday.setDate(monday.getDate() + 6);
     sunday.setHours(23,59,59,999);
     return { start: monday.getTime(), end: sunday.getTime() };
  }
  if (tab === "monthly") {
     const first = new Date(d.getFullYear(), d.getMonth(), 1);
     const last = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
     return { start: first.getTime(), end: last.getTime() };
  }
  return { start: d.getTime(), end: new Date(d.getTime() + 86400000 - 1).getTime() };
};

export default function TargetPage() {
  const { user } = useAuth();
  const { confirm, alert } = useModal();
  const [activeTab, setActiveTab] = useState<TargetType>("daily");
  
  const [targets, setTargets] = useState<TradingTarget[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  
  // Form Setup
  const [targetValue, setTargetValue] = useState("");
  const [maxLoss, setMaxLoss] = useState("");
  const [customStart, setCustomStart] = useState(getLocalDateString());
  const [customEnd, setCustomEnd] = useState(getLocalDateString());
  const [submitting, setSubmitting] = useState(false);

  const [editingTarget, setEditingTarget] = useState<TradingTarget | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubTargets = onSnapshot(query(collection(db, "users", user.uid, "targets"), orderBy("createdAt", "desc")), (snapshot) => {
      setTargets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TradingTarget[]);
    });

    const unsubTrades = onSnapshot(query(collection(db, "users", user.uid, "trades")), (snapshot) => {
      setTrades(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Trade[]);
    });

    return () => { unsubTargets(); unsubTrades(); };
  }, [user]);

  const handleCreateTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetValue || isNaN(Number(targetValue))) return;
    
    setSubmitting(true);
    let start = 0, end = 0;

    if (activeTab === "custom") {
      const [sy, sm, sd] = customStart.split('-');
      start = new Date(parseInt(sy), parseInt(sm)-1, parseInt(sd), 0, 0, 0, 0).getTime();
      const [ey, em, ed] = customEnd.split('-');
      end = new Date(parseInt(ey), parseInt(em)-1, parseInt(ed), 23, 59, 59, 999).getTime();
    } else {
      const bounds = getHelperDates(activeTab);
      start = bounds.start;
      end = bounds.end;
    }

    try {
      await addDoc(collection(db, "users", user!.uid, "targets"), {
        type: activeTab,
        targetValue: parseFloat(targetValue),
        maxLoss: maxLoss ? parseFloat(maxLoss) : null,
        startDate: start,
        endDate: end,
        createdAt: Date.now()
      });
      setTargetValue("");
      setMaxLoss("");
    } catch (err) {
      console.error(err);
      await alert({ message: "Failed to create target." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !user) return;
    const isConfirmed = await confirm({ title: "Delete Target", message: "Are you sure?", variant: "danger" });
    if (isConfirmed) await deleteDoc(doc(db, "users", user.uid, "targets", id));
  };

  // Gamification & Streak processing
  const completedTargets = targets.filter(t => Date.now() > t.endDate || (evaluateTarget(t).status === "PASSED" || evaluateTarget(t).status === "FAILED_LOSS"));
  const sortedCompleted = completedTargets.sort((a,b) => b.endDate - a.endDate);
  
  let currentStreak = 0;
  for (let i = 0; i < sortedCompleted.length; i++) {
    const { status } = evaluateTarget(sortedCompleted[i]);
    if (status === "PASSED") currentStreak++;
    else break;
  }

  // Helper Evaluator
  function evaluateTarget(target: TradingTarget) {
    const relevantTrades = trades.filter(t => t.date >= target.startDate && t.date <= target.endDate);
    const totalPnl = relevantTrades.reduce((sum, t) => sum + (t.normalizedPnl !== undefined ? t.normalizedPnl : t.pnl), 0);
    const now = Date.now();
    
    let timeRemainingStr = "Ended";
    if (now < target.endDate) {
       const dh = differenceInHours(target.endDate, now);
       if (dh < 24) timeRemainingStr = `${dh} hours left`;
       else timeRemainingStr = `${differenceInDays(target.endDate, now)} days left`;
    }

    let status = "IN PROGRESS";
    let statusLabel = "On Track";
    let colorClass = "text-emerald-400";
    let hexColor = "#34d399";
    
    if (target.maxLoss && totalPnl <= -target.maxLoss) {
       status = "FAILED_LOSS";
       statusLabel = "Max Loss Hit";
       colorClass = "text-red-500";
       hexColor = "#ef4444";
    } else if (totalPnl >= target.targetValue) {
       status = "PASSED";
       statusLabel = "Achieved";
       colorClass = "text-emerald-500";
       hexColor = "#10b981";
    } else if (now > target.endDate) {
       status = "FAILED_TIME";
       statusLabel = "Expired Missed";
       colorClass = "text-zinc-500";
       hexColor = "#71717a";
    } else {
       // Pacing Logic
       const totalDuration = target.endDate - target.startDate;
       const elapsed = now - target.startDate;
       let timeFraction = elapsed / totalDuration;
       if (timeFraction < 0) timeFraction = 0;
       
       const expectedPnl = target.targetValue * timeFraction;
       if (totalPnl >= expectedPnl) {
          status = "AHEAD";
          statusLabel = "Ahead of Target";
          colorClass = "text-blue-400";
          hexColor = "#60a5fa";
       } else {
          status = "BEHIND";
          statusLabel = "Slightly Behind";
          colorClass = "text-amber-500";
          hexColor = "#f59e0b";
       }
    }

    const unclippedPercentage = (totalPnl / target.targetValue) * 100;
    const progressPercentage = Math.max(0, Math.min(100, unclippedPercentage));
    
    // Line Chart Data Gen
    const chartData = [];
    if (relevantTrades.length > 0) {
      // Sort trades chronologically
      const sortedT = [...relevantTrades].sort((a,b)=>a.date-b.date);
      let runningSum = 0;
      chartData.push({ time: "Start", pnl: 0, targetPath: 0 });
      
      sortedT.forEach(t => {
         runningSum += (t.normalizedPnl !== undefined ? t.normalizedPnl : t.pnl);
         // calculate what target path 'should' have been at this trade's time
         const tf = Math.max(0, Math.min(1, (t.date - target.startDate) / (target.endDate - target.startDate)));
         chartData.push({ 
           time: format(new Date(t.date), "MMM d, h:mm a"), 
           pnl: runningSum, 
           targetPath: target.targetValue * tf 
         });
      });
      // Add current point
      const finalTf = Math.max(0, Math.min(1, (now - target.startDate) / (target.endDate - target.startDate)));
      chartData.push({ time: "Now", pnl: runningSum, targetPath: target.targetValue * finalTf });
    }

    return { totalPnl, status, statusLabel, colorClass, hexColor, progressPercentage, timeRemainingStr, chartData, unclippedPercentage };
  }

  // Render separation
  const activeTargets = targets.filter(t => evaluateTarget(t).status !== "FAILED_LOSS" && evaluateTarget(t).status !== "FAILED_TIME" && Date.now() <= t.endDate);
  // Show passed targets locally if they haven't explicitly expired by time, or just let them sit in active if date is ongoing
  
  return (
    <TrialGuard featureName="Elite Targets & Pacing Engine">
      <div className="space-y-6 animate-in fade-in duration-500 max-w-[1400px] mx-auto pb-10">
      
      {/* Brand Header */}
      <div className="mb-2">
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">TradeVault</h1>
      </div>

      {/* Header & Gamification Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Target className="text-emerald-500" size={32} /> Goals Engine
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Where am I? How far am I? Set explicit targets to drive focused behavior.</p>
        </div>
        
        {currentStreak > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/30 px-4 py-2.5 rounded-xl flex items-center gap-3 shadow-[0_0_15px_rgba(249,115,22,0.15)]">
             <Medal className="text-orange-400" size={24} />
             <div>
               <p className="text-xs text-orange-400 uppercase font-black tracking-widest">Consistency Badge</p>
               <p className="text-sm text-white font-bold">{currentStreak} Target{currentStreak > 1 ? 's' : ''} Hit String 🔥</p>
             </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: Elite Form */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none rounded-2xl overflow-hidden shadow-sm sticky top-6">
            
            <div className="p-5 border-b border-white/5 bg-zinc-900/50">
               <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400">Deploy Target</h2>
            </div>
            
            {/* Native Tabs */}
            <div className="flex bg-zinc-950 p-1 m-4 rounded-xl shadow-inner mb-0 border border-white/5">
              {(['daily', 'weekly', 'monthly', 'custom'] as TargetType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-xs font-bold transition-all rounded-lg uppercase tracking-wider ${
                    activeTab === tab 
                      ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <form onSubmit={handleCreateTarget} className="p-5 space-y-6">
              
              {activeTab === "custom" && (
                <div className="space-y-3 p-3 bg-zinc-950/50 rounded-xl border border-white/5 shadow-inner">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Start Date</label>
                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs focus:border-emerald-500 focus:outline-none color-scheme-dark" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">End Date</label>
                    <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs focus:border-emerald-500 focus:outline-none color-scheme-dark" />
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-emerald-500 mb-1 flex justify-between">
                    Target Value ($) <TrendingUp size={14} />
                  </label>
                  <input 
                    type="number" step="0.01" value={targetValue} onChange={e => setTargetValue(e.target.value)} placeholder="e.g. 500.00" required 
                    className="w-full bg-zinc-950 border border-emerald-500/30 rounded-xl p-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none shadow-inner text-emerald-400 font-bold placeholder-emerald-900/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-red-500 mb-1 flex justify-between">
                    Drawdown Max Loss ($) <TrendingDown size={14} />
                  </label>
                  <input 
                    type="number" step="0.01" value={maxLoss} onChange={e => setMaxLoss(e.target.value)} placeholder="e.g. 150.00 (Optional)" 
                    className="w-full bg-zinc-950 border border-red-500/30 rounded-xl p-3 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:outline-none shadow-inner text-red-400 font-bold placeholder-red-900/40"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1.5 leading-tight">If your actual PnL crosses this negative threshold, the target instantly fails. Prevents revenge trading.</p>
                </div>
              </div>

              <button type="submit" disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold tracking-wide py-3.5 rounded-xl transition-all shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] hover:-translate-y-0.5 disabled:opacity-50">
                {submitting ? "Engaging..." : "Commit Target"}
              </button>

            </form>
          </div>
        </div>

        {/* Right Column: Display Engine */}
        <div className="xl:col-span-2 space-y-6">
          
          {targets.length === 0 ? (
            <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up p-12 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm h-full min-h-[400px]">
              <div className="w-20 h-20 bg-zinc-950/50 rounded-full flex items-center justify-center mb-4 border border-white/5 shadow-inner">
                <Target size={32} className="text-zinc-600" />
              </div>
              <h3 className="text-lg font-bold text-white">No Actionable Targets</h3>
              <p className="text-sm text-zinc-500 max-w-sm mt-2">
                Targets should drive action. Set a Daily or Weekly goal to the left to activate the behavioral pacing engine.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Prioritize rendering Actives natively at the top, rendering individually with huge radial rings */}
              {activeTargets.map(target => {
                const { totalPnl, status, statusLabel, colorClass, hexColor, progressPercentage, timeRemainingStr, chartData, unclippedPercentage } = evaluateTarget(target);
                
                // SVG Circle Math
                const circleRadius = 55;
                const circleCircumference = 2 * Math.PI * circleRadius;
                const circleOffset = circleCircumference - (progressPercentage / 100) * circleCircumference;

                return (
                  <div key={target.id} className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-6 md:p-8 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-4 right-4 bg-zinc-950/80 backdrop-blur rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center p-1 z-20">
                      <button onClick={() => setEditingTarget(target)} className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded transition-colors" title="Edit Goal"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(target.id)} className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors" title="Delete"><Trash2 size={14} /></button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-8 items-center md:items-start relative z-10">
                      
                      {/* Big Radial Progress Ring */}
                      <div className="relative w-[140px] h-[140px] shrink-0 drop-shadow-2xl flex items-center justify-center">
                        <svg className="absolute inset-0 w-full h-full transform -rotate-90 filter drop-shadow-md">
                           <circle cx="70" cy="70" r={circleRadius} stroke="currentColor" strokeWidth="12" fill="transparent" className="text-zinc-800/80" />
                           <circle cx="70" cy="70" r={circleRadius} stroke={hexColor} strokeWidth="12" fill="transparent" strokeDasharray={circleCircumference} strokeDashoffset={circleOffset} strokeLinecap="round" className="transition-all duration-1000 ease-out" style={{ filter: `drop-shadow(0 0 10px ${hexColor}60)` }} />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                           <p className="text-2xl font-black text-white">{Math.floor(progressPercentage)}%</p>
                           <p className={`text-[10px] font-bold uppercase tracking-widest ${colorClass}`}>{statusLabel}</p>
                        </div>
                      </div>

                      {/* Info & Metrics */}
                      <div className="flex-1 w-full space-y-5">
                         
                         <div>
                           <div className="flex items-center gap-2 mb-1">
                             <span className="bg-zinc-800 text-zinc-300 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">{target.type}</span>
                             <span className="text-xs text-zinc-500 font-bold flex items-center gap-1"><Clock size={12}/> {timeRemainingStr}</span>
                           </div>
                           <div className="flex justify-between items-baseline mt-2">
                             <p className="text-sm text-zinc-400 font-medium">Trajectory Progress</p>
                             <div className="text-right">
                               <span className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-white' : 'text-red-400'}`}>
                                 ${totalPnl.toFixed(2)}
                               </span>
                               <span className="text-zinc-500 font-medium ml-2">/ ${target.targetValue.toFixed(2)}</span>
                             </div>
                           </div>
                         </div>

                         {target.maxLoss && (
                           <div className="flex items-center justify-between border-t border-white/5 pt-4">
                              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-2"><AlertTriangle size={14} className="text-red-500/70" /> Drawdown Limit</span>
                              <span className="text-sm font-bold text-red-400">-${target.maxLoss.toFixed(2)}</span>
                           </div>
                         )}
                         
                         {/* Intelligent Status Feedback */}
                         <div className={`p-3 rounded-xl border flex items-center gap-3 ${status === 'PASSED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : status === 'AHEAD' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : status === 'BEHIND' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                            {status === 'PASSED' ? <CheckCircle2 size={18} /> : status === 'AHEAD' ? <TrendingUp size={18} /> : status === 'BEHIND' ? <Hourglass size={18} /> : <XCircle size={18} />}
                            <span className="text-sm font-bold">
                               {status === 'PASSED' ? "Target obliterated! Unstoppable execution." 
                              : status === 'AHEAD' ? "You are ahead of schedule. Guard your capital." 
                              : status === 'BEHIND' ? "You are trailing the necessary run rate. Do not force setups." 
                              : "Target failed. Live to trade another day."}
                            </span>
                         </div>
                      </div>
                    </div>

                    {/* Chart visual underbelly */}
                    {chartData.length > 2 && (
                       <div className="h-32 mt-6 -mx-2 mb-[-10px]">
                         <ResponsiveContainer width="100%" height="100%">
                           <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                             <ReferenceLine y={target.targetValue} stroke="#10b981" strokeDasharray="3 3" opacity={0.5} />
                             {target.maxLoss && <ReferenceLine y={-target.maxLoss} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} />}
                             <Tooltip 
                               contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                               itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                               labelStyle={{ color: '#71717a', fontSize: '10px' }}
                             />
                             <Line type="monotone" dataKey="targetPath" name="Required Pace" stroke="#71717a" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                             <Line type="monotone" dataKey="pnl" name="Actual PnL" stroke={hexColor} strokeWidth={3} dot={{ r: 2, fill: hexColor }} activeDot={{ r: 5 }} />
                           </LineChart>
                         </ResponsiveContainer>
                       </div>
                    )}
                  </div>
                )
              })}

              {/* Inactive / History targets */}
              {targets.length > activeTargets.length && (
                <div className="mt-8 border-t border-white/5 pt-8">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 px-2">Archived Resolutions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {targets.filter(t => !activeTargets.includes(t)).map(target => {
                      const { totalPnl, status, hexColor } = evaluateTarget(target);
                      return (
                        <div key={target.id} className="bg-zinc-950/50 border border-white/5 p-4 rounded-2xl flex justify-between items-center group relative overflow-hidden shadow-inner">
                           <div className="absolute inset-0 flex">
                             <div className="w-1 h-full" style={{ backgroundColor: hexColor }} />
                           </div>
                           <div className="pl-3">
                             <div className="flex items-center gap-2 mb-1">
                               <span className="text-[10px] font-black uppercase text-zinc-500">{target.type}</span>
                               <span className="text-[10px] text-zinc-600 font-bold">{format(target.startDate, "MMM d")} - {format(target.endDate, "MMM d")}</span>
                             </div>
                             <p className={`text-sm font-bold ${totalPnl >= 0 ? 'text-zinc-300' : 'text-red-400/80'}`}>${totalPnl.toFixed(2)} <span className="text-zinc-600 text-xs">/ ${target.targetValue}</span></p>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-[10px] font-bold uppercase py-1 px-2 rounded-lg" style={{ color: hexColor, backgroundColor: `${hexColor}20` }}>{status}</span>
                             <button onClick={() => handleDelete(target.id)} className="p-1.5 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                           </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Simple Edit Modal Overlay Layer */}
      {editingTarget && (
        <EditTargetModal target={editingTarget} onClose={() => setEditingTarget(null)} />
      )}
    </div>
    </TrialGuard>
  );
}

function EditTargetModal({ target, onClose }: { target: TradingTarget, onClose: () => void }) {
  const { user } = useAuth();
  const { alert } = useModal();
  const [targetValue, setTargetValue] = useState<string>(target.targetValue.toString());
  const [maxLoss, setMaxLoss] = useState<string>(target.maxLoss ? target.maxLoss.toString() : "");
  const [startD, setStartD] = useState(() => format(new Date(target.startDate), "yyyy-MM-dd"));
  const [endD, setEndD] = useState(() => format(new Date(target.endDate), "yyyy-MM-dd"));
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.id || isNaN(Number(targetValue))) return;
    setSubmitting(true);

    try {
      const [sy, sm, sd] = startD.split('-');
      const start = new Date(parseInt(sy), parseInt(sm)-1, parseInt(sd), 0, 0, 0, 0).getTime();
      const [ey, em, ed] = endD.split('-');
      const end = new Date(parseInt(ey), parseInt(em)-1, parseInt(ed), 23, 59, 59, 999).getTime();

      await updateDoc(doc(db, "users", user!.uid, "targets", target.id), {
        targetValue: parseFloat(targetValue),
        maxLoss: maxLoss ? parseFloat(maxLoss) : null,
        startDate: start,
        endDate: end
      });
      onClose();
    } catch (err) {
      console.error(err);
      await alert({ message: "Failed to update target." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-zinc-900">
           <h2 className="text-sm uppercase tracking-widest font-bold text-white">Modify Logic</h2>
           <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white rounded-md"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Target Value ($)</label>
            <input type="number" step="0.01" value={targetValue} onChange={e => setTargetValue(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm focus:border-emerald-500 focus:outline-none shadow-inner" />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Max Loss Limit ($)</label>
            <input type="number" step="0.01" value={maxLoss} onChange={e => setMaxLoss(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm focus:border-red-500 focus:outline-none shadow-inner" />
          </div>
          <div className="space-y-2 pt-2">
            <span className="block text-[10px] text-zinc-500 uppercase font-black">Edit Date Bounds</span>
            <div className="flex gap-2">
              <input type="date" value={startD} onChange={e => setStartD(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs focus:border-emerald-500 flex-1 color-scheme-dark" />
              <input type="date" value={endD} onChange={e => setEndD(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs focus:border-emerald-500 flex-1 color-scheme-dark" />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3 mt-4">
             <button type="button" onClick={onClose} className="px-4 py-2.5 text-xs text-zinc-400 hover:text-white rounded-lg font-bold">Abort</button>
             <button type="submit" disabled={submitting} className="px-5 py-2.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold disabled:opacity-50">Sav{submitting ? "ing..." : "e Params"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
