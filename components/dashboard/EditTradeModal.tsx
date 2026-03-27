"use client";

import { useState, useEffect, useRef } from "react";
import { doc, updateDoc, deleteField } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trade, Currency } from "@/types";
import { X, Loader2, Flame } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/lib/AuthContext";
import { useModal } from "@/lib/ModalContext";

export default function EditTradeModal({ trade, onClose }: { trade: Trade; onClose: () => void }) {
  const { user } = useAuth();
  const { alert } = useModal();
  const [loading, setLoading] = useState(false);
  const [riskAutoSynced, setRiskAutoSynced] = useState(false);
  const [riskManuallyOverridden, setRiskManuallyOverridden] = useState(true); // Start as overridden since user already set values
  const [formData, setFormData] = useState({
    symbol: trade.symbol,
    type: trade.type,
    result: trade.pnl >= 0 ? "Profit" : "Loss",
    pnl: Math.abs(trade.pnl).toString(),
    lot: trade.lot.toString(),
    risk: trade.risk?.toString() || "",
    stopLossFollowed: trade.stopLossFollowed !== false,
    entryPrice: trade.entryPrice?.toString() || "",
    exitPrice: trade.exitPrice?.toString() || "",
    currency: trade.currency,
    note: trade.note || "",
    date: format(new Date(trade.date), "yyyy-MM-dd"),
  });

  const prevResult = useRef(formData.result);

  // Smart Defaults: When result changes during editing
  useEffect(() => {
    const prev = prevResult.current;
    prevResult.current = formData.result;

    // Only react to actual changes, not initial mount
    if (prev === formData.result) return;

    if (formData.result === "Loss") {
      // Smart defaults for Loss
      setFormData(p => ({ ...p, stopLossFollowed: true }));
      setRiskManuallyOverridden(false);

      // Auto-sync risk from amount
      if (formData.pnl) {
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

  // Auto-sync risk when amount changes (only for Loss trades, not manually overridden)
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
    if (!trade.id || !user) return;
    
    setLoading(true);

    try {
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
      
      const updatedTrade: any = {
        symbol: formData.symbol.toUpperCase() || "UNKNOWN",
        type: formData.type as "buy" | "sell",
        result: formData.result as "Profit" | "Loss",
        pnl: parsedPnl,
        lot: parseFloat(formData.lot) || 0,
        stopLossFollowed: formData.stopLossFollowed,
        entryPrice: formData.entryPrice ? parseFloat(formData.entryPrice) : deleteField(),
        exitPrice: formData.exitPrice ? parseFloat(formData.exitPrice) : deleteField(),
        currency: formData.currency as Currency,
        note: formData.note,
        date: new Date(formData.date).getTime(),
      };

      if (formData.stopLossFollowed) {
        updatedTrade.risk = finalRisk;
      } else {
        updatedTrade.risk = deleteField();
      }

      const tradeRef = doc(db, "users", user.uid, "trades", trade.id);
      await updateDoc(tradeRef, updatedTrade);
      setLoading(false);
      onClose(); // Instantly close, Firestore onSnapshot updates the UI
    } catch (error) {
      console.error("Error updating trade:", error);
      await alert({ message: "Failed to update trade." });
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-lg flex flex-col scale-100 animate-in zoom-in-95 duration-200 max-h-[80vh] overflow-hidden relative">
        
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-zinc-900 shrink-0 sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-white">Edit Trade</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            
            {/* SymbolLine */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Symbol</label>
              <input
                type="text"
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                placeholder="e.g. AAPL"
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none uppercase"
                required
              />
            </div>

            {/* Row: Type, Lot */}
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
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Row: Result, Amount */}
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
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
                <p className="text-[10px] text-zinc-500 mt-1 leading-tight">Enter amount (profit or loss will be applied automatically)</p>
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
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          <div className="p-4 border-t border-white/5 bg-zinc-900 flex justify-end gap-3 shrink-0 sticky bottom-0 z-10">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded flex items-center gap-2 font-medium transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
