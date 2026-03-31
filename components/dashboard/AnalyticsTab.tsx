"use client";

import { useMemo, useState } from "react";
import { Trade, Currency } from "@/types";
import { useAuth } from "@/lib/AuthContext";
import { BarChart3, Activity, Crosshair, Target, Flame, Scale, TrendingUp, Trophy, Calendar, Zap } from "lucide-react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ReferenceLine
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { format, startOfWeek, endOfWeek } from "date-fns";


interface AnalyticsTabProps {
  trades: any[];
  displayCurrency: Currency;
}

/* ═══════════════════════════════════════════════
   CUMULATIVE PnL TOOLTIP (Moved from Charts.tsx)
   ═══════════════════════════════════════════════ */
const CumulativeTooltip = ({ active, payload, label, displayCurrency }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (data.dateStr === "Start") return null;

    const isPositiveChange = data.percentChange >= 0;
    const changeColor = isPositiveChange ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
    
    return (
      <div className="bg-[#09090b]/95 backdrop-blur-md border border-zinc-200 dark:border-[#27272a] rounded-2xl shadow-2xl p-4 min-w-[200px] flex flex-col gap-3">
        <div className="flex justify-between items-center border-b border-zinc-200 dark:border-[#111827] pb-2">
           <span className="text-zinc-600 dark:text-[#A0A0A0] text-xs font-bold uppercase tracking-wider">{label}</span>
           <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-[#EAEAEA] text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-widest">
             {data.tradesCount} Trade{data.tradesCount !== 1 ? 's' : ''}
           </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-zinc-600 dark:text-[#A0A0A0] text-[11px] font-medium uppercase tracking-widest">Cumulative PnL</span>
          <span className={`text-xl font-black tracking-tight ${data.pnlCumulative >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {formatCurrency(data.pnlCumulative, displayCurrency)}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-xs font-medium pt-1">
          <span className="text-zinc-600 dark:text-[#A0A0A0]">Period PnL:</span>
          <span className={`font-bold ${data.periodPnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{data.periodPnl > 0 ? '+' : ''}{formatCurrency(data.periodPnl, displayCurrency)}</span>
        </div>
        {data.percentChange !== 0 && (
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-zinc-600 dark:text-[#A0A0A0]">vs Prev:</span>
            <span className={`font-bold ${changeColor}`}>{isPositiveChange ? '+' : ''}{data.percentChange.toFixed(1)}%</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};


import React from "react";

export default React.memo(function AnalyticsTab({ trades, displayCurrency }: AnalyticsTabProps) {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly">("daily");
  
  // Trades passed from dashboard are already normalized
  const normalizedTrades = useMemo(() => {
    return trades.map(t => ({ ...t, pnl: t.normalizedPnl ?? t.pnl }));
  }, [trades]);

  if (normalizedTrades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] fade-slide-up shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)] rounded-full flex items-center justify-center mb-6 shadow-2xl">
          <BarChart3 className="text-zinc-600 dark:text-[#A0A0A0]" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-[#EAEAEA] mb-2">No data yet.</h2>
        <p className="text-zinc-600 dark:text-[#A0A0A0]">Start logging your trades to unlock deep performance insights.</p>
      </div>
    );
  }

  // --- CORE CALCULATIONS ---
  const totalTrades = normalizedTrades.length;
  const wins = normalizedTrades.filter(t => t.pnl > 0);
  const losses = normalizedTrades.filter(t => t.pnl < 0);
  
  const totalWins = wins.length;
  const totalLosses = losses.length;
  
  const nonBreakevenTotal = totalWins + totalLosses;
  const winRate = nonBreakevenTotal > 0 ? (totalWins / nonBreakevenTotal) * 100 : 0;
  
  const totalProfit = normalizedTrades.reduce((acc, t) => acc + t.pnl, 0);
  const totalGrossProfit = wins.reduce((acc, t) => acc + t.pnl, 0);
  const totalGrossLoss = Math.abs(losses.reduce((acc, t) => acc + t.pnl, 0));
  const profitEfficiency = (totalGrossProfit + totalGrossLoss) > 0 ? (totalGrossProfit / (totalGrossProfit + totalGrossLoss)) * 100 : 0;

  // RR & SL Calcs
  let totalRR = 0;
  let validRRCount = 0;
  let slFollowedCount = 0;

  normalizedTrades.forEach(t => {
    if (t.stopLossFollowed) slFollowedCount++;
    if (t.pnl > 0 && t.risk && t.risk > 0) {
      totalRR += (t.pnl / t.risk);
      validRRCount++;
    }
  });

  const avgRR = validRRCount > 0 ? totalRR / validRRCount : 0;
  const slUsage = totalTrades > 0 ? (slFollowedCount / totalTrades) * 100 : 0;

  // Buy vs Sell
  const buys = normalizedTrades.filter(t => t.type === "buy");
  const sells = normalizedTrades.filter(t => t.type === "sell");

  const buyProfit = buys.reduce((acc, t) => acc + t.pnl, 0);
  const buyWins = buys.filter(t => t.pnl > 0).length;
  const buyLosses = buys.filter(t => t.pnl < 0).length;
  const buyWinRate = (buyWins + buyLosses) > 0 ? (buyWins / (buyWins + buyLosses)) * 100 : 0;
  const buyGrossProfit = buys.filter(t => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
  const buyGrossLoss = Math.abs(buys.filter(t => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0));
  const buyProfitEfficiency = (buyGrossProfit + buyGrossLoss) > 0 ? (buyGrossProfit / (buyGrossProfit + buyGrossLoss)) * 100 : 0;

  const sellProfit = sells.reduce((acc, t) => acc + t.pnl, 0);
  const sellWins = sells.filter(t => t.pnl > 0).length;
  const sellLosses = sells.filter(t => t.pnl < 0).length;
  const sellWinRate = (sellWins + sellLosses) > 0 ? (sellWins / (sellWins + sellLosses)) * 100 : 0;
  const sellGrossProfit = sells.filter(t => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
  const sellGrossLoss = Math.abs(sells.filter(t => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0));
  const sellProfitEfficiency = (sellGrossProfit + sellGrossLoss) > 0 ? (sellGrossProfit / (sellGrossProfit + sellGrossLoss)) * 100 : 0;

  // Behavioral Bias
  let bias = "Neutral";
  let biasColor = "text-zinc-600 dark:text-[#A0A0A0]";
  if (buys.length > sells.length) {
    bias = "Bullish Focus";
    biasColor = "text-blue-400";
  } else if (sells.length > buys.length) {
    bias = "Bearish Focus";
    biasColor = "text-purple-400";
  }

  // Consistency
  const dailyPnL: Record<string, number> = {};
  normalizedTrades.forEach(t => {
    const dStr = format(new Date(t.date), "yyyy-MM-dd");
    if (!dailyPnL[dStr]) dailyPnL[dStr] = 0;
    dailyPnL[dStr] += t.pnl;
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

  const totalDays = greenDays + redDays;
  const greenRatio = totalDays > 0 ? greenDays / totalDays : 0;

  // Most Traded Instruments
  const symbolStats: Record<string, { total: number; wins: number; losses: number; profit: number; loss: number }> = {};
  normalizedTrades.forEach(t => {
    if (!symbolStats[t.symbol]) symbolStats[t.symbol] = { total: 0, wins: 0, losses: 0, profit: 0, loss: 0 };
    symbolStats[t.symbol].total++;
    if (t.pnl > 0) {
      symbolStats[t.symbol].wins++;
      symbolStats[t.symbol].profit += t.pnl;
    } else if (t.pnl < 0) {
      symbolStats[t.symbol].losses++;
      symbolStats[t.symbol].loss += Math.abs(t.pnl);
    }
  });

  const topInstruments = Object.entries(symbolStats)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 3);

  // Radar Chart Normalization (0-10)
  const wrScore = (winRate / 100) * 10;
  const slScore = (slUsage / 100) * 10;
  const rrScore = Math.min((avgRR / 3) * 10, 10);
  const consistencyScore = Math.min(10, (greenRatio * 10) + (currentStreak * 0.5));

  const averageExecution = (wrScore + slScore + rrScore + consistencyScore) / 4;
  const executionPercentage = averageExecution * 10;
  
  let executionColor = "text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]";
  if (executionPercentage < 40) executionColor = "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]";
  else if (executionPercentage <= 70) executionColor = "text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]";

  const wrScoreFormatted = Number(wrScore.toFixed(1)) || 0;
  const slScoreFormatted = Number(slScore.toFixed(1)) || 0;
  const rrScoreFormatted = Number(rrScore.toFixed(1)) || 0;
  const consScoreFormatted = Number(consistencyScore.toFixed(1)) || 0;

  const radarData = [
    { subject: `CONS: ${consScoreFormatted}`, A: consScoreFormatted, fullMark: 10 },
    { subject: `RR: ${rrScoreFormatted}`, A: rrScoreFormatted, fullMark: 10 },
    { subject: `SL: ${slScoreFormatted}`, A: slScoreFormatted, fullMark: 10 },
    { subject: `WR: ${wrScoreFormatted}`, A: wrScoreFormatted, fullMark: 10 },
  ];

  const executionDecimal = (averageExecution).toFixed(1);

  // ═══════════════════════════════════════════════
  //  CUMULATIVE PnL CHART DATA (SWAPPED FROM Dashboard Charts.tsx)
  // ═══════════════════════════════════════════════
  const { chartData, headerMetrics } = useMemo(() => {
    const sortedTrades = [...normalizedTrades].sort((a, b) => a.date - b.date);
    
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
      groups[key].pnl += t.pnl;
      groups[key].tradesCount += 1;
    });

    const orderedKeys = Object.keys(groups).sort();
    
    let cumPnl = 0;
    const data = [];
    
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

    // Header metrics
    const netPnl = sortedTrades.reduce((sum, t) => sum + t.pnl, 0);
    const nonBreakeven = sortedTrades.filter(t => t.pnl !== 0);
    const winsArr = sortedTrades.filter(t => t.pnl > 0);
    const wr = nonBreakeven.length > 0 ? (winsArr.length / nonBreakeven.length) * 100 : 0;
    
    const dHash: Record<string, number> = {};
    sortedTrades.forEach(t => {
       const dStr = format(new Date(t.date), "yyyy-MM-dd");
       dHash[dStr] = (dHash[dStr] || 0) + t.pnl;
    });
    const bestDay = Object.values(dHash).length > 0 ? Math.max(...Object.values(dHash), 0) : 0;

    return {
      chartData: data,
      headerMetrics: {
        totalPnl: netPnl,
        winRate: wr,
        bestDay
      }
    };
  }, [normalizedTrades, timeframe]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-[#EAEAEA] flex items-center gap-3">
              <BarChart3 className="text-emerald-500" /> Performance Analytics
            </h2>
            <p className="text-sm text-zinc-600 dark:text-[#A0A0A0] mt-1">Deep dive into your edge, biases, and execution consistency.</p>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
          
          {/* 1. Profitability Overview */}
          <div className="bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] fade-slide-up shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)] rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-[#EAEAEA] flex items-center gap-2 mb-6">
              <Activity size={16} className="text-emerald-500" /> Profitability Overview
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md p-4 rounded-lg border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)]">
                <p className="text-xs text-zinc-600 dark:text-[#A0A0A0] mb-1">Total PnL</p>
                <p className={`text-xl font-bold ${totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(totalProfit, displayCurrency)}
                </p>
              </div>
              <div className="bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md p-4 rounded-lg border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)]">
                <p className="text-xs text-zinc-600 dark:text-[#A0A0A0] mb-1 cursor-help" title="Win Rate (Winning trades / Total trades)">Win Rate</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-[#EAEAEA]">{winRate.toFixed(2)}%</p>
              </div>
              <div className="bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md p-4 rounded-lg border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)]">
                <p className="text-xs text-amber-400/80 mb-1">Profit Efficiency</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{profitEfficiency.toFixed(2)}%</p>
              </div>
              <div className="bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md p-4 rounded-lg border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)]">
                <p className="text-xs text-zinc-600 dark:text-[#A0A0A0] mb-1">Total Trades</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-[#EAEAEA]">{totalTrades}</p>
              </div>
              <div className="bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md p-4 rounded-lg border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)] col-span-2">
                <p className="text-xs text-zinc-600 dark:text-[#A0A0A0] mb-1">Wins / Losses</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-[#EAEAEA]">
                  <span className="text-emerald-600 dark:text-emerald-400">{totalWins}</span>
                  <span className="text-zinc-600 mx-1">/</span>
                  <span className="text-red-600 dark:text-red-400">{totalLosses}</span>
                </p>
              </div>
            </div>
          </div>

          {/* 2. Buy vs Sell Analysis & 3. Bias */}
          <div className="bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] fade-slide-up shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)] rounded-2xl p-5 shadow-sm lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-[#EAEAEA] flex items-center gap-2">
                <Scale size={16} className="text-blue-500" /> Directional Edge Analysis
              </h2>
              <div className="flex items-center gap-2 text-xs bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)] shadow-inner">
                <span className="text-zinc-600 dark:text-[#A0A0A0]">Behavioral Bias:</span>
                <strong className={biasColor}>{bias}</strong>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* BUY Side */}
              <div className="bg-blue-500/5 border border-blue-500/10 p-5 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                <h3 className="text-blue-400 text-sm font-bold uppercase tracking-wider mb-4">Longs (Buy)</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-zinc-600 dark:text-[#A0A0A0] text-sm">Profit</span>
                    <span className={`font-bold ${buyProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(buyProfit, displayCurrency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600 dark:text-[#A0A0A0] text-sm">Win Rate</span>
                    <span className="font-bold text-zinc-900 dark:text-[#EAEAEA]">{buyWinRate.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600 dark:text-[#A0A0A0] text-sm">Profit Efficiency</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{buyProfitEfficiency.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600 dark:text-[#A0A0A0] text-sm">Wins / Losses</span>
                    <span className="font-bold text-zinc-900 dark:text-[#EAEAEA]"><span className="text-emerald-600 dark:text-emerald-400">{buyWins}</span> / <span className="text-red-600 dark:text-red-400">{buyLosses}</span></span>
                  </div>
                </div>
              </div>

              {/* SELL Side */}
              <div className="bg-purple-500/5 border border-purple-500/10 p-5 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                <h3 className="text-purple-400 text-sm font-bold uppercase tracking-wider mb-4">Shorts (Sell)</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-zinc-600 dark:text-[#A0A0A0] text-sm">Profit</span>
                    <span className={`font-bold ${sellProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(sellProfit, displayCurrency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600 dark:text-[#A0A0A0] text-sm">Win Rate</span>
                    <span className="font-bold text-zinc-900 dark:text-[#EAEAEA]">{sellWinRate.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600 dark:text-[#A0A0A0] text-sm">Profit Efficiency</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{sellProfitEfficiency.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600 dark:text-[#A0A0A0] text-sm">Wins / Losses</span>
                    <span className="font-bold text-zinc-900 dark:text-[#EAEAEA]"><span className="text-emerald-600 dark:text-emerald-400">{sellWins}</span> / <span className="text-red-600 dark:text-red-400">{sellLosses}</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Radar Chart */}
          <div className="bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] fade-slide-up shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)] rounded-2xl p-4 shadow-sm lg:col-span-1 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[60px] rounded-full pointer-events-none" />
            
            {/* Merged Header & Score */}
            <div className="flex items-center justify-between w-full relative z-10 mb-2">
              <div className="flex items-center gap-2">
                 <Target size={16} className="text-emerald-500 shrink-0" />
                 <h2 className="text-sm font-bold text-zinc-900 dark:text-[#EAEAEA] leading-none">Execution Score</h2>
              </div>
              <div className={`text-2xl font-black ${executionColor} tracking-tighter drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]`}>
                 {executionDecimal}
              </div>
            </div>
            
            {/* Shrunken Radar Container */}
            <div className="flex-1 w-full min-h-[250px] relative mt-1 z-10">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="#3f3f46" strokeDasharray="3 3" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#d4d4d8", fontSize: 10, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                  <Radar name="Score" dataKey="A" stroke="#10b981" strokeWidth={2.5} fill="#10b981" fillOpacity={0.15} style={{ filter: "drop-shadow(0 0 5px rgba(16,185,129,0.3))" }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Minimal Inline Footer */}
            <div className="mt-2 text-[11px] font-bold text-zinc-600 dark:text-[#A0A0A0] w-full text-center relative z-10">
              Overall Analytics Score: <span className="text-zinc-900 dark:text-[#EAEAEA] ml-1">{executionDecimal} / 10</span>
            </div>
          </div>

          {/* 4. Most Traded Instruments & 5. Consistency */}
          <div className="bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] fade-slide-up shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)] rounded-2xl p-5 shadow-sm lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Consistency */}
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-[#EAEAEA] flex items-center gap-2 mb-6">
                <Flame size={16} className="text-amber-500" /> Consistency Tracking
              </h2>
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md p-4 rounded-2xl border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)]">
                  <span className="text-xs text-zinc-600 dark:text-[#A0A0A0] font-medium uppercase tracking-wider">Current Streak</span>
                  <div className={`text-2xl font-bold flex items-center gap-2 ${currentStreak > 0 ? "text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]" : "text-zinc-600 dark:text-[#A0A0A0]"}`}>
                    <span>{currentStreak > 0 ? "🔥" : "❄️"}</span>
                    {currentStreak} Day{currentStreak !== 1 ? 's' : ''}
                  </div>
                </div>

                <div className="bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md p-4 rounded-2xl border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)] space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-[#EAEAEA] flex items-center gap-2.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"/>Green Days</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{greenDays}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-[#EAEAEA] flex items-center gap-2.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"/>Red Days</span>
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">{redDays}</span>
                  </div>
                  {(greenDays > 0 || redDays > 0) && (
                    <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden flex shadow-inner">
                      <div className="h-full bg-emerald-500" style={{ width: `${(greenDays / (greenDays + redDays)) * 100}%` }} />
                      <div className="h-full bg-red-500" style={{ width: `${(redDays / (greenDays + redDays)) * 100}%` }} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Top Instruments */}
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-[#EAEAEA] flex items-center gap-2 mb-6">
                <Crosshair size={16} className="text-pink-500" /> Favorite Instruments
              </h2>
              <div className="space-y-4">
                {topInstruments.length === 0 ? (
                  <div className="text-zinc-600 dark:text-[#A0A0A0] text-sm text-center py-4">No data</div>
                ) : (
                  topInstruments.map(([symbol, stats], idx) => {
                    const totalVolume = stats.profit + stats.loss;
                    const pPct = totalVolume > 0 ? (stats.profit / totalVolume) * 100 : 0;
                    const lPct = totalVolume > 0 ? (stats.loss / totalVolume) * 100 : 0;
                    const netProfit = stats.profit - stats.loss;
                    const winRateStr = stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(0) + '%' : '0%';

                    return (
                      <div key={symbol} className="bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md p-4 rounded-2xl border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)] group transition-colors hover:bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-emerald-500/80 bg-emerald-500/10 px-1.5 py-0.5 rounded tracking-widest">#{idx + 1}</span>
                              <span className="text-base font-bold text-zinc-900 dark:text-[#EAEAEA] tracking-wide">{symbol}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium">
                              <span className="text-zinc-600 dark:text-[#A0A0A0] bg-white/5 px-2 py-0.5 rounded-md">{stats.total} Trades</span>
                              <span className="text-zinc-600 dark:text-[#A0A0A0]">WR: <span className="text-zinc-900 dark:text-[#EAEAEA]">{winRateStr}</span></span>
                            </div>
                          </div>
                          <div className={`text-sm font-bold tracking-tight px-2.5 py-1 rounded-md border ${netProfit >= 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"}`}>
                            {netProfit >= 0 ? "+" : "-"}{formatCurrency(Math.abs(netProfit), displayCurrency)}
                          </div>
                        </div>
                        
                        <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden flex mb-2 mt-2 shadow-inner">
                          <div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] transition-all duration-500" style={{ width: `${pPct}%` }} />
                          <div className="h-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] transition-all duration-500" style={{ width: `${lPct}%` }} />
                        </div>
                        
                        <div className="flex justify-between text-[11px] font-semibold tracking-wide">
                          <span className="text-emerald-500">{formatCurrency(stats.profit, displayCurrency)} </span>
                          <span className="text-zinc-600 dark:text-[#A0A0A0] text-[10px] font-medium tracking-tight uppercase">Gross</span>
                          <span className="text-red-500">{formatCurrency(stats.loss, displayCurrency)} </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

        </div>

        {/* ═══════════════════════════════════════════════
           CUMULATIVE PnL PERFORMANCE GRAPH (SWAPPED FROM Dashboard Charts.tsx)
           ═══════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] fade-slide-up shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)] p-6 md:p-8 rounded-2xl flex flex-col w-full relative z-10 transition-colors hover:border-zinc-200 dark:border-[#111827] mt-6">
        
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
               <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-[#EAEAEA] flex items-center gap-2">
                 <TrendingUp className="text-emerald-500" size={20} /> Cumulative Performance
               </h3>
               <p className="text-xs text-zinc-600 dark:text-[#A0A0A0] mt-1 font-medium">Tracking your equity curve over time.</p>
            </div>
            
            <div className="flex items-center bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md p-1 rounded-lg border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)]">
               {(["daily", "weekly", "monthly"] as const).map(tf => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-4 py-1.5 text-xs font-bold capitalize rounded-md transition-all ${timeframe === tf ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]" : "text-zinc-600 dark:text-[#A0A0A0] hover:text-[#EAEAEA]"}`}
                  >
                    {tf}
                  </button>
               ))}
            </div>
          </div>

          {/* Dynamic Summary Stats Panel */}
          {normalizedTrades.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md p-4 rounded-2xl border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)] flex flex-col gap-1 hover:bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md transition-colors">
                 <span className="text-[10px] text-zinc-600 dark:text-[#A0A0A0] font-bold uppercase tracking-wider flex items-center gap-1.5"><TrendingUp size={12}/> Net PnL</span>
                 <span className={`text-xl font-bold ${headerMetrics.totalPnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{formatCurrency(headerMetrics.totalPnl, displayCurrency)}</span>
              </div>
              <div className="bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md p-4 rounded-2xl border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)] flex flex-col gap-1 cursor-help hover:bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md transition-colors" title="Win Rate (Winning trades / Total trades)">
                 <span className="text-[10px] text-zinc-600 dark:text-[#A0A0A0] font-bold uppercase tracking-wider flex items-center gap-1.5"><Trophy size={12}/> Win Rate</span>
                 <span className="text-xl font-bold text-zinc-900 dark:text-[#EAEAEA]">{headerMetrics.winRate.toFixed(1)}%</span>
              </div>
              <div className="bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md p-4 rounded-2xl border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)] flex flex-col gap-1 hover:bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md transition-colors">
                 <span className="text-[10px] text-zinc-600 dark:text-[#A0A0A0] font-bold uppercase tracking-wider flex items-center gap-1.5"><Zap size={12}/> Best Day</span>
                 <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(headerMetrics.bestDay, displayCurrency)}</span>
              </div>
              <div className="bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md p-4 rounded-2xl border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)] flex flex-col gap-1 hover:bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md transition-colors">
                 <span className="text-[10px] text-zinc-600 dark:text-[#A0A0A0] font-bold uppercase tracking-wider flex items-center gap-1.5"><Calendar size={12}/> Current Streak</span>
                 <span className={`text-xl font-bold ${currentStreak > 0 ? "text-amber-600 dark:text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]" : "text-zinc-600 dark:text-[#A0A0A0]"}`}>{currentStreak} <span className="text-sm font-medium">Day{currentStreak !== 1 ? 's': ''}</span></span>
              </div>
            </div>
          )}

          {/* Chart Area */}
          {normalizedTrades.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-zinc-600 dark:text-[#A0A0A0] text-sm min-h-[300px]">No data available to chart.</div>
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
                    content={<CumulativeTooltip displayCurrency={displayCurrency} />}
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
});
