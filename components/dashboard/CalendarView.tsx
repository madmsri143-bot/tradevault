"use client";

import { useState, useMemo } from "react";
import { Trade } from "@/types";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
  isSameYear,
  addYears,
  subYears,
  startOfYear,
  endOfYear
} from "date-fns";
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, LayoutGrid } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatCurrency } from "@/lib/utils";
import { TrialGuard } from "@/components/TrialGuard";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ----------------------------------------------------
// TYPES & HELPERS
// ----------------------------------------------------
type ViewMode = "monthly" | "yearly";

interface PeriodStats {
  label: string;
  count: number;
  winRate: number;
  avgGain: number;
  avgLoss: number;
  maxGain: number;
  maxLoss: number;
  pnl: number;
}

function calcStats(label: string, tradeList: any[]): PeriodStats {
  const count = tradeList.length;
  const wins = tradeList.filter(t => t.pnl > 0);
  const losses = tradeList.filter(t => t.pnl < 0);
  
  const winRate = count > 0 ? (wins.length / count) * 100 : 0;
  const avgGain = wins.length > 0 ? wins.reduce((acc, t) => acc + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((acc, t) => acc + t.pnl, 0)) / losses.length : 0;

  const maxGain = wins.length > 0 ? Math.max(...wins.map(t => t.pnl)) : 0;
  const maxLoss = losses.length > 0 ? Math.max(...losses.map(t => Math.abs(t.pnl))) : 0;

  const pnl = tradeList.reduce((acc, t) => acc + t.pnl, 0);

  return { label, count, winRate, avgGain, avgLoss, maxGain, maxLoss, pnl };
}

// ----------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------
export default function CalendarView({ trades, displayCurrency = "USD" }: { trades: Trade[], displayCurrency?: string }) {
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Parse mapped dates 
  const normalizedTrades = useMemo(() => {
    return trades.map(t => ({ ...t, pnl: t.normalizedPnl ?? t.pnl, dateObj: new Date(t.date) }));
  }, [trades]);

  // View Navigation
  const handlePrev = () => setCurrentDate(viewMode === "monthly" ? subMonths(currentDate, 1) : subYears(currentDate, 1));
  const handleNext = () => setCurrentDate(viewMode === "monthly" ? addMonths(currentDate, 1) : addYears(currentDate, 1));

  // ----------------------------------------------------
  // MONTHLY GRID LOGIC
  // ----------------------------------------------------
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startOffset = monthStart.getDay();
  const paddingDays = Array.from({ length: startOffset }, (_, i) => i);

  const getTradesForDay = (date: Date) => normalizedTrades.filter((t) => isSameDay(t.dateObj, date));
  const getDayPnL = (dayTrades: any[]) => dayTrades.reduce((acc, t) => acc + t.pnl, 0);
  const selectedTrades = selectedDate ? getTradesForDay(selectedDate) : [];

  // Weekly Stats Calculation for Monthly View
  const weeklyStats: PeriodStats[] = useMemo(() => {
    if (viewMode !== "monthly") return [];
    
    // 5-6 possible weeks in a month
    const weeks: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    
    normalizedTrades.forEach(t => {
      if (isSameMonth(t.dateObj, currentDate)) {
        // formula to assign week index inside the month
        const weekIndex = Math.ceil((t.dateObj.getDate() + startOffset) / 7);
        if (weeks[weekIndex]) weeks[weekIndex].push(t);
      }
    });

    const labels = ["First Week", "Second Week", "Third Week", "Fourth Week", "Fifth Week", "Sixth Week"];
    const stats: PeriodStats[] = [];
    
    Object.keys(weeks).forEach((key) => {
      const wIdx = parseInt(key);
      const wTrades = weeks[wIdx];
      // Only show up to week 4, 5, or 6 if they are within month days theoretically
      // Let's dynamically include a week if it actually has days in this month
      // Max possible weeks is 6
      const weekStartD = ((wIdx - 1) * 7) - startOffset + 1;
      if (weekStartD <= monthEnd.getDate()) {
         stats.push(calcStats(labels[wIdx - 1], wTrades));
      }
    });

    return stats;
  }, [normalizedTrades, currentDate, viewMode, startOffset, monthEnd]);

  // ----------------------------------------------------
  // YEARLY GRID LOGIC
  // ----------------------------------------------------
  const monthlyStatsInYear: PeriodStats[] = useMemo(() => {
    if (viewMode !== "yearly") return [];

    const months: Record<number, any[]> = {};
    for (let i = 0; i < 12; i++) months[i] = [];

    normalizedTrades.forEach(t => {
      if (isSameYear(t.dateObj, currentDate)) {
        months[t.dateObj.getMonth()].push(t);
      }
    });

    const mLabels = [
      "January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"
    ];

    return Object.keys(months).map(mIdx => {
      return calcStats(mLabels[parseInt(mIdx)], months[parseInt(mIdx)]);
    });
  }, [normalizedTrades, currentDate, viewMode]);

  // ----------------------------------------------------
  // TABLE RENDERER
  // ----------------------------------------------------
  const renderTable = (data: PeriodStats[], primaryLabel: string) => {
    // Averages Row calculations
    const activePeriods = data.filter(d => d.count > 0);
    const activeCount = activePeriods.length || 1; // avoid /0
    
    const avgWinRate = data.reduce((acc, d) => acc + d.winRate, 0) / data.length;
    const avgAvgGain = data.reduce((acc, d) => acc + d.avgGain, 0) / data.length;
    const avgAvgLoss = data.reduce((acc, d) => acc + d.avgLoss, 0) / data.length;

    // Totals Row calculation
    const allTradesInPeriod = viewMode === "monthly" 
        ? normalizedTrades.filter(t => isSameMonth(t.dateObj, currentDate))
        : normalizedTrades.filter(t => isSameYear(t.dateObj, currentDate));
    
    const totalStats = calcStats("Total", allTradesInPeriod);

    return (
      <div className="mt-8 bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-zinc-950 text-zinc-400 border-b border-white/5">
              <tr>
                <th className="px-5 py-4">{primaryLabel}</th>
                <th className="px-5 py-4">Trades</th>
                <th className="px-5 py-4">Win %</th>
                <th className="px-5 py-4">Avg Gain</th>
                <th className="px-5 py-4">Avg Loss</th>
                <th className="px-5 py-4">Biggest Gain</th>
                <th className="px-5 py-4">Biggest Loss</th>
                <th className="px-5 py-4">PnL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 font-medium text-white">{row.label}</td>
                  <td className="px-5 py-3 text-zinc-300">{row.count}</td>
                  <td className="px-5 py-3 text-zinc-300">{row.count > 0 ? row.winRate.toFixed(1) + "%" : "-"}</td>
                  <td className="px-5 py-3 text-emerald-400">{row.avgGain > 0 ? formatCurrency(row.avgGain, displayCurrency) : "-"}</td>
                  <td className="px-5 py-3 text-red-400">{row.avgLoss > 0 ? formatCurrency(row.avgLoss, displayCurrency) : "-"}</td>
                  <td className="px-5 py-3 text-emerald-500">{row.maxGain > 0 ? formatCurrency(row.maxGain, displayCurrency) : "-"}</td>
                  <td className="px-5 py-3 text-red-500">{row.maxLoss > 0 ? formatCurrency(row.maxLoss, displayCurrency) : "-"}</td>
                  <td className={cn("px-5 py-3 font-bold", row.pnl > 0 ? "text-emerald-400" : row.pnl < 0 ? "text-red-400" : "text-zinc-500")}>
                    {row.pnl !== 0 ? formatCurrency(Math.abs(row.pnl), displayCurrency) : "-"}
                  </td>
                </tr>
              ))}

              {/* Average Summary Row */}
              <tr className="bg-zinc-800/30 text-zinc-400 italic">
                <td className="px-5 py-3 font-semibold">Average</td>
                <td className="px-5 py-3">-</td>
                <td className="px-5 py-3">{avgWinRate.toFixed(1)}%</td>
                <td className="px-5 py-3">{formatCurrency(avgAvgGain, displayCurrency)}</td>
                <td className="px-5 py-3">{formatCurrency(avgAvgLoss, displayCurrency)}</td>
                <td className="px-5 py-3">-</td>
                <td className="px-5 py-3">-</td>
                <td className="px-5 py-3">-</td>
              </tr>

              {/* Total Summary Row */}
              <tr className="bg-[#00FFB2]/5 border-t-2 border-[#00FFB2]/20 font-bold text-white shadow-inner">
                <td className="px-5 py-4 text-[#00FFB2]">Total</td>
                <td className="px-5 py-4">{totalStats.count}</td>
                <td className="px-5 py-4">{totalStats.winRate.toFixed(1)}%</td>
                <td className="px-5 py-4 text-emerald-400">{formatCurrency(totalStats.avgGain, displayCurrency)}</td>
                <td className="px-5 py-4 text-red-400">{formatCurrency(totalStats.avgLoss, displayCurrency)}</td>
                <td className="px-5 py-4 text-emerald-500">{formatCurrency(totalStats.maxGain, displayCurrency)}</td>
                <td className="px-5 py-4 text-red-500">{formatCurrency(totalStats.maxLoss, displayCurrency)}</td>
                <td className={cn("px-5 py-4 text-lg", totalStats.pnl >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {formatCurrency(Math.abs(totalStats.pnl), displayCurrency)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };


  return (
    <TrialGuard featureName="Advanced Performance Calendar">
      <div className="space-y-2 animate-in fade-in duration-500 pb-10">
        
        {/* Toggle & Header Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 relative z-20 bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-4 rounded-xl">
           <div className="flex items-center gap-4">
             <div className="flex bg-zinc-950 p-1 rounded-lg border border-white/5 shadow-inner">
               <button 
                 onClick={() => setViewMode("monthly")}
                 className={cn("px-4 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-all", viewMode === "monthly" ? "bg-zinc-800 text-white shadow-sm ring-1 ring-white/10" : "text-zinc-500 hover:text-zinc-300")}
               >
                 <CalendarIcon size={14} /> Monthly
               </button>
               <button 
                 onClick={() => setViewMode("yearly")}
                 className={cn("px-4 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-all", viewMode === "yearly" ? "bg-zinc-800 text-white shadow-sm ring-1 ring-white/10" : "text-zinc-500 hover:text-zinc-300")}
               >
                 <LayoutGrid size={14} /> Yearly
               </button>
             </div>
           </div>

           <div className="flex items-center gap-4">
              <button onClick={handlePrev} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors border border-transparent hover:border-white/5">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-lg font-black tracking-tight text-white w-32 text-center pointer-events-none">
                {viewMode === "monthly" ? format(currentDate, "MMMM yyyy") : format(currentDate, "yyyy")}
              </h2>
              <button onClick={handleNext} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors border border-transparent hover:border-white/5">
                <ChevronRight size={20} />
              </button>
           </div>
        </div>

        {/* ------------------------------------------------ */}
        {/* MONTHLY VIEW ENGINES                             */}
        {/* ------------------------------------------------ */}
        {viewMode === "monthly" && (
          <div className="animate-in fade-in zoom-in duration-300">
            {/* Visual Calendar Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-4 rounded-xl xl:col-span-2">
                <div className="grid grid-cols-7 gap-1">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="text-center text-xs font-bold text-zinc-500 py-3 uppercase tracking-wider">{day}</div>
                  ))}
                  
                  {paddingDays.map((_, idx) => (
                    <div key={`padding-${idx}`} className="h-20 rounded-xl bg-zinc-950/30" />
                  ))}

                  {daysInMonth.map((day) => {
                    const dayTrades = getTradesForDay(day);
                    const pnl = getDayPnL(dayTrades);
                    const hasTrades = dayTrades.length > 0;
                    const isProfit = pnl >= 0;

                    let bgColor = "bg-zinc-950 hover:bg-zinc-900";
                    if (hasTrades) {
                      bgColor = isProfit ? "bg-[#00FFB2]/10 border-[#00FFB2]/20 hover:bg-[#00FFB2]/20" : "bg-red-500/10 border-red-500/20 hover:bg-red-500/20";
                    }
                    const isSelected = selectedDate && isSameDay(selectedDate, day);

                    return (
                      <div
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={cn(
                          "h-20 flex flex-col items-center justify-center rounded-xl border border-black/10 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none cursor-pointer transition-all relative",
                          bgColor,
                          isSelected && "ring-2 ring-emerald-500 z-10 scale-105 shadow-xl",
                          !isSameMonth(day, currentDate) && "opacity-40"
                        )}
                      >
                        <span className={cn("text-[13px] mb-1", isToday(day) ? "font-black text-emerald-400" : "text-zinc-400 font-bold")}>
                          {format(day, "d")}
                        </span>
                        {hasTrades && (
                          <span className={cn("text-[11px] font-bold px-1.5 py-0.5 rounded", isProfit ? "text-[#00FFB2] bg-[#00FFB2]/10" : "text-red-400 bg-red-500/10")}>
                            {formatCurrency(Math.abs(pnl), displayCurrency)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Day Details Panel */}
              <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-5 flex flex-col rounded-xl h-[450px] xl:h-auto overflow-hidden">
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4 shrink-0">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 tracking-wide">
                    {selectedDate ? format(selectedDate, "MMM do, yyyy") : "Day Review"}
                  </h3>
                  {selectedDate && (
                    <button onClick={() => setSelectedDate(null)} className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                  {!selectedDate ? (
                    <div className="h-full flex items-center justify-center text-zinc-500 text-sm font-medium italic">
                      Click any date to inspect trades.
                    </div>
                  ) : selectedTrades.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                       <CalendarIcon size={32} className="text-zinc-700 mb-3" />
                       <p className="text-zinc-400 text-sm font-medium">No recorded trades.</p>
                    </div>
                  ) : (
                    selectedTrades.map((trade, idx) => (
                      <div key={trade.id || idx} className="bg-zinc-950 border border-black/10 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-4 rounded-xl flex flex-col gap-3 group hover:border-white/10 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-white text-base mr-2 tracking-tight">{trade.symbol}</span>
                            <span className={cn("text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded", trade.type === 'buy' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400')}>
                              {trade.type}
                            </span>
                          </div>
                          <span className={cn("font-black text-sm", (trade.normalizedPnl || 0) >= 0 ? "text-[#00FFB2]" : "text-red-400")}>
                            {formatCurrency(Math.abs(trade.normalizedPnl || trade.pnl), displayCurrency)}
                          </span>
                        </div>
                        <div className="flex gap-4 text-xs font-semibold">
                          <span className="text-zinc-500">Vol: <span className="text-zinc-300">{trade.lot}</span></span>
                        </div>
                        {trade.note && (
                          <p className="text-xs text-zinc-400 bg-white/5 p-2.5 rounded-lg italic">
                            "{trade.note}"
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Weekly Detailed Performance Table */}
            {renderTable(weeklyStats, "Week")}
          </div>
        )}

        {/* ------------------------------------------------ */}
        {/* YEARLY VIEW ENGINES                              */}
        {/* ------------------------------------------------ */}
        {viewMode === "yearly" && (
          <div className="animate-in fade-in zoom-in duration-300">
             
            {/* Visual Yearly Heatmap / Metric Grid */}
            <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-5 rounded-xl mb-6">
               <h3 className="text-sm font-bold text-zinc-300 mb-4 px-1 uppercase tracking-wider">Year-at-a-Glance Heatmap</h3>
               <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
                 {monthlyStatsInYear.map((stat, i) => {
                   const isProfit = stat.pnl >= 0;
                   const hasTrades = stat.count > 0;
                   return (
                     <div key={i} className={cn(
                       "p-4 rounded-xl border flex flex-col items-center justify-center transition-all",
                       !hasTrades ? "bg-zinc-950/50 border-white/5" :
                       isProfit ? "bg-[#00FFB2]/5 border-[#00FFB2]/20 hover:bg-[#00FFB2]/10" : "bg-red-500/5 border-red-500/20 hover:bg-red-500/10"
                     )}>
                       <span className={cn("text-xs font-bold uppercase tracking-wider mb-2", hasTrades ? "text-white" : "text-zinc-500")}>
                         {stat.label.substring(0, 3)}
                       </span>
                       {hasTrades ? (
                         <>
                           <span className={cn("text-sm font-black text-center w-full truncate", isProfit ? "text-[#00FFB2]" : "text-red-400")}>
                             {formatCurrency(Math.abs(stat.pnl), displayCurrency)}
                           </span>
                           <span className="text-[10px] text-zinc-500 font-bold mt-1">{stat.count} Trades</span>
                         </>
                       ) : (
                         <span className="text-[10px] text-zinc-600 font-medium">No Data</span>
                       )}
                     </div>
                   );
                 })}
               </div>
            </div>

            {/* Monthly Detailed Performance Table */}
            {renderTable(monthlyStatsInYear, "Month")}
          </div>
        )}

      </div>
    </TrialGuard>
  );
}
