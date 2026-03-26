"use client";

import { Trade } from "@/types";
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from "recharts";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

export default function Charts({ trades, displayCurrency = "USD" }: { trades: Trade[], displayCurrency?: string }) {
  // Pie Chart Data: Win vs Loss
  const winningTradesValue = trades.filter((t) => (t.normalizedPnl ?? t.pnl) > 0).reduce((acc, t) => acc + (t.normalizedPnl ?? t.pnl), 0);
  const losingTradesValue = trades.filter((t) => (t.normalizedPnl ?? t.pnl) < 0).reduce((acc, t) => acc + Math.abs(t.normalizedPnl ?? t.pnl), 0);
  // Exclude breakeven for simplicity or add it
  const winLossData = [
    { name: "Wins", value: Number(winningTradesValue.toFixed(2)), color: "#10b981" }, // emerald-500
    { name: "Losses", value: Number(losingTradesValue.toFixed(2)), color: "#ef4444" }, // red-500
  ];

  // Consistency Tracking Logic
  const dailyPnL: Record<string, number> = {};
  trades.forEach(t => {
    const dStr = format(new Date(t.date), "yyyy-MM-dd");
    if (!dailyPnL[dStr]) dailyPnL[dStr] = 0;
    dailyPnL[dStr] += (t.normalizedPnl ?? t.pnl);
  });

  const sortedDays = Object.entries(dailyPnL).sort((a, b) => b[0].localeCompare(a[0])); // latest first

  let greenDays = 0;
  let redDays = 0;
  let currentStreak = 0;
  let streakActive = true;

  sortedDays.forEach(([_, pnl]) => {
    if (pnl > 0) {
      greenDays++;
      if (streakActive) currentStreak++;
    } else if (pnl < 0) {
      redDays++;
      if (streakActive) streakActive = false; // streak breaks on first red day
    }
  });

  // Line Chart Data: Cumulative PnL
  // Sort trades by date oldest to newest
  const sortedTrades = [...trades].sort((a, b) => a.date - b.date);
  
  let currentCumulative = 0;
  const cumulativeData = sortedTrades.map((t) => {
    currentCumulative += (t.normalizedPnl ?? t.pnl);
    return {
      dateStr: format(new Date(t.date), "MMM dd"),
      pnl: currentCumulative,
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      
      {/* Win vs Loss Pie Chart */}
      <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-4 rounded-xl flex flex-col items-center">
        <h3 className="text-sm font-semibold text-zinc-300 w-full mb-2">Win vs Loss</h3>
        {trades.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">No data</div>
        ) : (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={winLossData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {winLossData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: any) => formatCurrency(Number(value), displayCurrency)}
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#ffffff', fontWeight: 500 }}
                  labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="flex gap-4 text-xs text-zinc-400 mt-2">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Wins: {formatCurrency(winningTradesValue, displayCurrency)}</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Losses: {formatCurrency(losingTradesValue, displayCurrency)}</div>
        </div>
      </div>

      {/* Consistency Tracking */}
      <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-5 rounded-xl flex flex-col items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-300 w-full mb-4">Consistency Tracking</h3>
        
        {trades.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm italic text-center px-4 leading-relaxed">
            No trading history yet.<br/>Start to build your consistency.
          </div>
        ) : (
          <div className="w-full flex-1 flex flex-col justify-center items-center gap-6">
            <div className="flex flex-col items-center">
              <span className="text-xs text-zinc-400 font-medium mb-1.5 uppercase tracking-widest">Current Streak</span>
              <div className={`text-4xl font-bold flex items-center gap-3 ${currentStreak > 0 ? "text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]" : "text-zinc-500"}`}>
                <span>{currentStreak > 0 ? "🔥" : "❄️"}</span>
                {currentStreak} <span className="text-lg">Day{currentStreak !== 1 ? 's' : ''}</span>
              </div>
            </div>

            <div className="w-full max-w-[240px] bg-zinc-950 p-4 rounded-xl border border-black/10 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none shadow-inner">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-2.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"/> Green Days</span>
                <span className="text-sm font-bold text-emerald-400">{greenDays}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-2.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"/> Red Days</span>
                <span className="text-sm font-bold text-red-400">{redDays}</span>
              </div>
              
              {(greenDays > 0 || redDays > 0) && (
                <div className="w-full h-2 bg-zinc-800 rounded-full mt-4 overflow-hidden flex shadow-inner">
                  <div className="h-full bg-emerald-500" style={{ width: `${(greenDays / (greenDays + redDays)) * 100}%` }} />
                  <div className="h-full bg-red-500" style={{ width: `${(redDays / (greenDays + redDays)) * 100}%` }} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cumulative PnL Line Chart */}
      <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-4 rounded-xl flex flex-col items-center lg:col-span-1 xl:col-span-1">
        <h3 className="text-sm font-semibold text-zinc-300 w-full mb-2">Cumulative PnL</h3>
        {trades.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">No data</div>
        ) : (
          <div className="h-48 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="dateStr" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value, displayCurrency)} width={50} />
                <RechartsTooltip 
                  formatter={(value: any) => formatCurrency(Number(value), displayCurrency)}
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#ffffff', fontWeight: 500 }}
                  labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="pnl" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#10b981", stroke: "#09090b", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      
    </div>
  );
}
