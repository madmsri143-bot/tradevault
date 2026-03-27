"use client";

import { useState, useEffect, useRef } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trade, Currency } from "@/types";
import { useAuth } from "@/lib/AuthContext";
import { useModal } from "@/lib/ModalContext";
import { Flame, Camera, Loader2 } from "lucide-react";
import BulkPreviewModal from "./BulkPreviewModal";

const getLocalDateString = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

export default function TradeForm() {
  const { user } = useAuth();
  const { alert } = useModal();
  const [loading, setLoading] = useState(false);
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

      // Fire and forget Firebase write (onSnapshot handles latency compensation)
      if (user) {
        addDoc(collection(db, "users", user.uid, "trades"), trade).catch(async (error) => {
          console.error("Error adding trade:", error);
          await alert({ message: "Failed to sync trade to server, but it was added locally." });
        });
      }
      
    } catch (error) {
      console.error("Error processing trade:", error);
      console.error("Error processing trade:", error);
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      await alert({ message: "Please upload a valid image file." });
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
      
      if (data.trades && Array.isArray(data.trades)) {
         setExtractedTrades(data.trades);
         setShowBulkModal(true);
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

  return (
    <>
    <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-emerald-400">Log New Trade</h2>
        
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={scanningTrades}
          className="text-xs font-bold text-zinc-950 bg-[#00FFB2] hover:bg-[#00e09d] px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {scanningTrades ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          {scanningTrades ? "Scanning trades..." : "Upload Screenshot (Auto Fill)"}
        </button>
      </div>

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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded transition-colors disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Trade"}
        </button>
      </form>
    </div>

    {showBulkModal && (
      <BulkPreviewModal 
        isOpen={showBulkModal} 
        onClose={() => setShowBulkModal(false)} 
        extractedTrades={extractedTrades} 
      />
    )}
    </>
  );
}
