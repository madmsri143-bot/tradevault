"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trade, Currency } from "@/types";
import { useAuth } from "@/lib/AuthContext";

import TradeForm from "@/components/dashboard/TradeForm";
import MetricsCards from "@/components/dashboard/MetricsCards";
import TradeList from "@/components/dashboard/TradeList";
import { TrialBanner } from "@/components/TrialGuard";

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

  // Normalize Trades
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <TrialBanner />
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard Overview</h1>
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

      <MetricsCards trades={normalizedTrades} displayCurrency={displayCurrency} />
      
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-1 border-white/5 order-last xl:order-first">
          <TradeForm />
        </div>
        <div className="xl:col-span-3 h-full">
          <Charts trades={normalizedTrades} displayCurrency={displayCurrency} />
          <CalendarView trades={normalizedTrades} displayCurrency={displayCurrency} />
        </div>
      </div>

      <div className="mt-6 border-white/5">
        <TradeList trades={normalizedTrades} displayCurrency={displayCurrency} />
      </div>

    </div>
  );
}
