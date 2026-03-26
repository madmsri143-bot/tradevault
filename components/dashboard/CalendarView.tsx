"use client";

import { useState } from "react";
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
} from "date-fns";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatCurrency } from "@/lib/utils";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function CalendarView({ trades, displayCurrency = "USD" }: { trades: Trade[], displayCurrency?: string }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get weekday of the first day to offset the grid (0 = Sunday, 1 = Monday, etc.)
  const startOffset = monthStart.getDay();
  // Array of blanks to pad the start of the calendar
  const paddingDays = Array.from({ length: startOffset }, (_, i) => i);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const getTradesForDay = (date: Date) => {
    return trades.filter((t) => isSameDay(new Date(t.date), date));
  };

  const getDayPnL = (dayTrades: Trade[]) => {
    return dayTrades.reduce((acc, t) => acc + (t.normalizedPnl || 0), 0);
  };

  const selectedTrades = selectedDate ? getTradesForDay(selectedDate) : [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
      <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-4 rounded-xl xl:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={prevMonth}
              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={nextMonth}
              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-zinc-500 py-2"
            >
              {day}
            </div>
          ))}

          {paddingDays.map((_, idx) => (
            <div key={`padding-${idx}`} className="h-16 rounded bg-zinc-950/30" />
          ))}

          {daysInMonth.map((day, idx) => {
            const dayTrades = getTradesForDay(day);
            const pnl = getDayPnL(dayTrades);
            const hasTrades = dayTrades.length > 0;
            const isProfit = pnl >= 0;

            let bgColor = "bg-zinc-950";
            if (hasTrades) {
              bgColor = isProfit ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20";
            }

            const isSelected = selectedDate && isSameDay(selectedDate, day);

            return (
              <div
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "h-16 flex flex-col items-center justify-center rounded border border-black/10 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none cursor-pointer transition-all hover:bg-zinc-800 group relative",
                  bgColor,
                  isSelected && "ring-2 ring-emerald-500",
                  !isSameMonth(day, currentDate) && "opacity-50"
                )}
              >
                <span
                  className={cn(
                    "text-sm",
                    isToday(day) ? "font-bold text-emerald-400" : "text-zinc-300"
                  )}
                >
                  {format(day, "d")}
                </span>
                {hasTrades && (
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isProfit ? "text-emerald-400" : "text-red-400"
                    )}
                  >
                    {formatCurrency(Math.abs(pnl), displayCurrency)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details */}
      <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-4 flex flex-col rounded-xl h-[400px] xl:h-auto overflow-hidden">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="text-md font-semibold text-emerald-400">
            {selectedDate
              ? format(selectedDate, "MMM do, yyyy")
              : "Select a day"}
          </h3>
          {selectedDate && (
            <button
              onClick={() => setSelectedDate(null)}
              className="p-1 text-zinc-400 hover:text-white rounded"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
          {!selectedDate ? (
            <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
              Click a date to view trades
            </div>
          ) : selectedTrades.length === 0 ? (
            <div className="text-center text-zinc-500 text-sm mt-10">
              No trades on this day.
            </div>
          ) : (
            selectedTrades.map((trade, idx) => (
              <div key={trade.id || idx} className="bg-zinc-950 border border-black/10 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-3 rounded-lg flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white text-sm">{trade.symbol}</span>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded",
                    trade.type === 'buy' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                  )}>
                    {trade.type.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Lot: {trade.lot}</span>
                  <span className={cn(
                    "font-medium",
                    (trade.normalizedPnl || 0) >= 0 ? "text-emerald-400" : "text-red-400"
                  )}>
                    {formatCurrency(Math.abs(trade.normalizedPnl || trade.pnl), displayCurrency)}
                  </span>
                </div>
                {trade.note && (
                  <p className="text-xs text-zinc-500 italic mt-1 border-t border-white/5 pt-1">
                    "{trade.note}"
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
