"use client";

import { useState, useEffect } from "react";
import { Trade, Currency } from "@/types";
import { format } from "date-fns";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Pencil, Trash2 } from "lucide-react";
import EditTradeModal from "./EditTradeModal";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { useModal } from "@/lib/ModalContext";

export default function TradeList({ trades, displayCurrency = "USD" }: { trades: Trade[], displayCurrency?: string }) {
  const { user } = useAuth();
  const { confirm, alert } = useModal();
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedTradeIds(trades.map(t => t.id || ""));
    else setSelectedTradeIds([]);
  };

  const handleSelect = (id: string) => {
    setSelectedTradeIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleDeleteSelected = async () => {
    const isConfirmed = await confirm({
      title: "Delete Selected Trades",
      message: "Are you sure you want to delete selected trades?",
      confirmLabel: "Delete",
      variant: "danger"
    });
    if (isConfirmed && user) {
      try {
        await Promise.all(selectedTradeIds.map(id => deleteDoc(doc(db, "users", user.uid, "trades", id))));
        setSelectedTradeIds([]);
      } catch (error) {
        await alert({ message: "Failed to delete selected trades." });
      }
    }
  };

  const handleDelete = async (id: string | undefined) => {
    if (!id || !user) return;
    const isConfirmed = await confirm({
      title: "Delete Trade",
      message: "Are you sure you want to delete this trade?",
      confirmLabel: "Delete",
      variant: "danger"
    });
    
    if (isConfirmed) {
      try {
        await deleteDoc(doc(db, "users", user.uid, "trades", id));
      } catch (error) {
        console.error("Error deleting trade:", error);
        await alert({ message: "Failed to delete trade." });
      }
    }
  };

  return (
    <>
      <div className="bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border border-[rgba(212,175,55,0.15)] fade-slide-up shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)] rounded-2xl overflow-hidden mt-6">
        <div className="p-4 border-b border-[#111827] bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md/50 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-emerald-400">Trade History</h2>
          {selectedTradeIds.length > 0 && (
             <button onClick={handleDeleteSelected} className="px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5">
               <Trash2 size={14} /> Delete Selected ({selectedTradeIds.length})
             </button>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#A0A0A0]">
            <thead className="bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md/50 text-xs text-[#A0A0A0] uppercase border-b border-[#111827]">
              <tr>
                <th className="px-4 py-3 font-medium w-10">
                  <input type="checkbox" checked={trades.length > 0 && selectedTradeIds.length === trades.length} onChange={handleSelectAll} className="accent-[#D4AF37] w-3.5 h-3.5 cursor-pointer" />
                </th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Asset</th>
                <th className="px-4 py-3 font-medium">Direction</th>
                <th className="px-4 py-3 font-medium">Entry</th>
                <th className="px-4 py-3 font-medium">Exit</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">PnL</th>
                <th className="px-4 py-3 font-medium">Lot</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-[#A0A0A0]">
                    No trades found. Start logging!
                  </td>
                </tr>
              ) : (
                trades.map((trade) => {
                  const isProfit = (trade.pnl || 0) >= 0;
                  return (
                    <tr key={trade.id} className="hover:bg-zinc-800/30 transition-colors group">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedTradeIds.includes(trade.id || "")} onChange={() => handleSelect(trade.id || "")} className="accent-[#D4AF37] w-3.5 h-3.5 cursor-pointer" />
                      </td>
                      <td className="px-4 py-3 text-[#EAEAEA]">
                        {format(new Date(trade.date), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 font-bold text-[#EAEAEA]">
                        {trade.symbol || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          trade.type === 'buy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                          {trade.type ? trade.type.toUpperCase() : "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#A0A0A0] font-mono">{trade.entryPrice || "-"}</td>
                      <td className="px-4 py-3 text-[#A0A0A0] font-mono">{trade.exitPrice || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isProfit ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                          {trade.result ? trade.result.toUpperCase() : (isProfit ? "PROFIT" : "LOSS")}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-black tabular-nums ${isProfit ? 'text-[#D4AF37]' : 'text-red-500'}`}>
                        {isProfit ? "+" : "-"}{formatCurrency(Math.abs(trade.normalizedPnl || trade.pnl || 0), displayCurrency)}
                      </td>
                      <td className="px-4 py-3 text-[#EAEAEA] font-medium">{trade.lot || "-"}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-[#A0A0A0]">
                        {trade.note || "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingTrade(trade)}
                            className="p-1.5 text-[#A0A0A0] hover:text-[#EAEAEA] hover:bg-zinc-700 rounded-md transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(trade.id)}
                            className="p-1.5 text-[#A0A0A0] hover:text-red-400 hover:bg-red-500/20 rounded-md transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingTrade && (
        <EditTradeModal
          trade={editingTrade}
          onClose={() => setEditingTrade(null)}
        />
      )}
    </>
  );
}
