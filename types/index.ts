export type Currency = "USD" | "INR" | "EUR";

export interface Trade {
  id?: string;
  symbol: string;
  type: "buy" | "sell";
  result?: "Profit" | "Loss";
  pnl: number;
  lot: number;
  currency: Currency;
  note: string;
  date: number; // Storing as Unix timestamp (milliseconds) for easier serialization/sorting
  normalizedPnl?: number; // PnL converted to the user's base currency
  entryPrice?: number;
  exitPrice?: number;
  risk?: number;
  stopLossFollowed?: boolean;
}

export interface JournalEntry {
  id?: string;
  date: number; // Unix timestamp
  text: string;
  imageUrl?: string;
}

export interface ExchangeRates {
  [key: string]: number;
}

export type TargetType = "daily" | "monthly" | "custom";

export interface TradingTarget {
  id?: string;
  type: TargetType;
  targetValue: number;
  startDate: number; // Unix timestamp
  endDate: number; // Unix timestamp
  createdAt: number;
}
