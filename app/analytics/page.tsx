"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trade, Currency } from "@/types";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, BarChart3, Activity, Crosshair, Target, Flame, Scale, Calendar } from "lucide-react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [displayCurrency, setDisplayCurrency] = useState<Currency>("USD");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
        const data = await res.json();
        setRates(data.rates);
      } catch (error) {
        console.error("Failed to fetch exchange rates:", error);
      }
    };
    fetchRates();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "trades"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTrades = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Trade[];
      setTrades(fetchedTrades);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const normalizedTrades = useMemo(() => {
    return trades.map((trade) => {
      let normalizedPnl = trade.pnl;
      if (Object.keys(rates).length > 0) {
        const tradeRate = rates[trade.currency] || 1;
        const amountInUSD = trade.pnl / tradeRate;
        const displayRate = rates[displayCurrency] || 1;
        normalizedPnl = amountInUSD * displayRate;
      }
      return { ...trade, pnl: normalizedPnl }; 
    });
  }, [trades, rates, displayCurrency]);

  if (loading) {
    return <div className="h-full flex items-center justify-center pt-20"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>;
  }

  if (normalizedTrades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none rounded-full flex items-center justify-center mb-6 shadow-2xl">
          <BarChart3 className="text-zinc-500" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">No data yet.</h2>
        <p className="text-zinc-400">Start logging your trades to unlock deep performance insights.</p>
      </div>
    );
  }

  // --- CORE CALCULATIONS ---
  const totalTrades = normalizedTrades.length;
  const wins = normalizedTrades.filter(t => t.pnl > 0);
  const losses = normalizedTrades.filter(t => t.pnl < 0);
  
  const totalWins = wins.length;
  const totalLosses = losses.length;
  
  const totalProfitValue = wins.reduce((acc, t) => acc + t.pnl, 0);
  const totalLossValue = losses.reduce((acc, t) => acc + Math.abs(t.pnl), 0);
  const winRate = (totalProfitValue + totalLossValue) > 0 ? (totalProfitValue / (totalProfitValue + totalLossValue)) * 100 : 0;
  
  const totalProfit = normalizedTrades.reduce((acc, t) => acc + t.pnl, 0);

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
  const buyProfitValue = buys.filter(t => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
  const buyLossValue = buys.filter(t => t.pnl < 0).reduce((acc, t) => acc + Math.abs(t.pnl), 0);
  const buyWinRate = (buyProfitValue + buyLossValue) > 0 ? (buyProfitValue / (buyProfitValue + buyLossValue)) * 100 : 0;

  const sellProfit = sells.reduce((acc, t) => acc + t.pnl, 0);
  const sellWins = sells.filter(t => t.pnl > 0).length;
  const sellProfitValue = sells.filter(t => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
  const sellLossValue = sells.filter(t => t.pnl < 0).reduce((acc, t) => acc + Math.abs(t.pnl), 0);
  const sellWinRate = (sellProfitValue + sellLossValue) > 0 ? (sellProfitValue / (sellProfitValue + sellLossValue)) * 100 : 0;

  // Behavioral Bias
  let bias = "Neutral";
  let biasColor = "text-zinc-400";
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

  // Performance by Day of Week
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const shortDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const orderedDays = [1, 2, 3, 4, 5, 6, 0]; // Monday to Sunday
  
  const dayStats: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  
  normalizedTrades.forEach(t => {
    const dayIndex = new Date(t.date).getDay();
    dayStats[dayIndex] += t.pnl;
  });

  const weeklyData = orderedDays.map(dayIndex => ({
    name: shortDayNames[dayIndex],
    fullName: dayNames[dayIndex],
    pnl: dayStats[dayIndex]
  }));

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

  const radarData = [
    { subject: 'Consistency', A: Number(consistencyScore.toFixed(1)) || 0, fullMark: 10 },
    { subject: 'Risk-Reward', A: Number(rrScore.toFixed(1)) || 0, fullMark: 10 },
    { subject: 'Stop Loss Usage', A: Number(slScore.toFixed(1)) || 0, fullMark: 10 },
    { subject: 'Win Rate', A: Number(wrScore.toFixed(1)) || 0, fullMark: 10 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <BarChart3 className="text-emerald-500" /> Performance Analytics
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Deep dive into your edge, biases, and execution consistency.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-2 rounded-lg relative z-20">
          <span className="text-sm text-zinc-400 font-medium ml-2">Displaying in:</span>
          <select
            value={displayCurrency}
            onChange={(e) => setDisplayCurrency(e.target.value as Currency)}
            className="bg-zinc-950 border border-zinc-800 text-emerald-400 font-semibold rounded p-1.5 text-sm focus:border-emerald-500 focus:outline-none cursor-pointer"
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="INR">INR (₹)</option>
          </select>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        
        {/* 1. Profitability Overview */}
        <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2 mb-6">
            <Activity size={16} className="text-emerald-500" /> Profitability Overview
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-950/50 p-4 rounded-lg border border-black/10 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none">
              <p className="text-xs text-zinc-400 mb-1">Total PnL</p>
              <p className={`text-xl font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(totalProfit, displayCurrency)}
              </p>
            </div>
            <div className="bg-zinc-950/50 p-4 rounded-lg border border-black/10 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none">
              <p className="text-xs text-zinc-400 mb-1">Win Rate</p>
              <p className="text-xl font-bold text-white">{winRate.toFixed(1)}%</p>
            </div>
            <div className="bg-zinc-950/50 p-4 rounded-lg border border-black/10 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none">
              <p className="text-xs text-zinc-400 mb-1">Total Trades</p>
              <p className="text-xl font-bold text-white">{totalTrades}</p>
            </div>
            <div className="bg-zinc-950/50 p-4 rounded-lg border border-black/10 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none">
              <p className="text-xs text-zinc-400 mb-1">Wins / Losses</p>
              <p className="text-xl font-bold text-white">
                <span className="text-emerald-400">{totalWins}</span>
                <span className="text-zinc-600 mx-1">/</span>
                <span className="text-red-400">{totalLosses}</span>
              </p>
            </div>
          </div>
        </div>

        {/* 2. Buy vs Sell Analysis & 3. Bias */}
        <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none rounded-xl p-5 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <Scale size={16} className="text-blue-500" /> Directional Edge Analysis
            </h2>
            <div className="flex items-center gap-2 text-xs bg-zinc-950 px-3 py-1.5 rounded-full border border-black/10 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none shadow-inner">
              <span className="text-zinc-400">Behavioral Bias:</span>
              <strong className={biasColor}>{bias}</strong>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* BUY Side */}
            <div className="bg-blue-500/5 border border-blue-500/10 p-5 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
              <h3 className="text-blue-400 text-sm font-bold uppercase tracking-wider mb-4">Longs (Buy)</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-zinc-400 text-sm">Profit</span>
                  <span className={`font-bold ${buyProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(buyProfit, displayCurrency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 text-sm">Win Rate</span>
                  <span className="font-bold text-white">{buyWinRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 text-sm">Wins / Losses</span>
                  <span className="font-bold text-white"><span className="text-emerald-400">{buyWins}</span> / <span className="text-red-400">{buys.length - buyWins}</span></span>
                </div>
              </div>
            </div>

            {/* SELL Side */}
            <div className="bg-purple-500/5 border border-purple-500/10 p-5 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
              <h3 className="text-purple-400 text-sm font-bold uppercase tracking-wider mb-4">Shorts (Sell)</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-zinc-400 text-sm">Profit</span>
                  <span className={`font-bold ${sellProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(sellProfit, displayCurrency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 text-sm">Win Rate</span>
                  <span className="font-bold text-white">{sellWinRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 text-sm">Wins / Losses</span>
                  <span className="font-bold text-white"><span className="text-emerald-400">{sellWins}</span> / <span className="text-red-400">{sells.length - sellWins}</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Radar Chart */}
        <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none rounded-xl p-5 shadow-sm lg:col-span-1 flex flex-col">
          <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2 mb-2">
            <Target size={16} className="text-emerald-500" /> Execution Score
          </h2>
          <p className="text-[10px] text-zinc-500 mb-2 text-center uppercase tracking-widest font-semibold">Metrics normalized (0-10 scale)</p>
          <div className="flex-1 w-full min-h-[220px] relative -ml-2">
            
            {/* Center Execution Score Overlay */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none z-10 bg-zinc-900/40 backdrop-blur-[2px] w-24 h-24 rounded-full border border-white/5 shadow-inner">
              <span className={`text-2xl font-black ${executionColor} tracking-tighter`}>
                {Math.round(executionPercentage)}%
              </span>
              <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mt-1 text-center leading-tight">
                Execution<br/>Score
              </span>
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#27272a" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#a1a1aa", fontSize: 10, fontWeight: 600 }} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                <Radar name="Score" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Most Traded Instruments & 5. Consistency */}
        <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none rounded-xl p-5 shadow-sm lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Consistency */}
          <div>
            <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2 mb-6">
              <Flame size={16} className="text-amber-500" /> Consistency Tracking
            </h2>
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center bg-zinc-950/50 p-4 rounded-xl border border-black/10 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none">
                <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Current Streak</span>
                <div className={`text-2xl font-bold flex items-center gap-2 ${currentStreak > 0 ? "text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]" : "text-zinc-500"}`}>
                  <span>{currentStreak > 0 ? "🔥" : "❄️"}</span>
                  {currentStreak} Day{currentStreak !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="bg-zinc-950/50 p-4 rounded-xl border border-black/10 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-zinc-300 flex items-center gap-2.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"/> Green Days</span>
                  <span className="text-sm font-bold text-emerald-400">{greenDays}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-zinc-300 flex items-center gap-2.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"/> Red Days</span>
                  <span className="text-sm font-bold text-red-400">{redDays}</span>
                </div>
                {(greenDays > 0 || redDays > 0) && (
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden flex shadow-inner">
                    <div className="h-full bg-emerald-500" style={{ width: `${(greenDays / (greenDays + redDays)) * 100}%` }} />
                    <div className="h-full bg-red-500" style={{ width: `${(redDays / (greenDays + redDays)) * 100}%` }} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Instruments */}
          <div>
            <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2 mb-6">
              <Crosshair size={16} className="text-pink-500" /> Favorite Instruments
            </h2>
            <div className="space-y-4">
              {topInstruments.length === 0 ? (
                <div className="text-zinc-500 text-sm text-center py-4">No data</div>
              ) : (
                topInstruments.map(([symbol, stats], idx) => {
                  const totalVolume = stats.profit + stats.loss;
                  const pPct = totalVolume > 0 ? (stats.profit / totalVolume) * 100 : 0;
                  const lPct = totalVolume > 0 ? (stats.loss / totalVolume) * 100 : 0;
                  const netProfit = stats.profit - stats.loss;
                  const winRateStr = stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(0) + '%' : '0%';

                  return (
                    <div key={symbol} className="bg-zinc-950/50 p-4 rounded-xl border border-black/10 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none group transition-colors hover:bg-zinc-900">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-emerald-500/80 bg-emerald-500/10 px-1.5 py-0.5 rounded tracking-widest">#{idx + 1}</span>
                            <span className="text-base font-bold text-white tracking-wide">{symbol}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-medium">
                            <span className="text-zinc-400 bg-white/5 px-2 py-0.5 rounded-md">{stats.total} Trades</span>
                            <span className="text-zinc-500">WR: <span className="text-zinc-300">{winRateStr}</span></span>
                          </div>
                        </div>
                        <div className={`text-sm font-bold tracking-tight px-2.5 py-1 rounded-md border ${netProfit >= 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                          {netProfit >= 0 ? "+" : "-"}{formatCurrency(Math.abs(netProfit), displayCurrency)}
                        </div>
                      </div>
                      
                      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden flex mb-2 mt-2 shadow-inner">
                        <div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] transition-all duration-500" style={{ width: `${pPct}%` }} />
                        <div className="h-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] transition-all duration-500" style={{ width: `${lPct}%` }} />
                      </div>
                      
                      <div className="flex justify-between text-[11px] font-semibold tracking-wide">
                        <span className="text-emerald-500">{formatCurrency(stats.profit, displayCurrency)} </span>
                        <span className="text-zinc-500 text-[10px] font-medium tracking-tight uppercase">Gross</span>
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

      {/* 7. Performance by Day of the Week */}
      <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none rounded-xl p-5 shadow-sm relative z-10 mt-6 lg:mt-6">
        <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2 mb-6">
          <Calendar size={16} className="text-blue-500" /> Performance by Day of the Week
        </h2>
        
        {normalizedTrades.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm h-[250px] italic bg-zinc-950/50 rounded-lg border border-black/10 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none">
            No data available yet. Start trading to see weekly performance.
          </div>
        ) : (
          <div className="w-full h-[300px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={weeklyData} margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value, displayCurrency)} />
                <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={12} fontFamily="monospace" tickLine={false} axisLine={false} width={40} />
                <RechartsTooltip 
                  cursor={{fill: '#27272a', opacity: 0.15}}
                  content={({ active, payload, label }) => {
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
                  }}
                />
                <Bar dataKey="pnl" minPointSize={2}>
                  {
                    weeklyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? "#10b981" : "#ef4444"} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
