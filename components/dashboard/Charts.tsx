"use client";

import { useMemo, useState } from "react";
import { Trade } from "@/types";
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from "recharts";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { Trophy, TrendingUp, Calendar, Zap, BarChart3, AlignLeft, LineChart as LineChartIcon } from "lucide-react";

type ChartMode = "horizontal" | "vertical" | "line";

const CustomBarTooltip = ({ active, payload, displayCurrency }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#09090b] border border-[#27272a] rounded shadow-sm shadow-black/80 px-2 py-1.5 min-w-[50px] flex flex-col items-center">
        <p className="text-[11px] text-zinc-400 font-medium tracking-tight mb-0.5 leading-none">{payload[0].payload.name}</p>
        <p className="text-[13.5px] font-bold text-white tracking-tight leading-none">
          {formatCurrency(Number(payload[0].value), displayCurrency)}
        </p>
      </div>
    );
  }
  return null;
};

export default function Charts({ trades, displayCurrency = "USD" }: { trades: Trade[], displayCurrency?: string }) {
  const [chartMode, setChartMode] = useState<ChartMode>("horizontal");

  // Pie Chart Data: Win vs Loss
  const winningTradesValue = trades.filter((t) => (t.normalizedPnl ?? t.pnl) > 0).reduce((acc, t) => acc + (t.normalizedPnl ?? t.pnl), 0);
  const losingTradesValue = trades.filter((t) => (t.normalizedPnl ?? t.pnl) < 0).reduce((acc, t) => acc + Math.abs(t.normalizedPnl ?? t.pnl), 0);
  const winLossData = [
    { name: "Wins", value: Number(winningTradesValue.toFixed(2)), color: "#10b981" },
    { name: "Losses", value: Number(losingTradesValue.toFixed(2)), color: "#ef4444" },
  ];

  // Consistency Tracking Logic
  const dailyPnL: Record<string, number> = {};
  trades.forEach(t => {
    const dStr = format(new Date(t.date), "yyyy-MM-dd");
    if (!dailyPnL[dStr]) dailyPnL[dStr] = 0;
    dailyPnL[dStr] += (t.normalizedPnl ?? t.pnl);
  });

  const sortedDays = Object.entries(dailyPnL).sort((a, b) => b[0].localeCompare(a[0]));

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
      if (streakActive) streakActive = false;
    }
  });

  // Performance by Day of Week data
  const weeklyData = useMemo(() => {
    const shortDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const orderedDays = [1, 2, 3, 4, 5, 6, 0]; // Monday to Sunday
    const dayStats: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    
    trades.forEach(t => {
      const dayIndex = new Date(t.date).getDay();
      dayStats[dayIndex] += (t.normalizedPnl ?? t.pnl);
    });

    return orderedDays.map(dayIndex => ({
      name: shortDayNames[dayIndex],
      pnl: Number(dayStats[dayIndex].toFixed(2))
    }));
  }, [trades]);

  const modeLabels: Record<ChartMode, { label: string; Icon: any }> = {
    horizontal: { label: "H-Bar", Icon: AlignLeft },
    vertical: { label: "V-Bar", Icon: BarChart3 },
    line: { label: "Line", Icon: LineChartIcon },
  };

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
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-2.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"/>Green Days</span>
                <span className="text-sm font-bold text-emerald-400">{greenDays}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-2.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"/>Red Days</span>
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

      {/* Bottom Row: Performance by Day of Week (SWAPPED FROM ANALYTICS) */}
      <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_4px_20px_rgba(0,0,0,0.2)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] p-6 md:p-8 rounded-2xl flex flex-col w-full relative z-10 transition-colors hover:border-white/10">
        
        {/* Header with view toggle */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <Calendar size={16} className="text-blue-500" /> Performance by Day of the Week
          </h3>
          
          {/* View Toggle */}
          <div className="flex items-center bg-zinc-950/50 p-1 rounded-lg border border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none">
            {(Object.keys(modeLabels) as ChartMode[]).map(mode => {
              const { label, Icon } = modeLabels[mode];
              return (
                <button
                  key={mode}
                  onClick={() => setChartMode(mode)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                    chartMode === mode 
                      ? "bg-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]" 
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        
        {trades.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm h-[250px] italic bg-zinc-950/50 rounded-lg border border-black/10 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none">
            No data available yet. Start trading to see weekly performance.
          </div>
        ) : (
          <div className="w-full h-[300px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === "horizontal" ? (
                <BarChart layout="vertical" data={weeklyData} margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value, displayCurrency)} />
                  <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={12} fontFamily="monospace" tickLine={false} axisLine={false} width={40} />
                  <RechartsTooltip content={<CustomBarTooltip displayCurrency={displayCurrency} />} cursor={{fill: '#27272a', opacity: 0.15}} />
                  <Bar dataKey="pnl" minPointSize={2}>
                    {weeklyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? "#10b981" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              ) : chartMode === "vertical" ? (
                <BarChart data={weeklyData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} fontFamily="monospace" tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value, displayCurrency)} width={60} />
                  <RechartsTooltip content={<CustomBarTooltip displayCurrency={displayCurrency} />} cursor={{fill: '#27272a', opacity: 0.15}} />
                  <Bar dataKey="pnl" minPointSize={2} radius={[4, 4, 0, 0]}>
                    {weeklyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? "#10b981" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <LineChart data={weeklyData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} fontFamily="monospace" tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value, displayCurrency)} width={60} />
                  <RechartsTooltip content={<CustomBarTooltip displayCurrency={displayCurrency} />} cursor={{ stroke: '#ffffff20', strokeWidth: 1, strokeDasharray: '3 3' }} />
                  <Line 
                    type="monotone" 
                    dataKey="pnl" 
                    stroke="#10b981" 
                    strokeWidth={2.5}
                    dot={{ r: 5, fill: "#10b981", stroke: "#09090b", strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: "#10b981", stroke: "#09090b", strokeWidth: 2, style: { filter: "drop-shadow(0 0 8px rgba(16,185,129,0.8))" } }}
                    style={{ filter: "drop-shadow(0 4px 12px rgba(16,185,129,0.2))" }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>
      
    </div>
  );
}
