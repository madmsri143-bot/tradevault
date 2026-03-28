"use client";

import { useState } from "react";
import { X, Check, Trash2, Loader2, AlertCircle } from "lucide-react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

interface ExtractedTrade {
  symbol: string;
  type: string;
  lot: number | string;
  entry: number | string;
  exit: number | string;
  pnl: number | string;
  commission: number | string;
  date: string;
}

interface BulkPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  extractedTrades: ExtractedTrade[];
}

export default function BulkPreviewModal({ isOpen, onClose, onSuccess, extractedTrades }: BulkPreviewModalProps) {
  const { user } = useAuth();
  const [trades, setTrades] = useState<ExtractedTrade[]>(extractedTrades);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleUpdateTrade = (index: number, field: keyof ExtractedTrade, value: string) => {
    const updated = [...trades];
    updated[index] = { ...updated[index], [field]: value };
    setTrades(updated);
  };

  const handleRemoveTrade = (index: number) => {
    setTrades(trades.filter((_, i) => i !== index));
    if (trades.length - 1 === 0) onClose();
  };

  const validateTrades = () => {
    for (const t of trades) {
      if (!t.symbol || !t.type) return false;
      const ttype = t.type.toUpperCase();
      if (ttype !== "BUY" && ttype !== "SELL") return false;
      if (isNaN(parseFloat(t.entry as string)) || isNaN(parseFloat(t.exit as string)) || isNaN(parseFloat(t.pnl as string))) return false;
    }
    return true;
  };

  const handleSaveAll = async () => {
    if (!user) return;
    if (!validateTrades()) {
      alert("Please fix invalid fields (highlighted red) before saving.");
      return;
    }

    setSaving(true);
    try {
      const dbCollection = collection(db, "users", user.uid, "trades");
      
      const promises = trades.map(t => {
        const rawPnl = parseFloat(t.pnl as string) || 0;
        const mappedType = t.type.toUpperCase() === "BUY" ? "buy" : "sell";
        const isProfit = rawPnl >= 0;
        
        return addDoc(dbCollection, {
          symbol: t.symbol.toUpperCase() || "UNKNOWN",
          type: mappedType,
          result: isProfit ? "Profit" : "Loss",
          pnl: isProfit ? Math.abs(rawPnl) : -Math.abs(rawPnl),
          lot: parseFloat(t.lot as string) || 0,
          stopLossFollowed: !isProfit, // true if loss (safe default)
          currency: "USD",
          note: "Auto-Filled from MT5 Extraction",
          date: new Date(t.date || new Date().toISOString()).getTime(),
          entryPrice: parseFloat(t.entry as string) || 0,
          exitPrice: parseFloat(t.exit as string) || 0,
        });
      });

      await Promise.all(promises);
      if (onSuccess) onSuccess();
      else onClose();
    } catch (err) {
      console.error("Bulk save failed", err);
      alert("Failed to save trades.");
    } finally {
      setSaving(false);
    }
  };

  const isValidValue = (field: string, val: any) => {
    if (field === "type") return val.toUpperCase() === "BUY" || val.toUpperCase() === "SELL";
    if (["entry", "exit", "pnl", "lot"].includes(field)) return !isNaN(parseFloat(val));
    return val?.toString().trim() !== "";
  };

  return (
    <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-5xl bg-[#0B0F14] rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-zinc-900/50 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Check className="text-emerald-500" /> Detected {trades.length} Trades
            </h2>
            <p className="text-sm text-zinc-400 mt-1">Review the AI-mapped trades below. Correct any false readings before saving.</p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content (Table Grid) */}
        <div className="flex-1 overflow-auto p-6 custom-scrollbar bg-black/20">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-8 gap-2 mb-3 px-2 text-xs font-bold text-zinc-500 uppercase tracking-widest pb-2 border-b border-white/5">
              <div className="col-span-1">Symbol</div>
              <div className="col-span-1">Type</div>
              <div className="col-span-1">Lot</div>
              <div className="col-span-1">Entry Price</div>
              <div className="col-span-1">Exit Price</div>
              <div className="col-span-1">PnL (USD)</div>
              <div className="col-span-1">Date</div>
              <div className="col-span-1 text-right">Action</div>
            </div>

            <div className="space-y-3">
              {trades.map((trade, idx) => (
                <div key={idx} className="grid grid-cols-8 gap-2 items-center bg-zinc-900/50 border border-white/5 p-2 rounded-xl group hover:border-emerald-500/30 transition-colors">
                  
                  <div className="col-span-1">
                    <input 
                      type="text" 
                      value={trade.symbol} 
                      onChange={(e) => handleUpdateTrade(idx, "symbol", e.target.value)}
                      className={`w-full bg-black/40 border rounded px-3 py-2 text-sm font-bold focus:outline-none focus:border-emerald-500 transition-colors ${isValidValue("symbol", trade.symbol) ? "border-transparent text-white" : "border-red-500/50 text-red-400 focus:border-red-500"}`}
                    />
                  </div>

                  <div className="col-span-1">
                    <input 
                      type="text" 
                      value={trade.type} 
                      onChange={(e) => handleUpdateTrade(idx, "type", e.target.value)}
                      className={`w-full bg-black/40 border rounded px-3 py-2 text-sm font-bold uppercase focus:outline-none focus:border-emerald-500 transition-colors ${isValidValue("type", trade.type) ? trade.type.toUpperCase() === "BUY" ? "border-transparent text-emerald-400" : "border-transparent text-red-400" : "border-red-500/50 text-red-400"}`}
                    />
                  </div>

                  <div className="col-span-1">
                    <input 
                      type="number" 
                      step="any"
                      value={trade.lot} 
                      onChange={(e) => handleUpdateTrade(idx, "lot", e.target.value)}
                      className="w-full bg-black/40 border border-transparent rounded px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div className="col-span-1">
                    <input 
                      type="number" 
                      step="any"
                      value={trade.entry} 
                      onChange={(e) => handleUpdateTrade(idx, "entry", e.target.value)}
                      className={`w-full bg-black/40 border rounded px-3 py-2 text-sm text-zinc-300 focus:outline-none transition-colors ${isValidValue("entry", trade.entry) ? "border-transparent focus:border-emerald-500" : "border-red-500/50 text-red-400 focus:border-red-500"}`}
                    />
                  </div>

                  <div className="col-span-1">
                    <input 
                      type="number" 
                      step="any"
                      value={trade.exit} 
                      onChange={(e) => handleUpdateTrade(idx, "exit", e.target.value)}
                      className={`w-full bg-black/40 border rounded px-3 py-2 text-sm text-zinc-300 focus:outline-none transition-colors ${isValidValue("exit", trade.exit) ? "border-transparent focus:border-emerald-500" : "border-red-500/50 text-red-400 focus:border-red-500"}`}
                    />
                  </div>

                  <div className="col-span-1 relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</div>
                    <input 
                      type="number" 
                      step="any"
                      value={trade.pnl} 
                      onChange={(e) => handleUpdateTrade(idx, "pnl", e.target.value)}
                      className={`w-full bg-black/40 border rounded pl-7 pr-3 py-2 text-sm focus:outline-none font-bold transition-colors ${isValidValue("pnl", trade.pnl) ? parseFloat(trade.pnl as string) >= 0 ? "border-transparent text-emerald-400 focus:border-emerald-500" : "border-transparent text-red-400 focus:border-red-500" : "border-red-500/50 text-red-400 focus:border-red-500"}`}
                    />
                  </div>

                  <div className="col-span-1">
                    <input 
                      type="date" 
                      value={trade.date} 
                      onChange={(e) => handleUpdateTrade(idx, "date", e.target.value)}
                      className="w-full bg-black/40 border border-transparent rounded px-2 py-2 text-xs text-zinc-400 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <button 
                      onClick={() => handleRemoveTrade(idx)}
                      className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors border border-red-500/20"
                      title="Discard Row"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                </div>
              ))}
            </div>
            
            {!validateTrades() && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle size={16} /> 
                <span className="font-semibold">Validation Error:</span> Please correct the fields highlighted in red (Must be numeric, or BUY/SELL type) before saving.
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-zinc-900/50 shrink-0 flex items-center justify-between">
          <p className="text-xs text-zinc-500 font-medium">* Commission variables are tracked but ignored for net PnL inputs by default.</p>
          <div className="flex gap-3">
            <button 
              onClick={onClose} 
              disabled={saving}
              className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors border border-white/5 disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveAll}
              disabled={saving || !validateTrades()}
              className="px-6 py-2.5 bg-[#00FFB2] hover:bg-[#00e09d] text-zinc-950 font-bold rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Confirm & Save {trades.length} Trades
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
