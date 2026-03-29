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
          <h1 className="text-3xl font-bold tracking-tight text-[#EAEAEA] flex items-center gap-3">
            <BookText className="text-emerald-500" /> Trade History
          </h1>
          <p className="text-sm text-[#A0A0A0] mt-1">Review your filtered trades.</p>
        </div>
      </div>

      <div className="bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border border-[rgba(212,175,55,0.15)] shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)] p-5 rounded-2xl w-full xl:col-span-3">
        <TradeList trades={trades} displayCurrency={displayCurrency} />
      </div>

    </div>
  );
}
