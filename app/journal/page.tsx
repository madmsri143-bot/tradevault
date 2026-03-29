"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, query, orderBy, onSnapshot, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { JournalEntry, Trade } from "@/types";
import { format, subDays, startOfDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { ImagePlus, Loader2, Calendar as CalendarIcon, Pencil, Trash2, X, Maximize2, BookText, TrendingUp, AlertTriangle, Target, Flame, Activity, Lock, BrainCircuit, HeartPulse, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
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

const getTodayDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

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
        if (lower === "discipline") return <span key={i} className="text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded font-bold tracking-wider text-[11px] uppercase">{part}</span>;
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
  
  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Daily journal limit for free users (max 1 per day)
  const todayStr = getTodayDate();
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

  // Calendar Data
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  // Elite System Calculations
  const relevantTrades = trades.filter(t => isSameMonth(getValidDate(t.date), currentMonth));
  const totalTradesCount = relevantTrades.length;
  const nonBreakevenTrades = relevantTrades.filter(t => t.pnl !== 0);
  const winRate = nonBreakevenTrades.length > 0 ? (relevantTrades.filter(t => t.pnl > 0).length / nonBreakevenTrades.length) * 100 : 0;

  const mistakesCount: Record<string, number> = {};
  entries.forEach(entry => {
    if (isSameMonth(getValidDate(entry.date), currentMonth)) {
      entry.mistakes?.forEach(m => {
        mistakesCount[m] = (mistakesCount[m] || 0) + 1;
      });
    }
  });
  const topMistake = Object.keys(mistakesCount).length > 0 ? Object.entries(mistakesCount).sort((a,b)=>b[1]-a[1])[0] : null;

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const recent7Days = Array.from({ length: 7 }).map((_, i) => format(startOfDay(subDays(new Date(), i)), "yyyy-MM-dd"));
  const daysLedger = [...new Set(entries.map(e => format(new Date(e.date), "yyyy-MM-dd")))];
  const streakCount = recent7Days.filter(d => daysLedger.includes(d)).length;

  return (
    <div className="h-screen overflow-y-auto custom-scrollbar w-full">
      <div className="space-y-6 animate-in fade-in duration-500 max-w-[1400px] mx-auto pb-10 p-4 lg:p-6 lg:pt-8 w-full cursor-default">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#EAEAEA] flex items-center gap-3"><Target className="text-[#D4AF37]" /> Journal</h2>
          <p className="text-sm text-[#A0A0A0] mt-1">Structured reflections and mistake intelligence framework.</p>
        </div>
        
        {/* Month Navigation */}
        <div className="flex items-center gap-2 bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border border-[rgba(212,175,55,0.15)] shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)] p-2 rounded-2xl">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 text-[#A0A0A0] hover:text-[#EAEAEA] hover:bg-zinc-800 rounded transition-colors"><ChevronLeft size={18} /></button>
          <span className="text-sm font-bold text-[#EAEAEA] min-w-[120px] text-center tracking-wide">{format(currentMonth, "MMM yyyy")}</span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 text-[#A0A0A0] hover:text-[#EAEAEA] hover:bg-zinc-800 rounded transition-colors"><ChevronRight size={18} /></button>
          {!isSameMonth(currentMonth, new Date()) && (
            <button onClick={() => setCurrentMonth(new Date())} className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-wider ml-1 px-2 py-1 bg-zinc-800 rounded hover:text-[#EAEAEA] transition-colors">Today</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* LEFT PANEL: Elite Form */}
        <div className="xl:col-span-1">
          <div className="bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border border-[rgba(212,175,55,0.15)] fade-slide-up shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)] p-5 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold tracking-wider uppercase text-amber-400">New Reflection</h2>
              <span className="text-[11px] font-bold text-[#A0A0A0] bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border border-[rgba(212,175,55,0.15)] px-2.5 py-1 rounded-lg">{format(new Date(), "EEEE, MMM dd, yyyy")}</span>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="space-y-2.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A0A0A0]">Emotional Intelligence</label>
                <div className="bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md p-3 rounded-2xl border border-[rgba(212,175,55,0.15)] space-y-4 shadow-inner">
                  <div>
                    <span className="text-[10px] text-[#A0A0A0] mb-2 block">Before Trade</span>
                    <div className="flex flex-wrap gap-2">
                      {MOODS_BEFORE.map(m => (
                        <button key={m} type="button" onClick={() => setMoodBefore(prev => prev === m ? "" : m)} className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${moodBefore === m ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border-zinc-800 text-[#A0A0A0] hover:border-zinc-700 hover:text-[#EAEAEA]'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div>
                    <span className="text-[10px] text-[#A0A0A0] mb-2 block">After Trade</span>
                    <div className="flex flex-wrap gap-2">
                      {MOODS_AFTER.map(m => (
                        <button key={m} type="button" onClick={() => setMoodAfter(prev => prev === m ? "" : m)} className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${moodAfter === m ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border-zinc-800 text-[#A0A0A0] hover:border-zinc-700 hover:text-[#EAEAEA]'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#A0A0A0]">Mistake Intelligence</label>
                  <span className="text-[9px] text-[#A0A0A0] uppercase tracking-widest bg-white/5 px-1.5 rounded">Multi-select</span>
                </div>
                <div className="flex flex-wrap gap-2 bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md p-3 rounded-2xl border border-[rgba(212,175,55,0.15)] shadow-inner">
                  {MISTAKE_TAGS.map(tag => (
                    <button key={tag} type="button" onClick={() => toggleMistake(tag)} className={`text-xs px-2.5 py-1 rounded-full border transition-all ${mistakes.includes(tag) ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border-zinc-800 text-[#A0A0A0] hover:border-zinc-700'}`}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A0A0A0]">Execution Score</label>
                <div className="grid grid-cols-4 gap-2">
                  {QUALITY_SCORES.map(s => {
                    const activeColor = s === 'A' ? 'bg-emerald-500/20 border-emerald-500/50 text-amber-400' : s === 'B' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : s === 'C' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-red-500/20 border-red-500/50 text-red-400';
                    return (
                      <button key={s} type="button" onClick={() => setQualityScore(s as any)} className={`py-2 rounded-2xl border font-bold text-sm transition-all ${qualityScore === s ? activeColor : 'bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border-zinc-800 text-[#A0A0A0] hover:bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md hover:text-[#EAEAEA] shadow-inner'}`}>
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A0A0A0]">Trade PnL ($)</label>
                  <input
                    type="number"
                    value={pnl}
                    onChange={(e) => setPnl(e.target.value ? Number(e.target.value) : "")}
                    placeholder="e.g. 150 or -50"
                    className="w-full bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border border-zinc-800 rounded-2xl p-3 text-sm focus:border-emerald-500 focus:outline-none color-scheme-dark shadow-inner text-[#EAEAEA] placeholder:text-zinc-600"
                  />
                </div>
                <div className="space-y-1.5 flex flex-col justify-end">
                  <label className={`cursor-pointer flex items-center justify-center gap-2 w-full h-[46px] border border-zinc-800 rounded-2xl transition-all text-xs group shadow-inner ${slFollowed ? 'bg-emerald-500/20 border-emerald-500/50 text-amber-400' : 'bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md text-[#A0A0A0] hover:bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md'}`} onClick={() => setSlFollowed(!slFollowed)}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${slFollowed ? 'border-emerald-500 bg-emerald-500 text-zinc-950' : 'border-zinc-700 bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md text-transparent'}`}>
                       <CheckCircle2 size={12} strokeWidth={4} />
                    </div>
                    <span className="font-bold tracking-wide">Followed SL</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2.5 relative group">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A0A0A0]">Smart Reflection</label>
                <div className="absolute inset-0 bg-emerald-500/5 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  required
                  rows={8}
                  className="w-full relative bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border border-zinc-800 rounded-2xl p-4 text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-all resize-none shadow-inner leading-relaxed text-[#EAEAEA]"
                />
              </div>

              <div className="space-y-2.5 flex gap-4">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-1/3 bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border border-zinc-800 rounded-2xl p-2.5 text-xs text-[#A0A0A0] focus:border-emerald-500 focus:outline-none color-scheme-dark shadow-inner transition-colors"
                />
                <div className="flex-1 relative">
                  {previewUrl ? (
                    <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md h-[42px] group flex items-center shadow-inner">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                      <span className="relative z-10 text-xs text-[#EAEAEA] px-4 font-medium truncate">Image attached</span>
                      <button type="button" onClick={() => { setImageFile(null); setPreviewUrl(null); }} className="absolute z-20 inset-y-0 right-0 px-3 bg-red-500/90 text-[#EAEAEA] text-xs font-bold transition-colors">
                        X
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex items-center justify-center gap-2 w-full h-[42px] border border-dashed border-zinc-700/50 rounded-2xl bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md hover:bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md hover:border-emerald-500/50 transition-all text-xs text-[#A0A0A0] group shadow-inner">
                      <ImagePlus size={14} className="group-hover:text-amber-400 transition-colors" />
                      <span className="font-medium group-hover:text-amber-400 transition-colors">Attach Setup</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </label>
                  )}
                </div>
              </div>

              {isFree && dailyJournalLimitReached && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold flex items-center gap-2">
                  <Lock size={14} /> Daily limit reached. Upgrade to log unlimited journal entries.
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !text.trim() || (isFree && dailyJournalLimitReached)}
                className="w-full bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 text-[#D4AF37] font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:border-[#D4AF37] active:scale-[0.98]"
              >
                {isFree && dailyJournalLimitReached ? "Limit Reached" : submitting ? <><Loader2 size={16} className="animate-spin" /> Logging...</> : "Log Journal Entry"}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT PANEL: Display & Summary */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* ELITE DAILY SUMMARY BLOCK */}
          <div className="bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border border-[rgba(212,175,55,0.15)] fade-slide-up shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)] p-5 rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-4 tracking-tight shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <div className="bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md p-4 rounded-2xl border border-[rgba(212,175,55,0.15)] shadow-inner">
              <span className="text-[10px] text-[#A0A0A0] uppercase font-black tracking-widest flex items-center gap-1.5"><Activity size={12} className="text-blue-500" /> Trades View</span>
              <p className="text-2xl font-bold text-[#EAEAEA] mt-1">{totalTradesCount}</p>
            </div>
            
            <div className="bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md p-4 rounded-2xl border border-[rgba(212,175,55,0.15)] shadow-inner">
              <span className="text-[10px] text-[#A0A0A0] uppercase font-black tracking-widest flex items-center gap-1.5 cursor-help" title="Win Rate (Winning trades / Total trades)"><TrendingUp size={12} className="text-emerald-500" /> Win Rate</span>
              <p className="text-2xl font-bold text-[#EAEAEA] mt-1">{winRate.toFixed(2)}%</p>
            </div>
            
            <div className="bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md p-4 rounded-2xl border border-[rgba(212,175,55,0.15)] shadow-inner">
              <span className="text-[10px] text-[#A0A0A0] uppercase font-black tracking-widest flex items-center gap-1.5"><AlertTriangle size={12} className="text-amber-500" /> Top Mistake</span>
              <p className="text-base font-bold text-amber-400 mt-2 truncate">
                {topMistake ? `${topMistake[0]} (${topMistake[1]})` : "None 🎉"}
              </p>
            </div>

            <div className="bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md p-4 rounded-2xl border border-[rgba(212,175,55,0.15)] shadow-inner">
              <span className="text-[10px] text-[#A0A0A0] uppercase font-black tracking-widest flex items-center gap-1.5"><Flame size={12} className="text-orange-500" /> Discipline Score</span>
              <p className="text-sm font-bold text-[#EAEAEA] mt-2">
                <span className="text-orange-400 text-lg mr-1">{streakCount}</span> / 7 Days
              </p>
            </div>
          </div>

          <WeeklyReportWidget recentEntries={entries.filter(e => {
            const d = getValidDate(e.date);
            return d >= subDays(new Date(), 7);
          })} />

          {/* Calendar Grid */}
          <div className="bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border border-[rgba(212,175,55,0.15)] shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)] p-5 rounded-2xl relative overflow-hidden">
            <div className="grid grid-cols-7 gap-1 mb-3">
               {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                 <div key={day} className="text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#A0A0A0]">{day}</div>
               ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {calendarDays.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const dayEntries = groupedEntries[dateStr] || [];
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate === dateStr;
                
                let dayPnl = 0;
                dayEntries.forEach(e => { if (e.pnl) dayPnl += e.pnl });
                
                const isProfit = dayPnl > 0;
                const isLoss = dayPnl < 0;
                const hasEntries = dayEntries.length > 0;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`relative min-h-[64px] sm:min-h-[84px] p-1.5 sm:p-2 rounded-2xl flex flex-col items-center justify-start border transition-all ${
                      !isCurrentMonth ? 'opacity-30 pointer-events-none border-transparent bg-transparent' :
                      isSelected ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/50 scale-105 z-10' :
                      hasEntries ? (isProfit ? 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/50 hover:bg-emerald-500/10' : isLoss ? 'border-red-500/20 bg-red-500/5 hover:border-red-500/50 hover:bg-red-500/10' : 'border-[#111827] bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md hover:bg-zinc-800') :
                      'border-transparent bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md hover:bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border-[#111827] hover:border-[#111827]'
                    }`}
                  >
                    <span className={`text-xs sm:text-sm font-bold ${isToday(day) ? 'text-amber-400' : isSelected ? 'text-amber-400' : hasEntries ? 'text-zinc-200' : 'text-zinc-600'}`}>
                      {format(day, "d")}
                    </span>
                    {hasEntries && (
                      <div className="mt-auto flex flex-col items-center gap-1 w-full">
                        {dayPnl !== 0 && (
                          <span className={`hidden sm:block text-[9px] font-black tracking-tighter ${dayPnl > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                            {dayPnl > 0 ? '+' : ''}${Math.round(dayPnl)}
                          </span>
                        )}
                        <div className="flex gap-0.5">
                           {dayEntries.slice(0, 3).map((_, i) => (
                             <div key={i} className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${isSelected ? 'bg-amber-400' : isProfit ? 'bg-emerald-500/50' : isLoss ? 'bg-red-500/50' : 'bg-zinc-500'}`} />
                           ))}
                           {dayEntries.length > 3 && <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-zinc-600" />}
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          </div>
        </div>
      </div>

      {/* Selected Date Modal */}
      {selectedDate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setSelectedDate(null)}>
          <div 
            className="bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border border-[rgba(212,175,55,0.15)] rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] scale-100 animate-in zoom-in-95 duration-200 relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            
            <div className="flex items-center justify-between p-5 border-b border-[#111827] bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md shrink-0 rounded-t-2xl relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CalendarIcon className="text-emerald-500" size={16} />
                </div>
                <h3 className="text-xl font-bold text-[#EAEAEA] tracking-tight">
                  {format(new Date(selectedDate), "EEEE, MMM dd, yyyy")}
                </h3>
              </div>
              <button onClick={() => setSelectedDate(null)} className="p-1.5 text-[#A0A0A0] hover:text-[#EAEAEA] hover:bg-zinc-800 rounded-md transition-colors"><X size={18} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar relative z-10 space-y-8">
               {(!groupedEntries[selectedDate] || groupedEntries[selectedDate].length === 0) ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md rounded-full flex items-center justify-center mb-4 border border-[rgba(212,175,55,0.15)] shadow-inner">
                      <BookText size={24} className="text-zinc-600" />
                    </div>
                    <p className="text-[#EAEAEA] font-bold mb-1">No Journal Entries</p>
                    <p className="text-sm text-[#A0A0A0]">You haven't logged any reflections for this day.</p>
                  </div>
               ) : (() => {
                 const dayEntries = groupedEntries[selectedDate];
                 const dayTrades = trades.filter(t => format(getValidDate(t.date), "yyyy-MM-dd") === selectedDate);
                 
                 const totalTrades = dayTrades.length;
                 const nonBreakeven = dayTrades.filter(t => t.pnl !== 0);
                 const dayWinRate = nonBreakeven.length > 0 ? (dayTrades.filter(t => t.pnl > 0).length / nonBreakeven.length) * 100 : 0;
                 const netPnl = dayEntries.reduce((sum, e) => sum + (e.pnl || 0), 0);
                 
                 return (
                   <>
                     {/* Daily Summary */}
                     <div className="grid grid-cols-3 gap-3">
                       <div className="bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md p-4 rounded-2xl border border-[rgba(212,175,55,0.15)] shadow-inner text-center">
                         <span className="text-[10px] text-[#A0A0A0] uppercase font-black tracking-widest block mb-1">Total Trades</span>
                         <span className="text-xl font-bold text-[#EAEAEA]">{totalTrades}</span>
                       </div>
                       <div className="bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md p-4 rounded-2xl border border-[rgba(212,175,55,0.15)] shadow-inner text-center">
                         <span className="text-[10px] text-[#A0A0A0] uppercase font-black tracking-widest block mb-1">Win Rate</span>
                         <span className="text-xl font-bold text-amber-400">{dayWinRate.toFixed(0)}%</span>
                       </div>
                       <div className="bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md p-4 rounded-2xl border border-[rgba(212,175,55,0.15)] shadow-inner text-center">
                         <span className="text-[10px] text-[#A0A0A0] uppercase font-black tracking-widest block mb-1">Net PnL</span>
                         <span className={`text-xl font-bold ${netPnl > 0 ? 'text-amber-400' : netPnl < 0 ? 'text-red-400' : 'text-[#EAEAEA]'}`}>
                           {netPnl > 0 ? '+' : ''}${netPnl}
                         </span>
                       </div>
                     </div>

                     {/* Entries Grouped List */}
                     <div className="space-y-6">
                       {dayEntries.map((e, idx) => (
                         <div key={e.id} className="bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border border-[rgba(212,175,55,0.15)] rounded-2xl p-5 relative overflow-hidden shadow-inner">
                           <div className="flex items-center justify-between mb-4 border-b border-[#111827] pb-3">
                             <div className="flex flex-wrap gap-2 items-center">
                               <span className="text-[10px] uppercase font-black text-[#A0A0A0] bg-white/5 px-2 py-0.5 rounded tracking-widest">Entry {idx + 1}</span>
                               {e.qualityScore && (
                                <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded border ${e.qualityScore === 'A' ? 'text-amber-400 border-emerald-500/20 bg-emerald-500/10' : e.qualityScore === 'B' ? 'text-blue-400 border-blue-500/20 bg-blue-500/10' : e.qualityScore === 'C' ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' : 'text-red-400 border-red-500/20 bg-red-500/10'}`}>
                                  Grade {e.qualityScore}
                                </span>
                               )}
                               {e.slFollowed && (
                                <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded border text-amber-400 border-emerald-500/20 bg-emerald-500/10 flex items-center gap-1">
                                  <CheckCircle2 size={10} /> Followed SL
                                </span>
                               )}
                             </div>
                             <div className="flex items-center gap-1">
                               <button onClick={(ev) => { ev.stopPropagation(); setEditingEntry(e); }} className="p-1.5 text-[#A0A0A0] hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors" title="Edit"><Pencil size={12} /></button>
                               <button onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id); }} className="p-1.5 text-[#A0A0A0] hover:text-red-400 hover:bg-red-400/10 rounded transition-colors" title="Delete"><Trash2 size={12} /></button>
                             </div>
                           </div>

                           <div className="flex flex-wrap gap-2 mb-4">
                             {e.moodBefore && <span className="text-[11px] font-bold text-[#A0A0A0] border border-[rgba(212,175,55,0.15)] bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md px-2.5 py-1 rounded-lg">💭 Prep: {e.moodBefore}</span>}
                             {e.moodAfter && <span className="text-[11px] font-bold text-[#A0A0A0] border border-[rgba(212,175,55,0.15)] bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md px-2.5 py-1 rounded-lg">💭 Post: {e.moodAfter}</span>}
                             {e.mistakes?.map(m => (
                               <span key={m} className="text-[11px] font-bold text-red-400 border border-red-500/20 bg-red-500/5 px-2.5 py-1 rounded-lg">🧠 {m}</span>
                             ))}
                           </div>

                           <div className="text-[14px] text-[#EAEAEA] whitespace-pre-wrap leading-relaxed">
                             <SmartText text={e.text} />
                           </div>

                           {e.aiScore !== undefined && (
                             <div className="mt-5 pt-4 border-t border-[#111827] flex items-center gap-3">
                               <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shadow-inner border ${e.aiScore >= 80 ? 'bg-emerald-500/20 text-amber-400 border-emerald-500/30' : e.aiScore >= 50 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                                 {e.aiScore}
                               </div>
                               <div className="flex-1">
                                 <span className="text-[10px] text-[#A0A0A0] uppercase font-black tracking-widest block">AI Insight</span>
                                 <span className="text-xs font-medium text-[#EAEAEA] block">{e.aiInsight || "No insight generated."}</span>
                               </div>
                             </div>
                           )}
                         </div>
                       ))}
                     </div>
                   </>
                 );
               })()}
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setViewingEntry(null)}>
          <div 
            className="bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border border-[rgba(212,175,55,0.15)] rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] scale-100 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[#111827] bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md shrink-0 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <CalendarIcon className="text-emerald-500" size={18} />
                <h2 className="text-lg font-bold text-[#EAEAEA] tracking-tight">
                  {format(new Date(viewingEntry.date), "EEEE, MMM dd, yyyy")}
                </h2>
                {viewingEntry.qualityScore && (
                  <span className={`text-[11px] font-black tracking-wider uppercase px-2 py-0.5 rounded border ${viewingEntry.qualityScore === 'A' ? 'text-amber-400 border-emerald-500/20 bg-emerald-500/10' : viewingEntry.qualityScore === 'B' ? 'text-blue-400 border-blue-500/20 bg-blue-500/10' : viewingEntry.qualityScore === 'C' ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' : 'text-red-400 border-red-500/20 bg-red-500/10'}`}>
                    Grade {viewingEntry.qualityScore}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { setEditingEntry(viewingEntry); setViewingEntry(null); }} className="p-1.5 text-[#A0A0A0] hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors mr-2" title="Edit"><Pencil size={18} /></button>
                <button onClick={() => setViewingEntry(null)} className="p-1.5 text-[#A0A0A0] hover:text-[#EAEAEA] hover:bg-zinc-800 rounded-md transition-colors"><X size={18} /></button>
              </div>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar flex flex-col md:flex-row gap-8">
              <div className="flex-1 space-y-6">
                
                <div className="flex flex-wrap gap-2">
                  {viewingEntry.moodBefore && (
                    <span className="text-[11px] font-bold tracking-wider text-[#A0A0A0] border border-[rgba(212,175,55,0.15)] bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md px-2.5 py-1 rounded-lg shadow-inner">Prep: {viewingEntry.moodBefore}</span>
                  )}
                  {viewingEntry.moodAfter && (
                    <span className="text-[11px] font-bold tracking-wider text-[#A0A0A0] border border-[rgba(212,175,55,0.15)] bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md px-2.5 py-1 rounded-lg shadow-inner">Post: {viewingEntry.moodAfter}</span>
                  )}
                </div>

                <div className="text-[#EAEAEA] whitespace-pre-wrap leading-[1.8] font-medium text-[15px] opacity-90">
                  <SmartText text={viewingEntry.text} />
                </div>
                
                {viewingEntry.mistakes && viewingEntry.mistakes.length > 0 && (
                  <div className="pt-4 border-t border-[#111827]">
                    <span className="block text-[10px] text-[#A0A0A0] uppercase tracking-widest font-black mb-3">Identified Mistakes</span>
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
                <div className="flex-1 rounded-2xl overflow-hidden border border-[rgba(212,175,55,0.15)] shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)] bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md flex flex-col">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={viewingEntry.imageUrl} alt="Trading Chart Snapshot" className="w-full h-auto object-contain bg-black/40" />
                  <div className="p-3 bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border-t border-[#111827] flex justify-center">
                    <a href={viewingEntry.imageUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-2 uppercase tracking-wider">
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
      <div className="bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border border-[rgba(212,175,55,0.15)] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] scale-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[#111827] bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md shrink-0">
          <h2 className="text-lg font-bold text-[#EAEAEA]">Edit Journal Entry</h2>
          <button onClick={onClose} className="p-1.5 text-[#A0A0A0] hover:text-[#EAEAEA] hover:bg-zinc-800 rounded-md transition-colors"><X size={18} /></button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] uppercase font-bold text-[#A0A0A0] mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border border-zinc-800 rounded-2xl p-2.5 text-sm focus:border-emerald-500 focus:outline-none color-scheme-dark shadow-inner" />
            </div>

            <div className="space-y-1">
               <label className="block text-[11px] uppercase font-bold text-[#A0A0A0] mb-1">Grade</label>
               <div className="flex gap-2">
                 {QUALITY_SCORES.map(s => (
                   <button key={s} type="button" onClick={() => setQualityScore(s as any)} className={`flex-1 py-1.5 rounded-lg border font-bold text-sm transition-all ${qualityScore === s ? 'bg-emerald-500/20 border-emerald-500/50 text-amber-400' : 'bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border-zinc-800 text-[#A0A0A0] shadow-inner'}`}>{s}</button>
                 ))}
               </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase font-bold text-[#A0A0A0] mb-1">Mistakes</label>
              <div className="flex flex-wrap gap-2">
                {MISTAKE_TAGS.map(tag => (
                  <button key={tag} type="button" onClick={() => toggleMistake(tag)} className={`text-[11px] px-2 py-1 rounded-md border transition-all ${mistakes.includes(tag) ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border-zinc-800 text-[#A0A0A0]'}`}>{tag}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase font-bold text-[#A0A0A0] mb-1">Notes</label>
              <textarea value={text} onChange={(e) => setText(e.target.value)} required rows={6} className="w-full bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border border-zinc-800 rounded-2xl p-3 text-sm focus:border-emerald-500 focus:outline-none resize-none shadow-inner text-[#EAEAEA]" />
            </div>

            <div className="pt-2 flex justify-end gap-3 border-t border-[#111827]">
              <button type="button" onClick={onClose} disabled={submitting} className="px-4 py-2.5 text-[13px] text-[#A0A0A0] hover:text-[#EAEAEA] hover:bg-zinc-800 rounded-2xl font-bold transition-colors">Cancel</button>
              <button type="submit" disabled={submitting} className="px-5 py-2.5 text-[13px] bg-emerald-600 hover:bg-emerald-500 text-[#EAEAEA] rounded-2xl flex items-center gap-2 font-bold transition-colors shadow-sm disabled:opacity-50">
                {submitting && <Loader2 size={14} className="animate-spin" />} Save Updates
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
