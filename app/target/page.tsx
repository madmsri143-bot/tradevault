"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trade, TradingTarget, TargetType } from "@/types";
import { Target, Calendar as CalendarIcon, CheckCircle2, XCircle, Trash2, Pencil, CalendarRange, X, Clock } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/lib/AuthContext";
import { useModal } from "@/lib/ModalContext";

// Helper to get local date string YYYY-MM-DD
const getLocalDateString = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

const getLocalMonthString = () => {
  const d = new Date();
  const m = d.getMonth() + 1;
  return `${d.getFullYear()}-${m < 10 ? '0' + m : m}`;
};

export default function TargetPage() {
  const { user } = useAuth();
  const { confirm, alert } = useModal();
  const [activeTab, setActiveTab] = useState<TargetType>("daily");
  
  // Data
  const [targets, setTargets] = useState<TradingTarget[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  
  // Forms
  const [targetValue, setTargetValue] = useState("");
  const [dailyDate, setDailyDate] = useState(getLocalDateString());
  const [monthlyDate, setMonthlyDate] = useState(getLocalMonthString());
  const [customStart, setCustomStart] = useState(getLocalDateString());
  const [customEnd, setCustomEnd] = useState(getLocalDateString());
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal
  const [editingTarget, setEditingTarget] = useState<TradingTarget | null>(null);

  // Fetch Targets & Trades
  useEffect(() => {
    if (!user) return;
    const targetsQ = query(collection(db, "users", user.uid, "targets"), orderBy("createdAt", "desc"));
    const unsubTargets = onSnapshot(targetsQ, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TradingTarget[];
      setTargets(fetched);
    });

    const tradesQ = query(collection(db, "users", user.uid, "trades"));
    const unsubTrades = onSnapshot(tradesQ, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Trade[];
      setTrades(fetched);
    });

    return () => {
      unsubTargets();
      unsubTrades();
    };
  }, []);

  const handleCreateTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetValue || isNaN(Number(targetValue))) return;
    
    setSubmitting(true);
    let start = 0, end = 0;

    if (activeTab === "daily") {
      const [y, m, d] = dailyDate.split('-');
      start = new Date(parseInt(y), parseInt(m)-1, parseInt(d), 0, 0, 0, 0).getTime();
      end = new Date(parseInt(y), parseInt(m)-1, parseInt(d), 23, 59, 59, 999).getTime();
    } else if (activeTab === "monthly") {
      const [y, m] = monthlyDate.split('-');
      start = new Date(parseInt(y), parseInt(m)-1, 1).getTime();
      end = new Date(parseInt(y), parseInt(m), 0, 23, 59, 59, 999).getTime();
    } else if (activeTab === "custom") {
      const [sy, sm, sd] = customStart.split('-');
      start = new Date(parseInt(sy), parseInt(sm)-1, parseInt(sd), 0, 0, 0, 0).getTime();
      const [ey, em, ed] = customEnd.split('-');
      end = new Date(parseInt(ey), parseInt(em)-1, parseInt(ed), 23, 59, 59, 999).getTime();
    }

    try {
      await addDoc(collection(db, "users", user!.uid, "targets"), {
        type: activeTab,
        targetValue: parseFloat(targetValue),
        startDate: start,
        endDate: end,
        createdAt: Date.now()
      });
      setTargetValue("");
    } catch (err) {
      console.error(err);
      await alert({ message: "Failed to create target." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !user) return;
    const isConfirmed = await confirm({
      title: "Delete Target",
      message: "Are you sure you want to permanently delete this target?",
      confirmLabel: "Delete",
      variant: "danger"
    });
    
    if (isConfirmed) {
      await deleteDoc(doc(db, "users", user.uid, "targets", id));
    }
  };

  // Helper to calculate PnL within target range
  const evaluateTarget = (target: TradingTarget) => {
    const relevantTrades = trades.filter(t => t.date >= target.startDate && t.date <= target.endDate);
    const totalPnl = relevantTrades.reduce((sum, t) => sum + (t.normalizedPnl !== undefined ? t.normalizedPnl : t.pnl), 0);
    const isPassed = totalPnl >= target.targetValue;
    const isExpired = Date.now() > target.endDate;
    const status = isPassed ? "PASSED" : isExpired ? "FAILED" : "IN PROGRESS";
    return { totalPnl, status, isPassed };
  };

  const formatTargetDate = (t: TradingTarget) => {
    if (t.type === "daily") return format(new Date(t.startDate), "MMM do, yyyy");
    if (t.type === "monthly") return format(new Date(t.startDate), "MMMM yyyy");
    return `${format(new Date(t.startDate), "MMM d, yyyy")} - ${format(new Date(t.endDate), "MMM d, yyyy")}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-10">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Target className="text-emerald-500" size={32} />
          Trading Targets
        </h1>
        <p className="text-sm text-zinc-400 mt-1">Set and evaluate your daily, monthly, and custom profit goals automatically.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Form */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none rounded-xl overflow-hidden shadow-sm">
            
            {/* Tabs */}
            <div className="flex border-b border-white/5">
              {(['daily', 'monthly', 'custom'] as TargetType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors capitalize ${
                    activeTab === tab 
                      ? 'bg-emerald-500/10 text-emerald-400 border-b-2 border-emerald-500' 
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleCreateTarget} className="p-6 space-y-4">
              
              {activeTab === "daily" && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Select Date</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <input type="date" value={dailyDate} onChange={e => setDailyDate(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 pl-10 text-sm focus:border-emerald-500 focus:outline-none color-scheme-dark" />
                  </div>
                </div>
              )}

              {activeTab === "monthly" && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Select Month</label>
                  <div className="relative">
                    <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <input type="month" value={monthlyDate} onChange={e => setMonthlyDate(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 pl-10 text-sm focus:border-emerald-500 focus:outline-none color-scheme-dark" />
                  </div>
                </div>
              )}

              {activeTab === "custom" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Start Date</label>
                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none color-scheme-dark" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">End Date</label>
                    <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none color-scheme-dark" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Target Value ($)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={targetValue} 
                  onChange={e => setTargetValue(e.target.value)} 
                  placeholder="e.g. 500.00" 
                  required 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg transition-colors mt-2 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Create Target"}
              </button>

            </form>
          </div>
        </div>

        {/* Right Column: Display Cards */}
        <div className="md:col-span-2 space-y-4">
          
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Active Goals</h2>
            <div className="text-xs text-zinc-500">Auto-evaluating against dashboard trades</div>
          </div>

          {targets.length === 0 ? (
            <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-12 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
              <Target size={48} className="text-zinc-800 mb-4" />
              <h3 className="text-lg font-medium text-zinc-300">No Targets Set</h3>
              <p className="text-sm text-zinc-500 max-w-sm mt-2">
                Use the form on the left to set your first trading goal and start tracking your consistency.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {targets.map(target => {
                const { totalPnl, status } = evaluateTarget(target);
                const progressPercentage = Math.max(0, Math.min(100, (totalPnl / target.targetValue) * 100));
                
                let badgeClass = "bg-blue-500/10 text-blue-400";
                let StatusIcon = Clock;
                
                if (status === "PASSED") {
                  badgeClass = "bg-emerald-500/10 text-emerald-400";
                  StatusIcon = CheckCircle2;
                } else if (status === "FAILED") {
                  badgeClass = "bg-red-500/10 text-red-500";
                  StatusIcon = XCircle;
                }

                return (
                  <div key={target.id} className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-5 rounded-xl shadow-sm relative group">
                    
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="inline-block px-2 py-0.5 bg-zinc-800 text-zinc-300 text-[10px] font-bold uppercase tracking-wider rounded mb-2">
                          {target.type}
                        </span>
                        <h3 className="text-zinc-200 text-sm font-medium">{formatTargetDate(target)}</h3>
                      </div>
                      
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${badgeClass}`}>
                        <StatusIcon size={14} />
                        {status}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Target</span>
                        <span className="text-white font-semibold">${target.targetValue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Actual PnL</span>
                        <span className={`font-semibold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {totalPnl >= 0 ? '+' : '-'}${Math.abs(totalPnl).toFixed(2)}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden mt-2">
                        <div 
                           className={`h-full rounded-full transition-all duration-1000 ${status === "FAILED" ? 'bg-red-500' : status === "PASSED" ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                           style={{ width: `${isNaN(progressPercentage) ? 0 : progressPercentage}%` }} 
                        />
                      </div>
                    </div>

                    {/* Hover Actions */}
                    <div className="absolute top-4 right-4 bg-zinc-900 shadow-lg rounded-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center p-1 translate-x-4 group-hover:-translate-x-0 group-hover:duration-200">
                      <button onClick={() => setEditingTarget(target)} className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded transition-colors" title="Edit Goal">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(target.id)} className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {editingTarget && (
        <EditTargetModal 
          target={editingTarget} 
          onClose={() => setEditingTarget(null)} 
        />
      )}

    </div>
  );
}

// Edit Modal Component embedded for locality
function EditTargetModal({ target, onClose }: { target: TradingTarget, onClose: () => void }) {
  const { user } = useAuth();
  const { alert } = useModal();
  const [targetValue, setTargetValue] = useState<string>(target.targetValue.toString());
  // Pre-fill limits based on type and timestamp structure. For simplicity, editing limits supports picking new dates.
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-zinc-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-zinc-900">
           <h2 className="text-lg font-semibold text-white">Edit Target</h2>
           <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white rounded-md"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Target Value ($)</label>
            <input type="number" step="0.01" value={targetValue} onChange={e => setTargetValue(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none" />
          </div>
          <div className="space-y-2">
            <span className="block text-xs text-zinc-300 font-medium">Edit Date Limits</span>
            <div>
              <label className="block text-[10px] text-zinc-500 mb-0.5">Start Date</label>
              <input type="date" value={startD} onChange={e => setStartD(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none color-scheme-dark" />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 mb-0.5">End Date</label>
              <input type="date" value={endD} onChange={e => setEndD(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none color-scheme-dark" />
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-3">
             <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white rounded transition-colors">Cancel</button>
             <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium disabled:opacity-50">Sav{submitting ? "ing..." : "e Changes"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
