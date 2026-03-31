"use client";

import { useState } from "react";
import { collection, addDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { JournalEntry } from "@/types";
import { ImagePlus, Loader2, X, AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useModal } from "@/lib/ModalContext";
import { useTrial } from "@/components/TrialGuard";
import { compressImage, uploadToCloudinary } from "@/lib/imageUtils";
import { format } from "date-fns";

const DEFAULT_PROMPT = "Setup:\nWhat was your setup?\n\nRules Followed:\nDid you follow your plan?\n\nWhat I'd do differently:\nWhat will you improve next time?\n\nMarket Lesson:\nWhat did the market teach you today?\n";
const MOODS_BEFORE = ["😤 Impatient", "😐 Neutral", "😎 Confident", "😰 Fearful"];
const MOODS_AFTER = ["😡 Frustrated", "🙂 Satisfied", "🤯 Shocked", "😶 Numb"];
const MISTAKE_TAGS = ["FOMO", "Overtrading", "Revenge trading", "Ignored SL", "Early exit", "Late entry", "No setup"];
const QUALITY_SCORES = ["A", "B", "C", "D"];

const getTodayDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

interface NewReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  dailyJournalLimitReached: boolean;
}

export default function NewReflectionModal({ isOpen, onClose, dailyJournalLimitReached }: NewReflectionModalProps) {
  const { user } = useAuth();
  const { alert } = useModal();
  const { access } = useTrial();
  const isFree = access === "free";

  const [date, setDate] = useState(getTodayDate());
  const [text, setText] = useState(DEFAULT_PROMPT);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [moodBefore, setMoodBefore] = useState("");
  const [moodAfter, setMoodAfter] = useState("");
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [qualityScore, setQualityScore] = useState<"A"|"B"|"C"|"D"|"">("");
  const [pnl, setPnl] = useState<number | "">("");
  const [slFollowed, setSlFollowed] = useState(false);

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
    if (!text.trim() || !user) return;

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

      // Fetch AI Score
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

      const docRef = await addDoc(collection(db, "users", user.uid, "journal"), dbEntry);
      
      const fileToUpload = imageFile;
      
      // Reset form
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
      
      onClose(); // close modal optimistically

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
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Slide-in Drawer */}
      <div className="relative w-full max-w-[450px] bg-[#0A0A0A] h-full shadow-2xl border-l border-white/10 animate-in slide-in-from-right duration-300 overflow-y-auto custom-scrollbar">
        <div className="p-6 space-y-8">
          
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h2 className="text-xl font-bold text-[#D4AF37] tracking-tight">New Reflection</h2>
            <button 
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3 relative group">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Smart Reflection</label>
                <span className="text-[10px] font-bold text-[#EAEAEA] bg-white/5 px-2 py-0.5 rounded">{format(new Date(date), "MMM dd, yyyy")}</span>
              </div>
              <div className="absolute inset-0 bg-[#D4AF37]/5 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
                rows={8}
                className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-sm text-[#EAEAEA] placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 resize-y relative leading-relaxed"
              />
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Emotional Intelligence</label>
              <div className="bg-black/20 p-4 rounded-2xl border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] space-y-5 shadow-inner">
                <div>
                  <span className="text-[10px] text-zinc-600 dark:text-[#A0A0A0] mb-2.5 block uppercase font-bold tracking-widest">Before Trade</span>
                  <div className="flex flex-wrap gap-2">
                    {MOODS_BEFORE.map(m => (
                      <button key={m} type="button" onClick={() => setMoodBefore(prev => prev === m ? "" : m)} className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${moodBefore === m ? 'bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#D4AF37]' : 'bg-transparent border-zinc-800 text-zinc-600 dark:text-[#A0A0A0] hover:border-zinc-700 hover:text-[#EAEAEA]'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-px bg-white/5" />
                <div>
                  <span className="text-[10px] text-zinc-600 dark:text-[#A0A0A0] mb-2.5 block uppercase font-bold tracking-widest">After Trade</span>
                  <div className="flex flex-wrap gap-2">
                    {MOODS_AFTER.map(m => (
                      <button key={m} type="button" onClick={() => setMoodAfter(prev => prev === m ? "" : m)} className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${moodAfter === m ? 'bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#D4AF37]' : 'bg-transparent border-zinc-800 text-zinc-600 dark:text-[#A0A0A0] hover:border-zinc-700 hover:text-[#EAEAEA]'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Mistake Intelligence</label>
              </div>
              <div className="flex flex-wrap gap-2 bg-black/20 p-4 rounded-2xl border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] shadow-inner">
                {MISTAKE_TAGS.map(tag => (
                  <button key={tag} type="button" onClick={() => toggleMistake(tag)} className={`text-xs px-3 py-1.5 rounded-full border transition-all ${mistakes.includes(tag) ? 'bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#D4AF37]' : 'bg-transparent border-zinc-800 text-zinc-600 dark:text-[#A0A0A0] hover:border-zinc-700'}`}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Trade Quality</label>
              <div className="grid grid-cols-4 gap-2">
                {QUALITY_SCORES.map(s => {
                  let activeColor = '';
                  if (s === "A") activeColor = 'bg-[#10B981]/20 border-[#10B981]/50 text-[#10B981]';
                  if (s === "B") activeColor = 'bg-[#3B82F6]/20 border-[#3B82F6]/50 text-[#3B82F6]';
                  if (s === "C") activeColor = 'bg-[#F59E0B]/20 border-[#F59E0B]/50 text-[#F59E0B]';
                  if (s === "D") activeColor = 'bg-[#EF4444]/20 border-[#EF4444]/50 text-[#EF4444]';
                  return (
                    <button key={s} type="button" onClick={() => setQualityScore(s as any)} className={`py-2.5 rounded-2xl border font-bold text-sm transition-all shadow-inner ${qualityScore === s ? activeColor : 'bg-transparent border-zinc-800 text-zinc-600 dark:text-[#A0A0A0] hover:text-[#EAEAEA]'}`}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-600 dark:text-[#A0A0A0] block uppercase font-bold tracking-widest">Net PnL ($)</label>
                <input
                  type="number"
                  value={pnl}
                  onChange={(e) => setPnl(e.target.value ? Number(e.target.value) : "")}
                  placeholder="e.g. 150"
                  className="w-full bg-black/50 border border-white/10 rounded-2xl p-3 text-sm text-[#EAEAEA] focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
                />
              </div>
              <div className="space-y-2 flex flex-col justify-end">
                <label className={`cursor-pointer flex items-center justify-center gap-2 w-full h-[46px] border rounded-2xl transition-all text-xs group shadow-inner ${slFollowed ? 'bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#D4AF37]' : 'bg-black/20 border-zinc-800 text-zinc-600 dark:text-[#A0A0A0] hover:text-[#EAEAEA]'}`} onClick={() => setSlFollowed(!slFollowed)}>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${slFollowed ? 'border-[#D4AF37] bg-[#D4AF37] text-zinc-950' : 'border-zinc-700 bg-transparent text-transparent'}`}>
                      <CheckCircle2 size={12} strokeWidth={4} />
                  </div>
                  <span className="font-bold tracking-wide">Followed SL</span>
                </label>
              </div>
            </div>

            <div className="flex gap-4">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-1/3 bg-black/50 border border-white/10 rounded-2xl p-3 text-sm text-[#EAEAEA] color-scheme-dark focus:outline-none focus:border-[#D4AF37]/50"
              />
              <div className="flex-1 relative">
                {previewUrl ? (
                  <div className="relative rounded-2xl overflow-hidden luxury-card h-[46px] group flex items-center shadow-inner">
                    <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                    <span className="relative z-10 text-xs text-zinc-900 dark:text-[#EAEAEA] px-4 font-medium truncate">Setup Image Attached</span>
                    <button type="button" onClick={() => { setImageFile(null); setPreviewUrl(null); }} className="absolute z-20 inset-y-0 right-0 px-3 bg-red-500/90 text-[#EAEAEA] text-xs font-bold transition-colors">
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex items-center justify-center gap-2 w-full h-[46px] border border-dashed border-zinc-700/50 rounded-2xl bg-black/20 hover:border-[#D4AF37]/50 transition-all text-xs text-zinc-600 dark:text-[#A0A0A0] group shadow-inner">
                    <ImagePlus size={14} className="group-hover:text-[#D4AF37] transition-colors" />
                    <span className="font-medium group-hover:text-[#D4AF37] transition-colors">Attach Setup Image</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                  </label>
                )}
              </div>
            </div>

            {isFree && dailyJournalLimitReached && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-2 shadow-inner">
                <Lock size={14} /> Daily limit reached. Upgrade to log unlimited reflections.
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !text.trim() || (isFree && dailyJournalLimitReached)}
              className="w-full bg-[#D4AF37] hover:bg-[#F3D060] text-black font-bold text-sm px-6 py-3.5 rounded-full transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isFree && dailyJournalLimitReached ? "Limit Reached" : submitting ? <><Loader2 size={16} className="animate-spin" /> Saving Reflection...</> : "Log Reflection"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
