"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Trade, Currency } from "@/types";
import { Lock, ArrowLeft, Calendar as CalendarIcon } from "lucide-react";

import MetricsCards from "@/components/dashboard/MetricsCards";
import TradeList from "@/components/dashboard/TradeList";

const Charts = dynamic(() => import("@/components/dashboard/Charts"), { ssr: false });
const CalendarView = dynamic(() => import("@/components/dashboard/CalendarView"), { ssr: false });
const AnalyticsTab = dynamic(() => import("@/components/dashboard/AnalyticsTab"), { ssr: false });
const HistoryTab = dynamic(() => import("@/components/dashboard/HistoryTab"), { ssr: false });

type TabType = "overview" | "calendar" | "analytics" | "history";

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
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background max-w-full">
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        
        {/* Sticky Demo Banner */}
        <div className="bg-[#C9A646]/20 border border-[#C9A646]/40 text-[#C9A646] px-4 py-3 rounded-xl mb-6 flex flex-col sm:flex-row items-center justify-between text-sm font-bold animate-pulse">
           <div className="flex items-center gap-2">
             <Link href="/" className="px-2 py-1 bg-black/40 hover:bg-black/80 rounded transition-colors text-[#E5E7EB] mr-2"><ArrowLeft size={16}/></Link>
             🚀 Demo Mode - You are viewing read-only sample data.
           </div>
           <Link href="/signup" className="mt-2 sm:mt-0 px-4 py-1.5 bg-[#C9A646] text-black rounded-lg hover:bg-white transition-colors">
              Sign up to track your own trades
           </Link>
        </div>

        {/* Header and Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#111827] pb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#C9A646]">Dashboard Overview</h2>
            <p className="text-sm text-[#9CA3AF] mt-1">Track, analyze, and optimize your trading performance.</p>
          </div>
          
          <div className="flex items-center gap-2 bg-[#111827] border border-black/10 dark:border-[#111827] shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-2 rounded-lg">
            <span className="text-sm text-[#9CA3AF] font-medium ml-2">Displaying in:</span>
            <select
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(e.target.value as Currency)}
              className="bg-[#1F2937] border border-zinc-800 text-amber-400 font-semibold rounded p-1.5 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="INR">INR (₹)</option>
            </select>
          </div>
        </div>

        {/* TABS & GLOBAL DATE FILTER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 mt-6">
          <div className="flex items-center gap-1 bg-[#111827] border border-[#111827] p-1 rounded-xl w-fit">
            {(["overview", "calendar", "analytics", "history"] as TabType[]).map(t => (
              <button 
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-5 py-2 text-sm font-bold rounded-lg capitalize transition-all ${
                  activeTab === t ? 'bg-zinc-800 text-[#C9A646] shadow-sm' : 'text-[#9CA3AF] hover:text-[#E5E7EB]'
                }`}
              >
                {t === "history" ? "Trade History" : t}
              </button>
            ))}
          </div>

          {activeTab !== "calendar" && (
            <div className="flex items-center gap-3 bg-[#111827] border border-[#111827] p-2 rounded-xl pointer-events-none opacity-50">
              <CalendarIcon size={16} className="text-[#9CA3AF] ml-1" />
              <input type="date" value="" readOnly className="bg-[#1F2937] border border-zinc-800 text-[#E5E7EB] text-xs px-2 py-1.5 rounded-md focus:outline-none" />
              <span className="text-[#9CA3AF] text-xs font-medium">to</span>
              <input type="date" value="" readOnly className="bg-[#1F2937] border border-zinc-800 text-[#E5E7EB] text-xs px-2 py-1.5 rounded-md focus:outline-none" />
            </div>
          )}
        </div>

        {/* ACTIVE TAB RENDER */}
        {activeTab === "overview" && (
          <div className="animate-in fade-in zoom-in-95 duration-300 relative">
            
            {/* Add Trade Button Line */}
            <div className="mb-6 w-full flex justify-start">
                <button 
                  className="bg-emerald-500 text-black p-4 rounded-full shadow-[0_4px_20px_rgba(16,185,129,0.4)] flex items-center justify-center relative z-20 cursor-not-allowed opacity-80 group hover:scale-[1.02] transition-transform"
                >
                  <span className="font-bold text-xl">+</span>
                  <span className="absolute left-full ml-4 bg-zinc-800/90 backdrop-blur-md text-[#E5E7EB] text-sm font-bold px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 whitespace-nowrap shadow-xl border border-[#111827] transition-opacity">
                    Add Trade (Demo Mode)
                  </span>
                </button>
            </div>

            <div className="flex flex-col gap-8 pointer-events-none">
              
              {/* TOP SECTION: KPI Cards */}
              <div className="w-full focus-within:none">
                <MetricsCards trades={mockTrades} displayCurrency={displayCurrency} />
              </div>

              {/* MIDDLE & BOTTOM SECTION: Charts */}
              <div className="w-full relative">
                <Charts trades={mockTrades} displayCurrency={displayCurrency} />
              </div>

            </div>
          </div>
        )}

        {activeTab === "calendar" && (
          <div className="animate-in fade-in duration-300 pt-4 border-t border-[#111827] pointer-events-none">
            <CalendarView trades={mockTrades} displayCurrency={displayCurrency} />
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="animate-in fade-in duration-300 pt-4 border-t border-[#111827] pointer-events-none">
            <AnalyticsTab trades={mockTrades} displayCurrency={displayCurrency} />
          </div>
        )}

        {activeTab === "history" && (
          <div className="animate-in fade-in duration-300 pt-4 border-t border-[#111827] relative">
             <div className="absolute inset-0 z-10 pointer-events-auto cursor-not-allowed"></div>
             <HistoryTab trades={mockTrades} displayCurrency={displayCurrency} />
          </div>
        )}

      </main>
    </div>
  );
}
