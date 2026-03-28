"use client";

import { useState, useEffect, useRef } from "react";
import { addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trade, Currency } from "@/types";
import { useAuth } from "@/lib/AuthContext";
import { useModal } from "@/lib/ModalContext";
import { Flame, Camera, Loader2, Lock, X, BookText } from "lucide-react";
import BulkPreviewModal from "./BulkPreviewModal";
import { useTrial } from "@/components/TrialGuard";

const getLocalDateString = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

interface TradeFormProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function TradeForm({ isOpen, onClose }: TradeFormProps) {
  const { user } = useAuth();
  const { alert } = useModal();
  const { access } = useTrial();
  const isFree = access === "free";
  const [loading, setLoading] = useState(false);
  const [dailyTradeCount, setDailyTradeCount] = useState(0);
  const [riskAutoSynced, setRiskAutoSynced] = useState(false);
  const [riskManuallyOverridden, setRiskManuallyOverridden] = useState(false);
  const [formData, setFormData] = useState({
    symbol: "XAUUSD",
    customSymbol: "",
    type: "buy",
    result: "Profit",
    pnl: "",
    lot: "0.1",
    risk: "",
    stopLossFollowed: true,
    entryPrice: "",
    exitPrice: "",
    currency: "USD",
    note: "",
    date: getLocalDateString(),
  });

  const [useCustomSymbol, setUseCustomSymbol] = useState(false);
  const prevResult = useRef(formData.result);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanningTrades, setScanningTrades] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [extractedTrades, setExtractedTrades] = useState<any[]>([]);

  const commonSymbols = ["EURUSD", "GBPUSD", "USDJPY", "BTCUSD", "ETHUSD", "XAUUSD", "NIFTY", "BANKNIFTY"];

  // Daily trade count for free users
  useEffect(() => {
    if (!user || !isFree) return;
    const checkDailyCount = async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      const q = query(
        collection(db, "users", user.uid, "trades"),
        where("createdAt", ">=", todayStart.getTime()),
        where("createdAt", "<=", todayEnd.getTime())
      );
      const snap = await getDocs(q);
      
      console.log("Today Trades Count:", snap.size);
      console.log("Trades considered:", snap.docs.map(d => new Date(d.data().createdAt).toString()));

      setDailyTradeCount(snap.size);
    };
    checkDailyCount();
  }, [user, isFree]); // fetch once on load, manage locally after

  const dailyLimitReached = isFree && dailyTradeCount >= 2;

  // Smart Defaults: When result changes
  useEffect(() => {
    const prev = prevResult.current;
    prevResult.current = formData.result;

    if (formData.result === "Loss") {
      // Auto-fill SL Followed = Yes (smart default)
      setFormData(p => ({ ...p, stopLossFollowed: true }));
      setRiskManuallyOverridden(false);

      // Auto-sync risk from amount if amount is set
      if (formData.pnl && !riskManuallyOverridden) {
        const absAmount = Math.abs(parseFloat(formData.pnl) || 0);
        if (absAmount > 0) {
          setFormData(p => ({ ...p, risk: absAmount.toString() }));
          setRiskAutoSynced(true);
        }
      }
    } else if (prev === "Loss" && formData.result === "Profit") {
      // Loss → Profit: disable auto-sync, clear auto-filled risk
      setRiskAutoSynced(false);
      setRiskManuallyOverridden(false);
      setFormData(p => ({ ...p, risk: "" }));
    }
  }, [formData.result]);

  // Global Paste Event Listener
  useEffect(() => {
    if (isOpen === false) return; // only listen when modal is open

    const handlePaste = (e: ClipboardEvent) => {
      // Don't intercept if they are actively typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) handleImageInput(file);
          break; // Stop after finding the first image
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen]);

  // Auto-sync risk when amount changes (only for Loss trades)
  useEffect(() => {
    if (formData.result === "Loss" && !riskManuallyOverridden && formData.pnl) {
      const absAmount = Math.abs(parseFloat(formData.pnl) || 0);
      if (absAmount > 0) {
        setFormData(p => ({ ...p, risk: absAmount.toString() }));
        setRiskAutoSynced(true);
      }
    }
  }, [formData.pnl, formData.result, riskManuallyOverridden]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Track manual risk override
    if (name === "risk") {
      setRiskManuallyOverridden(true);
      setRiskAutoSynced(false);
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dailyLimitReached) {
      return;
    }
    setLoading(true);

    try {
      const finalSymbol = useCustomSymbol ? formData.customSymbol : formData.symbol;
      
      const rawPnl = parseFloat(formData.pnl) || 0;
      const parsedPnl = formData.result === "Loss" ? -Math.abs(rawPnl) : Math.abs(rawPnl);

      let finalRisk = 0;
      if (formData.stopLossFollowed) {
        finalRisk = parseFloat(formData.risk);
        if (isNaN(finalRisk) || finalRisk <= 0) {
          await alert({ message: "Please enter a valid risk amount" });
          setLoading(false);
          return;
        }
      }

      const trade: any = {
        symbol: finalSymbol.toUpperCase() || "UNKNOWN",
        type: formData.type as "buy" | "sell",
        result: formData.result as "Profit" | "Loss",
        pnl: parsedPnl,
        lot: parseFloat(formData.lot) || 0,
        stopLossFollowed: formData.stopLossFollowed,
        currency: formData.currency as Currency,
        note: formData.note,
        date: new Date(formData.date).getTime(),
        createdAt: Date.now(),
      };

      if (formData.stopLossFollowed) {
        trade.risk = finalRisk;
      }

      if (formData.entryPrice) trade.entryPrice = parseFloat(formData.entryPrice);
      if (formData.exitPrice) trade.exitPrice = parseFloat(formData.exitPrice);

      // Reset form instantly to feel fast
      setFormData((prev) => ({
        ...prev,
        symbol: "XAUUSD",
        customSymbol: "",
        result: "Profit",
        pnl: "",
        lot: "0.1",
        risk: "",
        stopLossFollowed: true,
        entryPrice: "",
        exitPrice: "",
        note: "",
        date: getLocalDateString(),
      }));
      setLoading(false);
      setRiskAutoSynced(false);
      setRiskManuallyOverridden(false);
      
      // Optimistic instant update for free plan
      if (isFree) {
        setDailyTradeCount((prev) => prev + 1);
      }

      // Fire and forget Firebase write (onSnapshot handles latency compensation)
      if (user) {
        addDoc(collection(db, "users", user.uid, "trades"), trade).catch(async (error) => {
          console.error("Error adding trade:", error);
          await alert({ message: "Failed to sync trade to server, but it was added locally." });
        });
      }
      
      if (onClose) onClose();
      
    } catch (error) {
      console.error("Error processing trade:", error);
      console.error("Error processing trade:", error);
      setLoading(false);
    }
  };

  const handleImageInput = async (file: File) => {
    if (!file || !file.type.startsWith("image/")) {
      await alert({ message: "Only image files are allowed" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      await alert({ message: "Image size should be less than 5MB" });
      return;
    }

    setScanningTrades(true);

    try {
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });

      const response = await fetch("/api/extract-trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image })
      });
      
      if (!response.ok) throw new Error("API parsing failed.");
      const data = await response.json();
      
      if (data.trades && Array.isArray(data.trades) && data.trades.length > 0) {
         if (data.trades.length === 1) {
           const t = data.trades[0];
           const rawPnl = parseFloat(t.pnl) || 0;
           const isProfit = rawPnl >= 0;
           const finalSymbol = t.symbol ? t.symbol.toUpperCase() : formData.symbol;
           const isCustom = !commonSymbols.includes(finalSymbol);
           
           if (isCustom && t.symbol) {
             setUseCustomSymbol(true);
           }

           setFormData(prev => ({
             ...prev,
             symbol: isCustom ? prev.symbol : finalSymbol,
             customSymbol: isCustom ? finalSymbol : prev.customSymbol,
             type: t.type ? t.type.toLowerCase() : prev.type,
             result: isProfit ? "Profit" : "Loss",
             pnl: t.pnl ? Math.abs(rawPnl).toString() : prev.pnl,
             lot: t.lot ? t.lot.toString() : prev.lot,
             entryPrice: t.entry ? t.entry.toString() : prev.entryPrice,
             exitPrice: t.exit ? t.exit.toString() : prev.exitPrice,
             date: t.date || prev.date,
             stopLossFollowed: !isProfit, // sensible default
           }));
           
           // If it's a loss and there's a PnL, the 'result' change useEffect will auto-sync risk usually,
           // but we manually trigger the risk update here just in case, since setState is async.
           if (!isProfit && rawPnl) {
             setRiskAutoSynced(true);
             setRiskManuallyOverridden(false);
             setFormData(prev => ({ ...prev, risk: Math.abs(rawPnl).toString() }));
           }
         } else {
           setExtractedTrades(data.trades);
           setShowBulkModal(true);
         }
      } else {
         throw new Error("Invalid format returned.");
      }
    } catch (err: any) {
      console.error(err);
      await alert({ message: "Failed to extract trades. Try manual entry." });
    } finally {
      setScanningTrades(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isOpen === false) return null;

  const content = (
    <div className="bg-zinc-900 border border-black/10 dark:border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.8)] rounded-2xl w-[95vw] max-w-[460px] max-h-[90vh] flex flex-col relative animate-in zoom-in-95 fade-in duration-300">
      
      {/* Fixed Header */}
      <div className="shrink-0 p-6 md:px-8 border-b border-white/5 relative z-10">
        {onClose && (
          <button type="button" onClick={onClose} className="absolute top-6 right-6 p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
            <X size={18} />
          </button>
        )}
        <h2 className="text-xl font-bold text-emerald-400 tracking-tight mb-2">Log New Trade</h2>
        <div className="w-full relative">
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                 handleImageInput(file);
                 e.target.value = ''; // Reset input so same file can be selected again
              }
            }}
            className="hidden" 
            id="screenshot-upload"
          />
          <button
            type="button"
            onClick={() => !isFree && fileInputRef.current?.click()}
            disabled={scanningTrades || isFree}
            title={isFree ? "Upload screenshots to auto-fill trades — available in Pro plans" : "Upload or paste (Ctrl + V) your MT4/MT5 screenshot"}
            className={`w-full text-xs font-bold px-3 py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              isFree ? 'bg-zinc-800 text-amber-500/80 cursor-not-allowed border border-amber-500/20' : 'text-zinc-950 bg-[#00FFB2] hover:bg-[#00e09d]'
            }`}
          >
            {isFree ? <Lock size={15} /> : scanningTrades ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
            {isFree ? "Auto-fill via Screenshot (Pro)" : scanningTrades ? "Scanning..." : "Upload or paste (Ctrl + V) your MT4/MT5 screenshot"}
          </button>
          
          <p className="text-[10px] text-zinc-500 text-center mt-2 leading-tight">
            Supports MT4, MT5 or Broker history screenshots.<br/>
            <span className="opacity-80">Ensure Pair, Buy/Sell, Lot Size, and PnL are visible.</span>
          </p>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Symbol Line */}
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <label className="block text-xs text-zinc-400 mb-1">Symbol</label>
            {!useCustomSymbol ? (
              <select
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                className={`w-full bg-zinc-950 border rounded p-2 text-sm focus:border-emerald-500 focus:outline-none ${formData.symbol === "XAUUSD" ? "border-emerald-500/30 text-emerald-400 font-medium" : "border-zinc-800"}`}
                required
              >
                <option value="" disabled>Select pair</option>
                {commonSymbols.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input
                type="text"
                name="customSymbol"
                value={formData.customSymbol}
                onChange={handleChange}
                placeholder="e.g. AAPL"
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none uppercase"
                required
              />
            )}

          </div>
          <div className="pt-5">
            <button
              type="button"
              onClick={() => setUseCustomSymbol(!useCustomSymbol)}
              className="text-xs text-emerald-500 hover:text-emerald-400 underline"
            >
              {useCustomSymbol ? "Use List" : "Custom"}
            </button>
          </div>
        </div>

        {/* Row: Type, Lot sizes */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Type</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Lot Size</label>
            <input
              type="number"
              step="0.01"
              name="lot"
              value={formData.lot}
              onChange={handleChange}
              placeholder="0.1"
              required
              className={`w-full bg-zinc-950 border rounded p-2 text-sm focus:border-emerald-500 focus:outline-none ${formData.lot === "0.1" ? "border-emerald-500/30 text-emerald-400 font-medium" : "border-zinc-800"}`}
            />
          </div>
        </div>

        {/* Row: Result, PnL */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Result</label>
            <select
              name="result"
              value={formData.result}
              onChange={handleChange}
              className={`w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:outline-none focus:border-emerald-500 font-medium ${formData.result === "Profit" ? "text-emerald-500" : "text-red-500"}`}
            >
              <option value="Profit" className="text-emerald-500">Profit</option>
              <option value="Loss" className="text-red-500">Loss</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              name="pnl"
              value={formData.pnl}
              onChange={handleChange}
              placeholder="50.00"
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Row: Risk, SL Followed */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Risk Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              name="risk"
              value={formData.risk}
              onChange={handleChange}
              placeholder="e.g. 20.00"
              required={formData.stopLossFollowed}
              disabled={!formData.stopLossFollowed}
              className={`w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none ${!formData.stopLossFollowed ? 'opacity-40 cursor-not-allowed' : ''} ${riskAutoSynced ? 'border-amber-500/30' : ''}`}
            />
            {!formData.stopLossFollowed && (
               <p className="text-[10px] text-zinc-500 mt-1.5 font-medium">Risk not required when SL is not used</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">SL Followed?</label>
            <div className="flex items-center gap-4 mt-2.5">
              <label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium">
                <input 
                  type="radio" 
                  name="slGroup"
                  checked={formData.stopLossFollowed === true} 
                  onChange={() => setFormData(p => ({...p, stopLossFollowed: true}))} 
                  className="accent-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-emerald-400">Yes</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium">
                <input 
                  type="radio" 
                  name="slGroup"
                  checked={formData.stopLossFollowed === false} 
                  onChange={() => setFormData(p => ({...p, stopLossFollowed: false}))} 
                  className="accent-red-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-red-400">No</span>
              </label>
            </div>
          </div>
        </div>

        {/* Row: Currency, Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Currency</label>
            <select
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="INR">INR</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none color-scheme-dark"
            />
          </div>
        </div>

        {/* Row: Entry, Exit (Optional) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Entry Price (Optional)</label>
            <input
              type="number"
              step="any"
              name="entryPrice"
              value={formData.entryPrice}
              onChange={handleChange}
              placeholder="e.g. 1.0520"
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Exit Price (Optional)</label>
            <input
              type="number"
              step="any"
              name="exitPrice"
              value={formData.exitPrice}
              onChange={handleChange}
              placeholder="e.g. 1.0560"
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Notes</label>
          <textarea
            name="note"
            value={formData.note}
            onChange={handleChange}
            placeholder="Why did you take this trade?"
            rows={2}
            className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none resize-none"
          />
        </div>

        {/* Free Plan Daily Limit Tracker */}
        {isFree && (
          <div className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
            dailyLimitReached ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-zinc-800/50 border-white/5 text-zinc-400"
          }`}>
            <div className="flex items-center gap-2 text-xs font-bold">
              {dailyLimitReached ? <Lock size={14} /> : <BookText size={14} className="text-emerald-400" />}
              <span>{dailyLimitReached ? `Daily limit reached (${dailyTradeCount}/2)` : `${dailyTradeCount}/2 trades used today`}</span>
            </div>
            {dailyLimitReached && (
              <button 
                type="button" 
                onClick={() => window.dispatchEvent(new Event("openPricingModal"))}
                className="text-[10px] bg-amber-500 text-black px-2 py-1 flex items-center rounded font-black uppercase tracking-widest hover:bg-amber-400 transition-colors"
              >
                Upgrade
              </button>
            )}
          </div>
        )}

        </form>
      </div>

      {/* Fixed Footer */}
      <div className="shrink-0 p-6 md:px-8 md:py-5 border-t border-white/5 bg-zinc-900/80 backdrop-blur-md rounded-b-2xl">
        <div className="flex gap-3">
          {onClose && (
            <button type="button" onClick={onClose} className="px-5 py-3 text-sm font-bold text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition-colors">
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={(e) => handleSubmit(e as any)}
            disabled={loading || dailyLimitReached}
            className={`flex-1 font-bold py-3 rounded-xl transition-all shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none ${
              dailyLimitReached ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
          >
            {dailyLimitReached ? "Limit Reached" : loading ? "Saving..." : "Save Trade"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
    {isOpen !== undefined ? (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        {content}
      </div>
    ) : (
      content
    )}

    {showBulkModal && (
      <BulkPreviewModal 
        isOpen={showBulkModal} 
        onClose={() => setShowBulkModal(false)} 
        onSuccess={() => {
          setShowBulkModal(false);
          if (onClose) onClose();
        }}
        extractedTrades={extractedTrades} 
      />
    )}
    </>
  );
}
