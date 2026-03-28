"use client";

import { useState, useEffect, useRef } from "react";
import { addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trade, Currency } from "@/types";
import { useAuth } from "@/lib/AuthContext";
import { useModal } from "@/lib/ModalContext";
import { Flame, Camera, Loader2, Lock, X, BookText, Sparkles, Cpu, Upload, FileText, Table2 } from "lucide-react";
import BulkPreviewModal from "./BulkPreviewModal";
import { useTrial, useTrialWindow } from "@/components/TrialGuard";
import Papa from "papaparse";

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
  const { trialStart, trialEnd, isFree: isTrialFree } = useTrialWindow();
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
  const [isDragging, setIsDragging] = useState(false);
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
        if (item.type.startsWith("image/") || item.type === "application/pdf") {
          const file = item.getAsFile();
          if (file) handleMediaInput(file);
          break; // Stop after finding the first media
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


  // Helper: check if a date falls within the trial window
  const isDateInTrialWindow = (dateStr: string): boolean => {
    if (!isTrialFree || !trialStart || !trialEnd) return true; // premium or no window = allowed
    const d = new Date(dateStr);
    d.setHours(12, 0, 0, 0); // normalize to noon to avoid timezone edge cases
    return d >= trialStart && d <= trialEnd;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dailyLimitReached) {
      return;
    }

    // 🔒 Trial Date Guard: Block trades outside 7-day window
    if (isTrialFree && trialStart && trialEnd && !isDateInTrialWindow(formData.date)) {
      await alert({
        title: "Trial Period Restriction",
        message: `Trades outside your trial period (${trialStart.toLocaleDateString()} – ${trialEnd.toLocaleDateString()}) are locked. Upgrade to Premium for full access.`,
        variant: "danger"
      });
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

  // ═══ CSV PARSER ═══
  const handleCSVFile = async (file: File) => {
    setScanningTrades(true);
    try {
      const text = await file.text();
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });
      
      if (!result.data || result.data.length === 0) {
        throw new Error("CSV file is empty or invalid.");
      }

      // Map CSV rows to trade format
      const trades = (result.data as any[]).map(row => {
        // Try common header variations
        const symbol = row.Symbol || row.symbol || row.Asset || row.asset || row.Pair || row.pair || "";
        const type = row.Type || row.type || row.Direction || row.direction || "";
        const pnl = parseFloat(row.PnL || row.pnl || row['P&L'] || row.Profit || row.profit || row['Profit/Loss'] || "0");
        const lot = parseFloat(row.Lot || row.lot || row.Volume || row.volume || row.Size || row.size || "0.1");
        const entry = parseFloat(row.Entry || row.entry || row['Entry Price'] || row.Open || row.open || "0");
        const exit = parseFloat(row.Exit || row.exit || row['Exit Price'] || row.Close || row.close || "0");
        const date = row.Date || row.date || row['Trade Date'] || "";

        return {
          symbol: symbol.toUpperCase(),
          type: type.toUpperCase(),
          pnl,
          lot,
          entry: entry || "",
          exit: exit || "",
          date
        };
      }).filter(t => t.symbol && t.pnl !== 0);

      if (trades.length === 0) {
        throw new Error("No valid trades found in CSV.");
      }

      // Apply trial window filter
      const { validTrades, skippedCount } = filterTradesByTrialWindow(trades);

      if (validTrades.length === 0 && skippedCount > 0) {
        await alert({
          title: "No Trades Imported",
          message: "No trades fall within your trial period. Upgrade to import full history.",
          variant: "danger"
        });
        return;
      }

      if (skippedCount > 0) {
        await alert({
          title: "Partial Import",
          message: `Imported: ${validTrades.length} trades. Skipped: ${skippedCount} trades (outside trial period).`,
          variant: "info"
        });
      }

      if (validTrades.length === 1) {
        populateSingleTrade(validTrades[0]);
      } else {
        setExtractedTrades(validTrades);
        setShowBulkModal(true);
      }
    } catch (err: any) {
      console.error(err);
      await alert({ message: err.message || "Failed to parse CSV file." });
    } finally {
      setScanningTrades(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ═══ TRIAL WINDOW FILTER for bulk imports ═══
  const filterTradesByTrialWindow = (trades: any[]): { validTrades: any[]; skippedCount: number } => {
    if (!isTrialFree || !trialStart || !trialEnd) {
      return { validTrades: trades, skippedCount: 0 };
    }

    const valid: any[] = [];
    let skipped = 0;

    trades.forEach(t => {
      if (t.date && !isDateInTrialWindow(t.date)) {
        skipped++;
      } else {
        valid.push(t);
      }
    });

    return { validTrades: valid, skippedCount: skipped };
  };

  // ═══ POPULATE SINGLE TRADE HELPER ═══
  const populateSingleTrade = (t: any) => {
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
      stopLossFollowed: !isProfit,
    }));
    
    if (!isProfit && rawPnl) {
      setRiskAutoSynced(true);
      setRiskManuallyOverridden(false);
      setFormData(prev => ({ ...prev, risk: Math.abs(rawPnl).toString() }));
    }
  };

  const handleMediaInput = async (file: File) => {
    // Handle CSV files separately
    if (file.name.endsWith('.csv') || file.type === 'text/csv') {
      return handleCSVFile(file);
    }

    if (!file || (!file.type.startsWith("image/") && file.type !== "application/pdf")) {
      await alert({ message: "Only image files, PDFs, and CSVs are allowed" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      await alert({ message: "File size should be less than 10MB" });
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
         // 🔒 Apply trial window filter to extracted trades
         const { validTrades, skippedCount } = filterTradesByTrialWindow(data.trades);

         if (validTrades.length === 0 && skippedCount > 0) {
           await alert({
             title: "No Trades Imported",
             message: "No trades fall within your trial period. Upgrade to import full history.",
             variant: "danger"
           });
           return;
         }

         if (skippedCount > 0) {
           await alert({
             title: "Partial Import",
             message: `Imported: ${validTrades.length} trades. Skipped: ${skippedCount} trades (outside trial period).`,
             variant: "info"
           });
         }

         if (validTrades.length === 1) {
           populateSingleTrade(validTrades[0]);
         } else {
           setExtractedTrades(validTrades);
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
    <div 
      className={`shadow-[0_20px_60px_rgba(0,0,0,0.8)] rounded-2xl w-[95vw] max-w-[850px] max-h-[90vh] flex flex-col md:flex-row relative animate-in zoom-in-95 fade-in duration-300 overflow-hidden border ${isDragging ? 'border-[#00FFB2]/50 bg-[#11161D]/90 shadow-[0_0_50px_rgba(0,255,178,0.15)]' : 'bg-[#11161D] border-white/5'}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleMediaInput(file);
      }}
    >
      
      {/* Left side: Upload Zone */}
      <div className="md:w-1/2 flex flex-col relative border-b md:border-b-0 md:border-r border-white/5 bg-[#0B0F14]">
        
        {/* Mock OS Bar */}
        <div className="flex items-center gap-2 px-6 py-4 absolute top-0 w-full z-10 hidden md:flex">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="ml-4 text-[11px] font-mono text-zinc-500 font-medium tracking-wide">JournalBud — Trade Extraction</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 mt-12 md:mt-20">
          
          <input 
            type="file" 
            accept="image/*,application/pdf,.csv,text/csv" 
            ref={fileInputRef} 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                 handleMediaInput(file);
                 e.target.value = ''; // Reset input
              }
            }}
            className="hidden" 
            id="screenshot-upload"
          />

          {/* Icons Row */}
          <div className="flex gap-5 mb-8">
            {[
              { icon: Camera, label: "Screenshot", onClick: () => !isFree && fileInputRef.current?.click() },
              { icon: FileText, label: "PDF", onClick: () => !isFree && fileInputRef.current?.click() },
              { icon: Table2, label: "CSV", onClick: () => !isFree && fileInputRef.current?.click() },
              { icon: Cpu, label: "Paste", onClick: () => !isFree && alert({message: "Just press Ctrl + V anywhere in this window"}) }
            ].map((f, i) => (
              <div key={i} className="flex flex-col items-center gap-2.5">
                <button type="button" onClick={f.onClick} disabled={isFree || scanningTrades} className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center bg-transparent border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all disabled:opacity-50 text-zinc-400">
                   <f.icon size={20} strokeWidth={1.5} />
                </button>
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{f.label}</span>
              </div>
            ))}
          </div>

          {/* Drag & Drop Zone */}
          <button
            type="button"
            onClick={() => !isFree && fileInputRef.current?.click()}
            disabled={scanningTrades || isFree}
            className={`w-[140px] h-[140px] rounded-[2rem] flex flex-col items-center justify-center transition-all ${isFree ? 'border-amber-500/20 bg-zinc-800/20 cursor-not-allowed' : scanningTrades ? 'border-[#00FFB2]/40 bg-[#00FFB2]/5 animate-pulse border-2' : 'border-2 border-dashed border-white/5 hover:border-white/10 bg-transparent'}`}
          >
             {isFree ? <Lock size={32} className="text-amber-500/50" /> : scanningTrades ? <Loader2 size={32} className="text-[#00FFB2] animate-spin" /> : <Upload size={32} className="text-zinc-500" strokeWidth={1.5} />}
          </button>
          
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-400 mt-8">
            {isFree ? "Upgrade to Auto-fill" : scanningTrades ? "Scanning Image..." : "Drop Your Trade History"}
          </h3>
          
          <p className="text-[10px] text-zinc-500/80 text-center mt-3 max-w-[280px]">
            Ensure your file includes: Profit/Loss (PnL), Buy/Sell (Direction), Date, and Trade Details.
          </p>
          
          {isFree && (
            <p className="text-[10px] text-amber-500/80 text-center mt-3 max-w-[220px]">
              Available on Pro plans. Extracts Pair, Lot, PnL & Type instantly.
            </p>
          )}
        </div>
      </div>

      {/* Right side: Form Fields */}
      <div className="md:w-1/2 flex flex-col p-6 md:p-8 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-8 shrink-0">
          <h3 className="font-bold text-lg text-[#00FFB2] flex items-center gap-2">
            <Sparkles size={18} className="text-[#00FFB2]" /> 
            Log New Trade
          </h3>
          {onClose && (
            <button type="button" onClick={onClose} className="p-1 px-1.5 text-zinc-500 hover:text-white transition-colors">
              <X size={16} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1">
          
          {/* Symbol */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] uppercase text-zinc-500/80 font-bold tracking-[0.15em]">Symbol</label>
              <button type="button" onClick={() => setUseCustomSymbol(!useCustomSymbol)} className="text-[9px] text-[#00FFB2] hover:text-[#00FFB2]/80 font-medium">
                {useCustomSymbol ? "USE LIST" : "CUSTOM"}
              </button>
            </div>
            {!useCustomSymbol ? (
              <select name="symbol" value={formData.symbol} onChange={handleChange} required className={`w-full h-11 bg-[#0A0D11] border rounded-xl px-4 text-sm focus:border-[#00FFB2]/30 focus:outline-none appearance-none transition-colors ${formData.symbol === 'XAUUSD' ? 'border-white/5 text-[#00FFB2]' : 'border-white/5 text-zinc-300'}`}>
                <option value="" disabled>Select pair</option>
                {commonSymbols.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input type="text" name="customSymbol" value={formData.customSymbol} onChange={handleChange} required placeholder="e.g. AAPL" className="w-full h-11 bg-[#0A0D11] border border-white/5 rounded-xl px-4 text-sm focus:border-[#00FFB2]/30 focus:outline-none uppercase text-zinc-300 transition-colors" />
            )}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase text-zinc-500/80 font-bold tracking-[0.15em] px-1 block">Type</label>
            <select name="type" value={formData.type} onChange={handleChange} className="w-full h-11 bg-[#0A0D11] border border-white/5 rounded-xl px-4 text-sm focus:border-[#00FFB2]/30 focus:outline-none appearance-none text-zinc-300 uppercase transition-colors">
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>

          {/* Lot Size */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase text-zinc-500/80 font-bold tracking-[0.15em] px-1 block">Lot Size</label>
            <input type="number" step="0.01" name="lot" value={formData.lot} onChange={handleChange} required placeholder="0.1" className="w-full h-11 bg-[#0A0D11] border border-white/5 rounded-xl px-4 text-sm focus:border-[#00FFB2]/30 focus:outline-none text-zinc-300 transition-colors" />
          </div>

          <div className="grid grid-cols-2 gap-4">
             {/* Result */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-zinc-500/80 font-bold tracking-[0.15em] px-1 block">Result</label>
              <select name="result" value={formData.result} onChange={handleChange} className={`w-full h-11 bg-[#0A0D11] border rounded-xl px-4 text-sm focus:border-[#00FFB2]/30 focus:outline-none appearance-none transition-colors ${formData.result === 'Profit' ? 'border-[#00FFB2]/20 text-[#00FFB2]' : 'border-red-500/20 text-red-500'}`}>
                <option value="Profit" className="text-[#00FFB2]">Profit</option>
                <option value="Loss" className="text-red-500">Loss</option>
              </select>
            </div>
             {/* PnL */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-zinc-500/80 font-bold tracking-[0.15em] px-1 block">P&L Amount</label>
              <input type="number" min="0" step="0.01" name="pnl" value={formData.pnl} onChange={handleChange} required placeholder="50.00" className="w-full h-11 bg-[#0A0D11] border border-white/5 rounded-xl px-4 text-sm focus:border-[#00FFB2]/30 focus:outline-none text-zinc-300 transition-colors" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-zinc-500/80 font-bold tracking-[0.15em] px-1 block">Risk Amount</label>
              <input type="number" min="0" step="0.01" name="risk" value={formData.risk} onChange={handleChange} disabled={!formData.stopLossFollowed} placeholder="20.00" className={`w-full h-11 bg-[#0A0D11] border rounded-xl px-4 text-sm focus:border-[#00FFB2]/30 focus:outline-none text-zinc-300 transition-colors ${!formData.stopLossFollowed ? 'border-transparent opacity-40' : riskAutoSynced ? 'border-amber-500/30' : 'border-white/5'}`} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-zinc-500/80 font-bold tracking-[0.15em] px-1 block">SL Followed?</label>
              <div className="flex items-center gap-4 h-11 px-2">
                  <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <input type="radio" name="slGroup" checked={formData.stopLossFollowed === true} onChange={() => setFormData(p => ({...p, stopLossFollowed: true}))} className="accent-[#00FFB2] w-3.5 h-3.5" />
                    <span className="text-zinc-500">Yes</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <input type="radio" name="slGroup" checked={formData.stopLossFollowed === false} onChange={() => setFormData(p => ({...p, stopLossFollowed: false}))} className="accent-red-500 w-3.5 h-3.5" />
                    <span className="text-zinc-500">No</span>
                  </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-zinc-500/80 font-bold tracking-[0.15em] px-1 block">Entry (Opt)</label>
               <input type="number" step="any" name="entryPrice" value={formData.entryPrice} onChange={handleChange} placeholder="Optional" className="w-full h-11 bg-[#0A0D11] border border-white/5 rounded-xl px-4 text-sm focus:border-[#00FFB2]/30 focus:outline-none text-zinc-300 transition-colors" />
             </div>
             <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-zinc-500/80 font-bold tracking-[0.15em] px-1 block">Exit (Opt)</label>
               <input type="number" step="any" name="exitPrice" value={formData.exitPrice} onChange={handleChange} placeholder="Optional" className="w-full h-11 bg-[#0A0D11] border border-white/5 rounded-xl px-4 text-sm focus:border-[#00FFB2]/30 focus:outline-none text-zinc-300 transition-colors" />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-zinc-500/80 font-bold tracking-[0.15em] px-1 block">Currency</label>
               <select name="currency" value={formData.currency} onChange={handleChange} className="w-full h-11 bg-[#0A0D11] border border-white/5 rounded-xl px-4 text-sm focus:border-[#00FFB2]/30 focus:outline-none text-zinc-300 appearance-none uppercase transition-colors">
                 <option value="USD">USD</option>
                 <option value="EUR">EUR</option>
                 <option value="INR">INR</option>
               </select>
             </div>
             <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-zinc-500/80 font-bold tracking-[0.15em] px-1 block">Date</label>
               <input type="date" name="date" value={formData.date} onChange={handleChange} required className="w-full h-11 bg-[#0A0D11] border border-white/5 rounded-xl px-4 text-sm focus:border-[#00FFB2]/30 focus:outline-none text-zinc-300 color-scheme-dark transition-colors" />
             </div>
          </div>
          
          <div className="space-y-1.5 pt-1">
            <label className="text-[10px] uppercase text-zinc-500/80 font-bold tracking-[0.15em] px-1 block">Notes</label>
            <textarea name="note" value={formData.note} onChange={handleChange} placeholder="Why did you take this trade?" rows={2} className="w-full bg-[#0A0D11] border border-white/5 rounded-xl p-4 text-sm focus:border-[#00FFB2]/30 focus:outline-none resize-none text-zinc-300 transition-colors" />
          </div>

          {isFree && (
            <div className={`mt-2 p-3 rounded-xl border flex items-center justify-between transition-colors ${dailyLimitReached ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-zinc-800/10 border-white/5 text-zinc-500"}`}>
              <div className="flex items-center gap-2 text-[11px] font-bold">
                {dailyLimitReached ? <Lock size={14} /> : <BookText size={14} className="text-[#00FFB2]" />}
                <span>{dailyLimitReached ? `Limit reached (${dailyTradeCount}/2)` : `${dailyTradeCount}/2 trades logged`}</span>
              </div>
              {dailyLimitReached && (
                <button type="button" onClick={() => window.dispatchEvent(new Event("openPricingModal"))} className="text-[9px] bg-amber-500 text-black px-2 py-1 flex items-center rounded font-black uppercase tracking-widest hover:bg-amber-400 transition-colors">
                  Upgrade
                </button>
              )}
            </div>
          )}

          <div className="pt-2 mt-auto">
            <button
              type="submit"
              disabled={loading || dailyLimitReached}
              className={`w-full h-12 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                dailyLimitReached 
                  ? 'bg-[#151921] text-zinc-700 cursor-not-allowed' 
                  : loading 
                    ? 'bg-[#151921] text-zinc-500 cursor-not-allowed' 
                    : 'bg-[#191D24] hover:bg-[#20252D] text-zinc-400 shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
              }`}
            >
              {dailyLimitReached ? "Limit Reached" : loading ? "Saving..." : "Save Trade"}
            </button>
          </div>
          
        </form>
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
