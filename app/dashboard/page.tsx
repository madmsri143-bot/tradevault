"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trade, Currency } from "@/types";
import { useAuth } from "@/lib/AuthContext";

import TradeForm from "@/components/dashboard/TradeForm";
import MetricsCards from "@/components/dashboard/MetricsCards";

import AnalyticsTab from "@/components/dashboard/AnalyticsTab";
import HistoryTab from "@/components/dashboard/HistoryTab";
import { Calendar as CalendarIcon } from "lucide-react";

const Charts = dynamic(() => import("@/components/dashboard/Charts"), {
  ssr: false,
  loading: () => <div className="h-48 w-full animate-pulse bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none rounded-xl mb-6" />
});

const CalendarView = dynamic(() => import("@/components/dashboard/CalendarView"), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none rounded-xl mt-6" />
});

export default function DashboardPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [displayCurrency, setDisplayCurrency] = useState<Currency>("USD");
  const [loading, setLoading] = useState(true);

  // Tab & Date State
  const [activeTab, setActiveTab] = useState<"overview" | "calendar" | "analytics" | "history">("overview");
  const [dateRange, setDateRange] = useState<{from: string, to: string}>({from: "", to: ""});

  // Fetch Exchange Rates
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

  // Listen to Firestore Trades
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "trades"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedTrades: Trade[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Trade[];
        setTrades(fetchedTrades);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore listener error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Normalize Trades strictly for currency
  const normalizedTrades = useMemo(() => {
    return trades.map((trade) => {
      let normalizedPnl = trade.pnl;
      if (Object.keys(rates).length > 0) {
        const tradeRate = rates[trade.currency] || 1;
        const amountInUSD = trade.pnl / tradeRate;
        const displayRate = rates[displayCurrency] || 1;
        normalizedPnl = amountInUSD * displayRate;
      }
      return { ...trade, normalizedPnl };
    });
  }, [trades, rates, displayCurrency]);

  // Global Date Filtering
  const filteredTrades = useMemo(() => {
    return normalizedTrades.filter(t => {
      if (!dateRange.from && !dateRange.to) return true;
      const tDate = new Date(t.date);
      const fromD = dateRange.from ? new Date(dateRange.from) : null;
      const toD = dateRange.to ? new Date(dateRange.to) : null;
      
      if (toD) toD.setHours(23, 59, 59, 999);
      
      if (fromD && tDate < fromD) return false;
      if (toD && tDate > toD) return false;
      return true;
    });
  }, [normalizedTrades, dateRange]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#00FFB2]">Dashboard Overview</h2>
          <p className="text-sm text-zinc-400 mt-1">Track, analyze, and optimize your trading performance.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-2 rounded-lg">
          <span className="text-sm text-zinc-400 font-medium ml-2">Displaying in:</span>
          <select
            value={displayCurrency}
            onChange={(e) => setDisplayCurrency(e.target.value as Currency)}
            className="bg-zinc-950 border border-zinc-800 text-emerald-400 font-semibold rounded p-1.5 text-sm focus:border-emerald-500 focus:outline-none"
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="INR">INR (₹)</option>
          </select>
        </div>
      </div>

      {/* TABS & GLOBAL DATE FILTER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-zinc-900 border border-white/5 p-1 rounded-xl w-fit">
          {["overview", "calendar", "analytics", "history"].map(t => (
            <button 
              key={t}
              onClick={() => setActiveTab(t as any)}
              className={`px-5 py-2 text-sm font-bold rounded-lg capitalize transition-all ${
                activeTab === t ? 'bg-zinc-800 text-[#00FFB2] shadow-sm' : 'text-zinc-500 hover:text-white'
              }`}
            >
              {t === "history" ? "Trade History" : t}
            </button>
          ))}
        </div>

        {activeTab !== "calendar" && (
          <div className="flex items-center gap-3 bg-zinc-900 border border-white/5 p-2 rounded-xl">
            <CalendarIcon size={16} className="text-zinc-500 ml-1" />
            <input 
              type="date" 
              value={dateRange.from} 
              onChange={e => setDateRange({...dateRange, from: e.target.value})} 
              className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs px-2 py-1.5 rounded-md focus:outline-none focus:border-[#00FFB2]" 
            />
            <span className="text-zinc-500 text-xs font-medium">to</span>
            <input 
              type="date" 
              value={dateRange.to} 
              onChange={e => setDateRange({...dateRange, to: e.target.value})} 
              className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs px-2 py-1.5 rounded-md focus:outline-none focus:border-[#00FFB2]" 
            />
            {(dateRange.from || dateRange.to) && (
              <button onClick={() => setDateRange({from: "", to: ""})} className="text-xs text-zinc-400 hover:text-white px-2">Clear</button>
            )}
          </div>
        )}
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTab === "overview" && (
        <div className="animate-in fade-in duration-300 mt-6 space-y-6">
          {/* Top Section: Action & Metrics */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <div className="xl:col-span-1 border-white/5">
              <TradeForm />
            </div>
            <div className="xl:col-span-3">
              <MetricsCards trades={filteredTrades} displayCurrency={displayCurrency} />
            </div>
          </div>
          
          {/* Bottom Section: Charts */}
          <div className="w-full">
            <Charts trades={filteredTrades} displayCurrency={displayCurrency} />
          </div>
        </div>
      )}

      {activeTab === "calendar" && (
        <div className="animate-in fade-in duration-300 mt-6 pt-4 border-t border-white/5">
          <CalendarView trades={normalizedTrades} displayCurrency={displayCurrency} />
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="animate-in fade-in duration-300 mt-6 pt-4 border-t border-white/5">
          <AnalyticsTab trades={filteredTrades} displayCurrency={displayCurrency} />
        </div>
      )}

      {activeTab === "history" && (
        <div className="animate-in fade-in duration-300 mt-6 pt-4 border-t border-white/5">
          <HistoryTab trades={filteredTrades} displayCurrency={displayCurrency} />
        </div>
      )}

    </div>
  );
}
