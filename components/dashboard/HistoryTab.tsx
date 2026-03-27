"use client";

import { Trade, Currency } from "@/types";
import TradeList from "./TradeList";
import { BookText } from "lucide-react";

interface HistoryTabProps {
  trades: Trade[];
  displayCurrency: Currency;
}

export default function HistoryTab({ trades, displayCurrency }: HistoryTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 mt-6">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <BookText className="text-emerald-500" /> Trade History
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Review your filtered trades.</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-black/10 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-5 rounded-2xl w-full xl:col-span-3">
        <TradeList trades={trades} displayCurrency={displayCurrency} />
      </div>

    </div>
  );
}
