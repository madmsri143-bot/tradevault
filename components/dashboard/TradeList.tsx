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
      <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none rounded-xl overflow-hidden mt-6">
        <div className="p-4 border-b border-white/5 bg-zinc-900/50">
          <h2 className="text-xl font-semibold text-emerald-400">Trade History</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-950/50 text-xs text-zinc-500 uppercase border-b border-white/5">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Symbol</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Lot</th>
                <th className="px-4 py-3 font-medium">Entry</th>
                <th className="px-4 py-3 font-medium">Exit</th>
                <th className="px-4 py-3 font-medium">Amount (PnL)</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-zinc-500">
                    No trades found. Start logging!
                  </td>
                </tr>
              ) : (
                trades.map((trade) => {
                  const isProfit = (trade.pnl || 0) >= 0;
                  return (
                    <tr key={trade.id} className="hover:bg-zinc-800/30 transition-colors group">
                      <td className="px-4 py-3 text-zinc-300">
                        {format(new Date(trade.date), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 font-bold text-white">
                        {trade.symbol}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          trade.type === 'buy' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {trade.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{trade.lot}</td>
                      <td className="px-4 py-3 text-zinc-400">{trade.entryPrice || "-"}</td>
                      <td className="px-4 py-3 text-zinc-400">{trade.exitPrice || "-"}</td>
                      <td className={`px-4 py-3 font-medium ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(Math.abs(trade.normalizedPnl || trade.pnl), displayCurrency)}
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-zinc-500">
                        {trade.note || "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingTrade(trade)}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-md transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(trade.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/20 rounded-md transition-colors"
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
