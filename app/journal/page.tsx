"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, query, orderBy, onSnapshot, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { JournalEntry, Trade } from "@/types";
import { format, subDays, startOfDay } from "date-fns";
import { ImagePlus, Loader2, Calendar as CalendarIcon, Pencil, Trash2, X, Maximize2, BookText, TrendingUp, AlertTriangle, Target, Flame, Activity, Lock, BrainCircuit, HeartPulse, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useModal } from "@/lib/ModalContext";
import { useTrial } from "@/components/TrialGuard";
import AIScoreCard from "@/components/journal/AIScoreCard";
import WeeklyReportWidget from "@/components/journal/WeeklyReportWidget";

// Shared compressImage utility
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
            } else {
              resolve(file); // fallback
            }
          },
          "image/jpeg",
          0.7
        );
      };
      img.onerror = () => resolve(file); // fallback on error
    };
    reader.onerror = () => resolve(file); // fallback on error
  });
};

const uploadToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "journal_upload");

  const response = await fetch(
    "https://api.cloudinary.com/v1_1/dnvuge0qb/image/upload",
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`Cloudinary upload failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.secure_url;
};

// Safe date parser for Firebase timestamps or regular numbers
const getValidDate = (ts: any): Date => {
  if (!ts) return new Date();
  if (typeof ts === "object" && ts !== null && "seconds" in ts) {
    return new Date(ts.seconds * 1000);
  }
  return new Date(ts);
};

const DEFAULT_PROMPT = "Setup:\nWhat was your setup?\n\nRules Followed:\nDid you follow your plan?\n\nWhat I'd do differently:\nWhat will you improve next time?\n\nMarket Lesson:\nWhat did the market teach you today?\n";

const getTodayDate = () => new Date().toISOString().split("T")[0];

const MOODS_BEFORE = ["😤 Impatient", "😐 Neutral", "😎 Confident", "😰 Fearful"];
const MOODS_AFTER = ["😡 Frustrated", "🙂 Satisfied", "🤯 Shocked", "😶 Numb"];
const MISTAKE_TAGS = ["FOMO", "Overtrading", "Revenge trading", "Ignored SL", "Early exit", "Late entry", "No setup"];
const QUALITY_SCORES = ["A", "B", "C", "D"];

function SmartText({ text }: { text: string }) {
  if (!text) return null;
  const regex = /(FOMO|Discipline|Mistakes?)/ig;
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        const lower = part.toLowerCase();
        if (lower === "fomo") return <span key={i} className="text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded font-bold tracking-wider text-[11px] uppercase">{part}</span>;
        if (lower === "discipline") return <span key={i} className="text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded font-bold tracking-wider text-[11px] uppercase">{part}</span>;
        if (lower.startsWith("mistake")) return <span key={i} className="text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded font-bold tracking-wider text-[11px] uppercase">{part}</span>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export default function JournalPage() {
  const { user } = useAuth();
  const { confirm, alert } = useModal();
  const { access } = useTrial();
  const isFree = access === "free";
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  
  // Filter State
  const [filterDate, setFilterDate] = useState("");

  // Daily journal limit for free users (max 1 per day)
  const todayStr = new Date().toISOString().substring(0, 10);
  const todayEntryCount = entries.filter(e => format(new Date(e.date), "yyyy-MM-dd") === todayStr).length;
  const dailyJournalLimitReached = isFree && todayEntryCount >= 1;

  // Form State
  const [date, setDate] = useState(getTodayDate());
  const [text, setText] = useState(DEFAULT_PROMPT);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Elite System Form State
  const [moodBefore, setMoodBefore] = useState("");
  const [moodAfter, setMoodAfter] = useState("");
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [qualityScore, setQualityScore] = useState<"A"|"B"|"C"|"D"|"">("");
  const [pnl, setPnl] = useState<number | "">("");
  const [slFollowed, setSlFollowed] = useState(false);

  // Modal States
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);

  // Sync opened modal with live updates
  useEffect(() => {
    if (viewingEntry) {
      const liveUpdate = entries.find(e => e.id === viewingEntry.id);
      if (liveUpdate && (liveUpdate.imageUrl !== viewingEntry.imageUrl || liveUpdate.text !== viewingEntry.text)) {
        setViewingEntry(liveUpdate);
      }
    }
  }, [entries, viewingEntry]);

  // Fetch Entries & Trades
  useEffect(() => {
    if (!user) return;
    const unsubJournal = onSnapshot(query(collection(db, "users", user.uid, "journal"), orderBy("date", "desc")), (snap) => {
      setEntries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as JournalEntry[]);
    });
    
    const unsubTrades = onSnapshot(query(collection(db, "users", user.uid, "trades"), orderBy("date", "desc")), (snap) => {
      setTrades(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Trade[]);
    });

    return () => { unsubJournal(); unsubTrades(); };
  }, [user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const toggleMistake = (tag: string) => {
    setMistakes(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    if (imageFile && imageFile.size > 2 * 1024 * 1024) {
      await alert({ message: "Max 2MB image allowed", variant: "info" });
      return;
    }
    
    setSubmitting(true);
    try {
      const newEntry: JournalEntry = {
        date: new Date(date).getTime(),
        text,
        moodBefore,
        moodAfter,
        mistakes,
        ...(qualityScore ? { qualityScore: qualityScore as "A"|"B"|"C"|"D" } : {}),
        ...(pnl !== "" ? { pnl: Number(pnl) } : {}),
        slFollowed
      };

      // 🤖 Fetch AI Score
      let aiResult = null;
      try {
        const res = await fetch("/api/ai-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newEntry),
        });
        if (res.ok) {
          aiResult = await res.json();
        }
      } catch (err) {
        console.error("AI Scoring fetch error:", err);
      }

      const dbEntry = {
        ...newEntry,
        ...(aiResult && !aiResult.error ? {
          aiScore: aiResult.score,
          aiInsight: aiResult.insight,
          aiMistake: aiResult.mistake,
          aiSuggestion: aiResult.suggestion,
        } : {})
      };

      const docRef = await addDoc(collection(db, "users", user!.uid, "journal"), dbEntry);
      
      // Auto-open modal so they see the AIScoreCard right away
      setViewingEntry({ id: docRef.id, ...dbEntry } as JournalEntry);
      
      const fileToUpload = imageFile;
      
      // Reset form instantly
      setDate(getTodayDate());
      setText(DEFAULT_PROMPT);
      setImageFile(null);
      setPreviewUrl(null);
      setMoodBefore("");
      setMoodAfter("");
      setMistakes([]);
      setQualityScore("");
      setPnl("");
      setSlFollowed(false);
      setSubmitting(false);

      if (fileToUpload) {
        try {
          const compressedFile = await compressImage(fileToUpload);
          const imageUrl = await uploadToCloudinary(compressedFile);
          await updateDoc(docRef, { imageUrl });
        } catch (imgError) {
          console.error("Image upload failed:", imgError);
          await alert({ message: "Image upload failed, but your journal text was saved." });
        }
      }
    } catch (error) {
      console.error("Error saving journal entry:", error);
      await alert({ message: "Failed to save entry." });
      setSubmitting(false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !user) return;
    const isConfirmed = await confirm({ title: "Delete Journal Entry", message: "Are you sure you want to delete this?", variant: "danger" });
    if (isConfirmed) {
      try {
        await deleteDoc(doc(db, "users", user.uid, "journal", id));
        if (viewingEntry?.id === id) setViewingEntry(null);
      } catch (error) {
        console.error("Error deleting entry:", error);
        await alert({ message: "Failed to delete entry." });
      }
    }
  };

  // Group entries
  const groupedEntries: Record<string, JournalEntry[]> = {};
  entries.forEach((entry) => {
    const validD = getValidDate(entry.date);
    const dateStr = format(validD, "yyyy-MM-dd");
    if (!groupedEntries[dateStr]) groupedEntries[dateStr] = [];
    groupedEntries[dateStr].push(entry);
  });

  const sortedDates = Object.keys(groupedEntries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const displayDates = filterDate ? sortedDates.filter(d => d === filterDate) : sortedDates;

  // Elite System Calculations
  const relevantTrades = filterDate 
    ? trades.filter(t => format(new Date(t.date), "yyyy-MM-dd") === filterDate)
    : trades;
  const totalTradesCount = relevantTrades.length;
  const nonBreakevenTrades = relevantTrades.filter(t => t.pnl !== 0);
  const winRate = nonBreakevenTrades.length > 0 ? (relevantTrades.filter(t => t.pnl > 0).length / nonBreakevenTrades.length) * 100 : 0;

  const mistakesCount: Record<string, number> = {};
  displayDates.forEach(dateStr => {
    groupedEntries[dateStr].forEach(entry => {
      entry.mistakes?.forEach(m => {
         mistakesCount[m] = (mistakesCount[m] || 0) + 1;
      });
    });
  });
  const topMistake = Object.keys(mistakesCount).length > 0 ? Object.entries(mistakesCount).sort((a,b)=>b[1]-a[1])[0] : null;

  const recent7Days = Array.from({ length: 7 }).map((_, i) => format(startOfDay(subDays(new Date(), i)), "yyyy-MM-dd"));
  const daysLedger = [...new Set(entries.map(e => format(new Date(e.date), "yyyy-MM-dd")))];
  const streakCount = recent7Days.filter(d => daysLedger.includes(d)).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1400px] mx-auto pb-10">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3"><Target className="text-emerald-500" /> Journal</h2>
          <p className="text-sm text-zinc-400 mt-1">Structured reflections and mistake intelligence framework.</p>
        </div>
        
        {/* Date Filter Bar */}
        <div className="flex items-center gap-3 bg-zinc-900 border border-black/10 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-2 rounded-xl">
          <label className="text-sm font-medium text-zinc-400 pl-2">Filter:</label>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 pr-2 pl-9 text-xs focus:border-emerald-500 focus:outline-none color-scheme-dark transition-colors"
            />
          </div>
          {filterDate && (
            <button
              onClick={() => setFilterDate("")}
              className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-zinc-800 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* LEFT PANEL: Elite Form */}
        <div className="xl:col-span-1">
          <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-5 rounded-2xl sticky top-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold tracking-wider uppercase text-emerald-400">New Reflection</h2>
              <span className="text-[11px] font-bold text-zinc-500 bg-zinc-950 border border-white/5 px-2.5 py-1 rounded-lg">{format(new Date(), "EEEE, MMM dd, yyyy")}</span>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="space-y-2.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500">Emotional Intelligence</label>
                <div className="bg-zinc-950/50 p-3 rounded-xl border border-white/5 space-y-4 shadow-inner">
                  <div>
                    <span className="text-[10px] text-zinc-400 mb-2 block">Before Trade</span>
                    <div className="flex flex-wrap gap-2">
                      {MOODS_BEFORE.map(m => (
                        <button key={m} type="button" onClick={() => setMoodBefore(prev => prev === m ? "" : m)} className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${moodBefore === m ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div>
                    <span className="text-[10px] text-zinc-400 mb-2 block">After Trade</span>
                    <div className="flex flex-wrap gap-2">
                      {MOODS_AFTER.map(m => (
                        <button key={m} type="button" onClick={() => setMoodAfter(prev => prev === m ? "" : m)} className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${moodAfter === m ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Mistake Intelligence</label>
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest bg-white/5 px-1.5 rounded">Multi-select</span>
                </div>
                <div className="flex flex-wrap gap-2 bg-zinc-950/50 p-3 rounded-xl border border-white/5 shadow-inner">
                  {MISTAKE_TAGS.map(tag => (
                    <button key={tag} type="button" onClick={() => toggleMistake(tag)} className={`text-xs px-2.5 py-1 rounded-full border transition-all ${mistakes.includes(tag) ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500">Execution Score</label>
                <div className="grid grid-cols-4 gap-2">
                  {QUALITY_SCORES.map(s => {
                    const activeColor = s === 'A' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : s === 'B' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : s === 'C' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-red-500/20 border-red-500/50 text-red-400';
                    return (
                      <button key={s} type="button" onClick={() => setQualityScore(s as any)} className={`py-2 rounded-xl border font-bold text-sm transition-all ${qualityScore === s ? activeColor : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 shadow-inner'}`}>
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500">Trade PnL ($)</label>
                  <input
                    type="number"
                    value={pnl}
                    onChange={(e) => setPnl(e.target.value ? Number(e.target.value) : "")}
                    placeholder="e.g. 150 or -50"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm focus:border-emerald-500 focus:outline-none color-scheme-dark shadow-inner text-white placeholder:text-zinc-600"
                  />
                </div>
                <div className="space-y-1.5 flex flex-col justify-end">
                  <label className={`cursor-pointer flex items-center justify-center gap-2 w-full h-[46px] border border-zinc-800 rounded-xl transition-all text-xs group shadow-inner ${slFollowed ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-zinc-950 text-zinc-400 hover:bg-zinc-900'}`} onClick={() => setSlFollowed(!slFollowed)}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${slFollowed ? 'border-emerald-500 bg-emerald-500 text-zinc-950' : 'border-zinc-700 bg-zinc-900 text-transparent'}`}>
                       <CheckCircle2 size={12} strokeWidth={4} />
                    </div>
                    <span className="font-bold tracking-wide">Followed SL</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2.5 relative group">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500">Smart Reflection</label>
                <div className="absolute inset-0 bg-emerald-500/5 rounded-xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  required
                  rows={8}
                  className="w-full relative bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-all resize-none shadow-inner leading-relaxed text-zinc-300"
                />
              </div>

              <div className="space-y-2.5 flex gap-4">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-1/3 bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-400 focus:border-emerald-500 focus:outline-none color-scheme-dark shadow-inner transition-colors"
                />
                <div className="flex-1 relative">
                  {previewUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 h-[42px] group flex items-center shadow-inner">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                      <span className="relative z-10 text-xs text-zinc-300 px-4 font-medium truncate">Image attached</span>
                      <button type="button" onClick={() => { setImageFile(null); setPreviewUrl(null); }} className="absolute z-20 inset-y-0 right-0 px-3 bg-red-500/90 text-white text-xs font-bold transition-colors">
                        X
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex items-center justify-center gap-2 w-full h-[42px] border border-dashed border-zinc-700/50 rounded-xl bg-zinc-950/50 hover:bg-zinc-900 hover:border-emerald-500/50 transition-all text-xs text-zinc-400 group shadow-inner">
                      <ImagePlus size={14} className="group-hover:text-emerald-400 transition-colors" />
                      <span className="font-medium group-hover:text-emerald-400 transition-colors">Attach Setup</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </label>
                  )}
                </div>
              </div>

              {isFree && dailyJournalLimitReached && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold flex items-center gap-2">
                  <Lock size={14} /> Daily limit reached. Upgrade to log unlimited journal entries.
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setText(DEFAULT_PROMPT); setMoodBefore(""); setMoodAfter(""); setMistakes([]); setQualityScore(""); setPnl(""); setSlFollowed(false); setImageFile(null); setPreviewUrl(null); }}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3.5 rounded-xl transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !text.trim() || (isFree && dailyJournalLimitReached)}
                  className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.23)] hover:-translate-y-0.5"
                >
                  {isFree && dailyJournalLimitReached ? "Limit Reached" : submitting ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : "Save Journal"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT PANEL: Display & Summary */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* ELITE DAILY SUMMARY BLOCK */}
          <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-5 rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-4 tracking-tight shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <div className="bg-zinc-950/50 p-4 rounded-xl border border-white/5 shadow-inner">
              <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest flex items-center gap-1.5"><Activity size={12} className="text-blue-500" /> Trades View</span>
              <p className="text-2xl font-bold text-white mt-1">{totalTradesCount}</p>
            </div>
            
            <div className="bg-zinc-950/50 p-4 rounded-xl border border-white/5 shadow-inner">
              <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest flex items-center gap-1.5 cursor-help" title="Win Rate (Winning trades / Total trades)"><TrendingUp size={12} className="text-emerald-500" /> Win Rate</span>
              <p className="text-2xl font-bold text-white mt-1">{winRate.toFixed(2)}%</p>
            </div>
            
            <div className="bg-zinc-950/50 p-4 rounded-xl border border-white/5 shadow-inner">
              <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest flex items-center gap-1.5"><AlertTriangle size={12} className="text-amber-500" /> Top Mistake</span>
              <p className="text-base font-bold text-amber-400 mt-2 truncate">
                {topMistake ? `${topMistake[0]} (${topMistake[1]})` : "None 🎉"}
              </p>
            </div>

            <div className="bg-zinc-950/50 p-4 rounded-xl border border-white/5 shadow-inner">
              <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest flex items-center gap-1.5"><Flame size={12} className="text-orange-500" /> Discipline Score</span>
              <p className="text-sm font-bold text-zinc-300 mt-2">
                <span className="text-orange-400 text-lg mr-1">{streakCount}</span> / 7 Days
              </p>
            </div>
          </div>

          <WeeklyReportWidget recentEntries={entries.filter(e => new Date(e.date) >= subDays(new Date(), 7))} />

          {displayDates.length === 0 ? (
            <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-12 rounded-2xl flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-zinc-950/50 rounded-full flex items-center justify-center mb-4 border border-white/5 shadow-inner">
                <BookText size={32} className="text-zinc-600" />
              </div>
              <h3 className="text-lg font-bold text-white">No Journal Entries Yet</h3>
              <p className="text-sm text-zinc-500 max-w-sm mt-2">
                Start structuring your lessons on the left. Transformation happens through disciplined reflection.
              </p>
            </div>
          ) : (
            displayDates.map((dateStr) => (
              <div key={dateStr} className="relative pl-6 before:absolute before:inset-0 before:left-[11px] before:w-0.5 before:bg-zinc-800 before:z-0">
                
                <div className="relative z-10 flex items-center gap-4 mb-5 -ml-6">
                  <div className="w-[14px] h-[14px] ml-[5px] rounded-full bg-emerald-500 ring-4 ring-zinc-950 shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <h3 className="text-[13px] font-black text-white tracking-widest uppercase bg-zinc-900 border border-white/10 px-3 py-1.5 rounded-lg shadow-sm">
                    {format(new Date(dateStr), "EEEE, MMM dd, yyyy")}
                  </h3>
                </div>

                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
                  {groupedEntries[dateStr].map((entry) => {
                    const hasRuleViolation = entry.mistakes && entry.mistakes.length > 0;
                    const isProfit = entry.pnl && entry.pnl > 0;
                    const isLoss = entry.pnl && entry.pnl < 0;
                    
                    let borderColorClass = "border-black/10 dark:border-white/5";
                    if (hasRuleViolation) borderColorClass = "border-amber-500/50";
                    else if (isProfit) borderColorClass = "border-emerald-500/50";
                    else if (isLoss) borderColorClass = "border-red-500/50";

                    const validDate = getValidDate(entry.date);
                    
                    return (
                      <div 
                        key={entry.id} 
                        onClick={() => setViewingEntry(entry)}
                        className={`bg-zinc-900 border fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-5 rounded-2xl shadow-sm hover:bg-zinc-800/40 transition-all cursor-pointer flex flex-col h-full group relative ${borderColorClass}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-black tracking-widest uppercase text-zinc-400">
                              {validDate.toLocaleDateString()}
                            </span>
                            {entry.pnl !== undefined && entry.pnl !== null && (
                               <span className={`text-[13px] font-bold ${entry.pnl > 0 ? 'text-emerald-400' : entry.pnl < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                                 {entry.pnl > 0 ? '+' : ''}${entry.pnl}
                               </span>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); setEditingEntry(entry); }} className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors" title="Edit"><Pencil size={14} /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }} className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors" title="Delete"><Trash2 size={14} /></button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {entry.qualityScore && (
                           <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded border ${entry.qualityScore === 'A' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' : entry.qualityScore === 'B' ? 'text-blue-400 border-blue-500/20 bg-blue-500/10' : entry.qualityScore === 'C' ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' : 'text-red-400 border-red-500/20 bg-red-500/10'}`}>
                             Grade {entry.qualityScore}
                           </span>
                          )}
                          {entry.moodBefore && (
                            <span className="text-[10px] font-bold tracking-wider text-zinc-400 border border-white/5 bg-zinc-950 px-2 py-0.5 rounded">
                              {entry.moodBefore.replace(/[^a-zA-Z]/g, '').trim() || entry.moodBefore}
                            </span>
                          )}
                        </div>
                        
                        {/* Text Content */}
                        <div className="text-zinc-300 text-[13px] whitespace-pre-wrap leading-[1.6] line-clamp-3 font-medium opacity-90 mb-4 flex-grow">
                          <SmartText text={entry.text} />
                        </div>

                        {/* Mistakes & AI Score */}
                        <div className="mt-auto pt-4 border-t border-white/5">
                          {entry.mistakes && entry.mistakes.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {entry.mistakes.map(m => (
                                <span key={m} className="text-[9px] font-black tracking-wider uppercase text-amber-500 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded shadow-sm">{m}</span>
                              ))}
                            </div>
                          )}
                          
                          {entry.aiScore !== undefined && (
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shadow-inner border ${entry.aiScore >= 80 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : entry.aiScore >= 50 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                                {entry.aiScore}
                              </div>
                              <div className="flex-1">
                                <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest block">AI Insight</span>
                                <span className="text-[11px] font-medium text-zinc-300 line-clamp-1">{entry.aiInsight || "No insight generated."}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            ))
          )}
        </div>
      </div>

      {/* View Modal */}
      {viewingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setViewingEntry(null)}>
          <div 
            className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] scale-100 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-zinc-900 shrink-0 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <CalendarIcon className="text-emerald-500" size={18} />
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {format(new Date(viewingEntry.date), "EEEE, MMM dd, yyyy")}
                </h2>
                {viewingEntry.qualityScore && (
                  <span className={`text-[11px] font-black tracking-wider uppercase px-2 py-0.5 rounded border ${viewingEntry.qualityScore === 'A' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' : viewingEntry.qualityScore === 'B' ? 'text-blue-400 border-blue-500/20 bg-blue-500/10' : viewingEntry.qualityScore === 'C' ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' : 'text-red-400 border-red-500/20 bg-red-500/10'}`}>
                    Grade {viewingEntry.qualityScore}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { setEditingEntry(viewingEntry); setViewingEntry(null); }} className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors mr-2" title="Edit"><Pencil size={18} /></button>
                <button onClick={() => setViewingEntry(null)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"><X size={18} /></button>
              </div>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar flex flex-col md:flex-row gap-8">
              <div className="flex-1 space-y-6">
                
                <div className="flex flex-wrap gap-2">
                  {viewingEntry.moodBefore && (
                    <span className="text-[11px] font-bold tracking-wider text-zinc-400 border border-white/10 bg-zinc-950 px-2.5 py-1 rounded-lg shadow-inner">Prep: {viewingEntry.moodBefore}</span>
                  )}
                  {viewingEntry.moodAfter && (
                    <span className="text-[11px] font-bold tracking-wider text-zinc-400 border border-white/10 bg-zinc-950 px-2.5 py-1 rounded-lg shadow-inner">Post: {viewingEntry.moodAfter}</span>
                  )}
                </div>

                <div className="text-zinc-300 whitespace-pre-wrap leading-[1.8] font-medium text-[15px] opacity-90">
                  <SmartText text={viewingEntry.text} />
                </div>
                
                {viewingEntry.mistakes && viewingEntry.mistakes.length > 0 && (
                  <div className="pt-4 border-t border-white/5">
                    <span className="block text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-3">Identified Mistakes</span>
                    <div className="flex flex-wrap gap-2">
                       {viewingEntry.mistakes.map(m => (
                         <span key={m} className="text-[11px] font-bold tracking-wider uppercase text-amber-500 border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 rounded-lg shadow-sm">{m}</span>
                       ))}
                    </div>
                  </div>
                )}

                {/* AI Score Box */}
                {viewingEntry.aiScore !== undefined && (
                  <div className="mt-8">
                    <AIScoreCard data={viewingEntry} />
                  </div>
                )}
              </div>
              
              {viewingEntry.imageUrl && (
                <div className="flex-1 rounded-xl overflow-hidden border border-black/10 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none bg-zinc-950/50 flex flex-col">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={viewingEntry.imageUrl} alt="Trading Chart Snapshot" className="w-full h-auto object-contain bg-black/40" />
                  <div className="p-3 bg-zinc-900 border-t border-white/5 flex justify-center">
                    <a href={viewingEntry.imageUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-2 uppercase tracking-wider">
                      <Maximize2 size={12} /> View Original Full Resolution
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal Base (Minimal update) */}
      {editingEntry && (
        <EditEntryModal entry={editingEntry} onClose={() => setEditingEntry(null)} />
      )}
    </div>
  );
}

function EditEntryModal({ entry, onClose }: { entry: JournalEntry, onClose: () => void }) {
  const { user } = useAuth();
  const { alert } = useModal();
  const [date, setDate] = useState(format(new Date(entry.date), "yyyy-MM-dd"));
  const [text, setText] = useState(entry.text);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(entry.imageUrl || null);
  const [submitting, setSubmitting] = useState(false);

  const [moodBefore, setMoodBefore] = useState(entry.moodBefore || "");
  const [moodAfter, setMoodAfter] = useState(entry.moodAfter || "");
  const [mistakes, setMistakes] = useState<string[]>(entry.mistakes || []);
  const [qualityScore, setQualityScore] = useState<"A"|"B"|"C"|"D" | "">(entry.qualityScore || "");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const toggleMistake = (tag: string) => setMistakes(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !entry.id) return;
    if (imageFile && imageFile.size > 2 * 1024 * 1024) { await alert({ message: "Max 2MB image allowed", variant: "info" }); return; }
    
    setSubmitting(true);
    try {
      let finalImageUrl = entry.imageUrl || null;
      if (imageFile) {
        const compressedFile = await compressImage(imageFile);
        finalImageUrl = await uploadToCloudinary(compressedFile);
      } else if (!previewUrl) {
         finalImageUrl = null;
      }

      await updateDoc(doc(db, "users", user!.uid, "journal", entry.id), {
        date: new Date(date).getTime(),
        text,
        imageUrl: finalImageUrl,
        moodBefore,
        moodAfter,
        mistakes,
        ...(qualityScore ? { qualityScore } : {})
      });

      onClose();
    } catch (error) {
      console.error("Error updating journal entry:", error);
      await alert({ message: "Failed to update entry." });
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] scale-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-zinc-900 shrink-0">
          <h2 className="text-lg font-bold text-white">Edit Journal Entry</h2>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"><X size={18} /></button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] uppercase font-bold text-zinc-500 mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm focus:border-emerald-500 focus:outline-none color-scheme-dark shadow-inner" />
            </div>

            <div className="space-y-1">
               <label className="block text-[11px] uppercase font-bold text-zinc-500 mb-1">Grade</label>
               <div className="flex gap-2">
                 {QUALITY_SCORES.map(s => (
                   <button key={s} type="button" onClick={() => setQualityScore(s as any)} className={`flex-1 py-1.5 rounded-lg border font-bold text-sm transition-all ${qualityScore === s ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500 shadow-inner'}`}>{s}</button>
                 ))}
               </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase font-bold text-zinc-500 mb-1">Mistakes</label>
              <div className="flex flex-wrap gap-2">
                {MISTAKE_TAGS.map(tag => (
                  <button key={tag} type="button" onClick={() => toggleMistake(tag)} className={`text-[11px] px-2 py-1 rounded-md border transition-all ${mistakes.includes(tag) ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>{tag}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase font-bold text-zinc-500 mb-1">Notes</label>
              <textarea value={text} onChange={(e) => setText(e.target.value)} required rows={6} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm focus:border-emerald-500 focus:outline-none resize-none shadow-inner text-zinc-300" />
            </div>

            <div className="pt-2 flex justify-end gap-3 border-t border-white/5">
              <button type="button" onClick={onClose} disabled={submitting} className="px-4 py-2.5 text-[13px] text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl font-bold transition-colors">Cancel</button>
              <button type="submit" disabled={submitting} className="px-5 py-2.5 text-[13px] bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center gap-2 font-bold transition-colors shadow-sm disabled:opacity-50">
                {submitting && <Loader2 size={14} className="animate-spin" />} Save Updates
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
