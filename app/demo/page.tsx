"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Trade, Currency } from "@/types";
import { Lock } from "lucide-react";
import MetricsCards from "@/components/dashboard/MetricsCards";
import TradeList from "@/components/dashboard/TradeList";

const Charts = dynamic(() => import("@/components/dashboard/Charts"), { ssr: false });
const CalendarView = dynamic(() => import("@/components/dashboard/CalendarView"), { ssr: false });

// Generate plausible mock data for the demo
const now = Date.now();
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const mockTrades: Trade[] = [
  { id: "demo1", date: now - (1 * MS_PER_DAY), symbol: "EUR/USD", type: "buy", result: "Profit", entryPrice: 1.0850, exitPrice: 1.0880, lot: 1, pnl: 295, note: "Clean structural break", currency: "USD", normalizedPnl: 295 },
  { id: "demo2", date: now - (2 * MS_PER_DAY), symbol: "GBP/JPY", type: "sell", result: "Loss", entryPrice: 189.50, exitPrice: 189.90, lot: 2, pnl: -410, note: "Entered too early", currency: "USD", normalizedPnl: -410 },
  { id: "demo3", date: now - (4 * MS_PER_DAY), symbol: "XAU/USD", type: "buy", result: "Profit", entryPrice: 2020.50, exitPrice: 2028.00, lot: 0.5, pnl: 375, note: "Held to target", currency: "USD", normalizedPnl: 375 },
  { id: "demo4", date: now - (6 * MS_PER_DAY), symbol: "BTC/USD", type: "buy", result: "Profit", entryPrice: 42000, exitPrice: 42800, lot: 0.1, pnl: 65, note: "Standard volume spike", currency: "USD", normalizedPnl: 65 },
  { id: "demo5", date: now - (8 * MS_PER_DAY), symbol: "USD/JPY", type: "sell", result: "Profit", entryPrice: 148.20, exitPrice: 148.05, lot: 3, pnl: 442, note: "Quick in and out", currency: "USD", normalizedPnl: 442 },
];

export default function DemoPage() {
  const [displayCurrency, setDisplayCurrency] = useState<Currency>("USD");

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background max-w-full">
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        
        {/* Sticky Demo Banner */}
        <div className="bg-[#00FFB2]/20 border border-[#00FFB2]/40 text-[#00FFB2] px-4 py-3 rounded-xl mb-6 flex flex-col sm:flex-row items-center justify-between text-sm font-bold animate-pulse">
           <div>🚀 Demo Mode - You are viewing read-only sample data.</div>
           <Link href="/signup" className="mt-2 sm:mt-0 px-4 py-1.5 bg-[#00FFB2] text-black rounded-lg hover:bg-white transition-colors">
              Sign up to track your own trades
           </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard Overview</h1>
            <p className="text-sm text-zinc-400 mt-1">Track, analyze, and optimize your trading performance.</p>
          </div>
          
          <div className="flex items-center gap-2 bg-zinc-900 border border-white/5 p-2 rounded-lg">
            <span className="text-sm text-zinc-400 font-medium ml-2">Displaying in:</span>
            <select
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(e.target.value as Currency)}
              className="bg-zinc-950 border border-zinc-800 text-emerald-400 font-semibold rounded p-1.5 text-sm"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
        </div>

        <div className="mt-6 pointer-events-none">
           <MetricsCards trades={mockTrades} displayCurrency={displayCurrency} />
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mt-6">
          <div className="xl:col-span-1 border-white/5 order-last xl:order-first relative">
            {/* Visual lock overlay for Trade Form in demo mode */}
            <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-[2px] rounded-2xl border border-white/10 flex flex-col items-center justify-center p-6 text-center">
               <Lock className="text-zinc-500 mb-3" size={32} />
               <h3 className="text-zinc-300 font-bold">Input Disabled</h3>
               <p className="text-zinc-500 text-xs mt-1">Sign up to log your actual trades.</p>
            </div>
            <div className="h-[600px] w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 overflow-hidden blur-sm">
               {/* Faux Form Visuals */}
               <div className="space-y-4 opacity-50"><div className="h-10 bg-white/5 rounded"/><div className="h-10 bg-white/5 rounded"/><div className="h-10 bg-white/5 rounded"/></div>
            </div>
          </div>
          
          <div className="xl:col-span-3 h-full space-y-6 pointer-events-none">
            <Charts trades={mockTrades} displayCurrency={displayCurrency} />
            <CalendarView trades={mockTrades} displayCurrency={displayCurrency} />
          </div>
        </div>

        <div className="mt-6 border-white/5 relative">
          <div className="absolute inset-0 z-10 pointer-events-auto cursor-not-allowed"></div>
          <TradeList trades={mockTrades} displayCurrency={displayCurrency} />
        </div>

      </main>
    </div>
  );
}
