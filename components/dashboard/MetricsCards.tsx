"use client";

import { Trade } from "@/types";
import { DollarSign, Activity, Hash, ArrowUpRight, ArrowDownRight, Layers, Target } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function MetricsCards({ trades, displayCurrency = "USD" }: { trades: Trade[], displayCurrency?: string }) {
  const totalTrades = trades.length;
  const totalLots = trades.reduce((acc, t) => acc + t.lot, 0);
  
  // Count-based win rate: wins / total (excluding break-even)
  const nonBreakevenTrades = trades.filter(t => (t.normalizedPnl || 0) !== 0);
  const winningTrades = trades.filter(t => (t.normalizedPnl || 0) > 0);
  const winRate = nonBreakevenTrades.length > 0 
    ? (winningTrades.length / nonBreakevenTrades.length) * 100 
    : 0;
  
  const totalPnl = trades.reduce((acc, t) => acc + (t.normalizedPnl || 0), 0);
  
  const biggestWin = trades.length > 0 ? Math.max(0, ...trades.map(t => t.normalizedPnl || 0)) : 0;
  const biggestLoss = trades.length > 0 ? Math.min(0, ...trades.map(t => t.normalizedPnl || 0)) : 0;

  const totalGrossProfit = trades.reduce((acc, t) => acc + ((t.normalizedPnl || 0) > 0 ? (t.normalizedPnl || 0) : 0), 0);
  const totalGrossLoss = Math.abs(trades.reduce((acc, t) => acc + ((t.normalizedPnl || 0) < 0 ? (t.normalizedPnl || 0) : 0), 0));
  const profitEfficiency = (totalGrossProfit + totalGrossLoss) > 0 
    ? (totalGrossProfit / (totalGrossProfit + totalGrossLoss)) * 100 
    : 0;

  const cards = [
    {
      title: "Total PnL",
      value: formatCurrency(totalPnl, displayCurrency),
      icon: <DollarSign size={20} className={totalPnl >= 0 ? "text-emerald-500" : "text-red-500"} />,
      colorClass: totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
    },
    {
      title: "Strike Rate",
      value: `${winRate.toFixed(2)}%`,
      icon: <Activity size={20} className="text-blue-500" />,
      colorClass: "text-blue-400"
    },
    {
      title: "Profit Efficiency",
      value: `${profitEfficiency.toFixed(2)}%`,
      icon: <Target size={20} className="text-amber-500" />,
      colorClass: "text-amber-400"
    },
    {
      title: "Total Trades",
      value: totalTrades,
      icon: <Hash size={20} className="text-zinc-400" />,
      colorClass: "text-zinc-100"
    },
    {
      title: "Total Lots",
      value: totalLots.toFixed(2),
      icon: <Layers size={20} className="text-purple-500" />,
      colorClass: "text-purple-400"
    },
    {
      title: "Biggest Win",
      value: formatCurrency(biggestWin, displayCurrency),
      icon: <ArrowUpRight size={20} className="text-emerald-500" />,
      colorClass: "text-emerald-400"
    },
    {
      title: "Biggest Loss",
      value: formatCurrency(biggestLoss, displayCurrency),
      icon: <ArrowDownRight size={20} className="text-red-500" />,
      colorClass: "text-red-400"
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {cards.map((card, i) => (
        <div key={i} className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 mb-1">{card.title}</p>
            <p className={cn("text-xl font-bold tracking-tight", card.colorClass)}>
              {card.value}
            </p>
          </div>
          <div className="h-10 w-10 bg-zinc-950 flex items-center justify-center rounded-lg border border-black/10 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none shrink-0">
            {card.icon}
          </div>
        </div>
      ))}
    </div>
  );
}
