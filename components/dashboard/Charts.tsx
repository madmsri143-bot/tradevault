"use client";

import { useMemo, useState } from "react";
import { Trade } from "@/types";
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine
} from "recharts";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { Trophy, TrendingUp, Calendar, Zap } from "lucide-react";

const CustomTooltip = ({ active, payload, label, displayCurrency }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (data.dateStr === "Start") return null;

    const isPositiveChange = data.percentChange >= 0;
    const changeColor = isPositiveChange ? "text-emerald-400" : "text-red-400";
    
    return (
      <div className="bg-[#09090b]/95 backdrop-blur-md border border-[#27272a] rounded-xl shadow-2xl p-4 min-w-[200px] flex flex-col gap-3">
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
           <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">{label}</span>
           <span className="bg-zinc-800 text-zinc-300 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-widest">
             {data.tradesCount} Trade{data.tradesCount !== 1 ? 's' : ''}
           </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-zinc-500 text-[11px] font-medium uppercase tracking-widest">Cumulative PnL</span>
          <span className={`text-xl font-black tracking-tight ${data.pnlCumulative >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatCurrency(data.pnlCumulative, displayCurrency)}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-xs font-medium pt-1">
          <span className="text-zinc-500">Period PnL:</span>
          <span className={`font-bold ${data.periodPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>{data.periodPnl > 0 ? '+' : ''}{formatCurrency(data.periodPnl, displayCurrency)}</span>
        </div>
        {data.percentChange !== 0 && (
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-zinc-500">vs Prev:</span>
            <span className={`font-bold ${changeColor}`}>{isPositiveChange ? '+' : ''}{data.percentChange.toFixed(1)}%</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function Charts({ trades, displayCurrency = "USD" }: { trades: Trade[], displayCurrency?: string }) {
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly">("daily");

  // Pie Chart Data: Win vs Loss
  const winningTradesValue = trades.filter((t) => (t.normalizedPnl ?? t.pnl) > 0).reduce((acc, t) => acc + (t.normalizedPnl ?? t.pnl), 0);
  const losingTradesValue = trades.filter((t) => (t.normalizedPnl ?? t.pnl) < 0).reduce((acc, t) => acc + Math.abs(t.normalizedPnl ?? t.pnl), 0);
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

  // Cumulative PnL Graph logic
  const { chartData, headerMetrics } = useMemo(() => {
    const sortedTrades = [...trades].sort((a, b) => a.date - b.date);
    
    // Group trades by timeframe
    const groups: Record<string, { pnl: number, tradesCount: number, dateKey: string }> = {};
    
    sortedTrades.forEach(t => {
      const d = new Date(t.date);
      let key = "";
      let dateKey = "";
      
      if (timeframe === "daily") {
        key = format(d, "yyyy-MM-dd");
        dateKey = format(d, "MMM dd");
      } else if (timeframe === "weekly") {
        const start = startOfWeek(d, { weekStartsOn: 1 });
        const end = endOfWeek(d, { weekStartsOn: 1 });
        key = format(start, "yyyy-MM-dd");
        dateKey = `${format(start, "MMM dd")} - ${format(end, "MMM dd")}`;
      } else {
        key = format(d, "yyyy-MM");
        dateKey = format(d, "MMM yyyy");
      }
      
      if (!groups[key]) {
        groups[key] = { pnl: 0, tradesCount: 0, dateKey };
      }
      groups[key].pnl += (t.normalizedPnl ?? t.pnl);
      groups[key].tradesCount += 1;
    });

    const orderedKeys = Object.keys(groups).sort();
    
    let cumPnl = 0;
    const data = [];
    
    // Low data scenario padding
    if (orderedKeys.length === 1) {
       data.push({
         dateStr: "Start",
         pnlCumulative: 0,
         periodPnl: 0,
         tradesCount: 0,
         percentChange: 0,
       });
    }

    let prevCumulative = 0;

    orderedKeys.forEach(k => {
      const g = groups[k];
      cumPnl += g.pnl;
      
      let percentChange = 0;
      if (prevCumulative !== 0) {
        percentChange = ((cumPnl - prevCumulative) / Math.abs(prevCumulative)) * 100;
      } else if (cumPnl > 0) {
        percentChange = 100;
      } else if (cumPnl < 0) {
        percentChange = -100;
      }

      data.push({
        dateStr: g.dateKey,
        pnlCumulative: Number(cumPnl.toFixed(2)),
        periodPnl: Number(g.pnl.toFixed(2)),
        tradesCount: g.tradesCount,
        percentChange,
      });
      
      prevCumulative = cumPnl;
    });

    // Calculate header metrics globally for the panel
    const totalPnl = sortedTrades.reduce((sum, t) => sum + (t.normalizedPnl ?? t.pnl), 0);
    const nonBreakeven = sortedTrades.filter(t => (t.normalizedPnl ?? t.pnl) !== 0);
    const wins = sortedTrades.filter(t => (t.normalizedPnl ?? t.pnl) > 0);
    const winRate = nonBreakeven.length > 0 ? (wins.length / nonBreakeven.length) * 100 : 0;
    
    const dHash: Record<string, number> = {};
    sortedTrades.forEach(t => {
       const dStr = format(new Date(t.date), "yyyy-MM-dd");
       dHash[dStr] = (dHash[dStr] || 0) + (t.normalizedPnl ?? t.pnl);
    });
    const bestDay = Object.values(dHash).length > 0 ? Math.max(...Object.values(dHash), 0) : 0;

    return {
      chartData: data,
      headerMetrics: {
        totalPnl,
        winRate,
        bestDay
      }
    };
  }, [trades, timeframe]);

  return (
    <div className="flex flex-col gap-8 mb-4">
      
      {/* Top Row: Two Equal Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Win vs Loss Pie Chart */}
        <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_4px_20px_rgba(0,0,0,0.2)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] p-6 md:p-8 rounded-2xl flex flex-col items-center min-h-[360px] cursor-default hover:border-white/10 transition-colors">
          <h3 className="text-[13px] font-bold tracking-wide uppercase text-zinc-400 w-full mb-4">Win vs Loss</h3>
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
      <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_4px_20px_rgba(0,0,0,0.2)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] p-6 md:p-8 rounded-2xl flex flex-col items-center justify-between min-h-[360px] cursor-default hover:border-white/10 transition-colors">
        <h3 className="text-[13px] font-bold tracking-wide uppercase text-zinc-400 w-full mb-6">Consistency Tracking</h3>
        
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

      </div> {/* End Top Row */}

      {/* Bottom Row: Premium Cumulative PnL Performance Graph */}
      <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_4px_20px_rgba(0,0,0,0.2)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] p-6 md:p-8 rounded-2xl flex flex-col w-full relative z-10 transition-colors hover:border-white/10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
             <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
               <TrendingUp className="text-emerald-500" size={20} /> Cumulative Performance
             </h3>
             <p className="text-xs text-zinc-400 mt-1 font-medium">Tracking your equity curve over time.</p>
          </div>
          
          <div className="flex items-center bg-zinc-950/50 p-1 rounded-lg border border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none">
             {(["daily", "weekly", "monthly"] as const).map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-4 py-1.5 text-xs font-bold capitalize rounded-md transition-all ${timeframe === tf ? "bg-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  {tf}
                </button>
             ))}
          </div>
        </div>

        {/* Dynamic Summary Stats Panel */}
        {trades.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-zinc-950/50 p-4 rounded-xl border border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none flex flex-col gap-1 hover:bg-zinc-900 transition-colors">
               <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5"><TrendingUp size={12}/> Net PnL</span>
               <span className={`text-xl font-bold ${headerMetrics.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatCurrency(headerMetrics.totalPnl, displayCurrency)}</span>
            </div>
            <div className="bg-zinc-950/50 p-4 rounded-xl border border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none flex flex-col gap-1 cursor-help hover:bg-zinc-900 transition-colors" title="Win Rate (Winning trades / Total trades)">
               <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5"><Trophy size={12}/> Win Rate</span>
               <span className="text-xl font-bold text-white">{headerMetrics.winRate.toFixed(1)}%</span>
            </div>
            <div className="bg-zinc-950/50 p-4 rounded-xl border border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none flex flex-col gap-1 hover:bg-zinc-900 transition-colors">
               <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5"><Zap size={12}/> Best Day</span>
               <span className="text-xl font-bold text-emerald-400">{formatCurrency(headerMetrics.bestDay, displayCurrency)}</span>
            </div>
            <div className="bg-zinc-950/50 p-4 rounded-xl border border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none flex flex-col gap-1 hover:bg-zinc-900 transition-colors">
               <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5"><Calendar size={12}/> Current Streak</span>
               <span className={`text-xl font-bold ${currentStreak > 0 ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]" : "text-zinc-500"}`}>{currentStreak} <span className="text-sm font-medium">Day{currentStreak !== 1 ? 's': ''}</span></span>
            </div>
          </div>
        )}

        {/* Chart Area */}
        {trades.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm min-h-[300px]">No data available to chart.</div>
        ) : (
          <div className="h-[340px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 15, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <ReferenceLine y={0} stroke="#52525b" strokeDasharray="4 4" strokeWidth={1} />
                <XAxis 
                  dataKey="dateStr" 
                  stroke="#71717a" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={12}
                />
                <YAxis 
                  stroke="#71717a" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => formatCurrency(value, displayCurrency).replace('.00', '')} 
                  width={60} 
                  tickMargin={12}
                />
                <RechartsTooltip 
                  content={<CustomTooltip displayCurrency={displayCurrency} />}
                  cursor={{ stroke: '#ffffff20', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="pnlCumulative" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorPnL)" 
                  activeDot={{ r: 6, fill: "#10b981", stroke: "#09090b", strokeWidth: 2, style: { filter: "drop-shadow(0 0 8px rgba(16,185,129,0.8))" } }}
                  style={{ filter: "drop-shadow(0 4px 12px rgba(16,185,129,0.2))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      
    </div>
  );
}
