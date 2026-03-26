"use client";

import { useState, useEffect } from "react";
import { Calculator as CalcIcon, DollarSign, Activity, Percent, Maximize2 } from "lucide-react";

// -----------------------------------------------------------------
// CONSTANTS & HELPERS
// -----------------------------------------------------------------

const INSTRUMENT_PAIRS: Record<string, string[]> = {
  forex: ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCHF", "USDCAD"],
  crypto: ["BTCUSD", "ETHUSD", "XRPUSD", "LTCUSD"],
  index: ["US30", "SPX500", "NAS100", "GER30", "UK100"],
  indian: ["NIFTY", "BANKNIFTY", "FINNIFTY", "SENSEX"],
  commodities: ["XAUUSD", "XAGUSD", "XPTUSD"]
};

const getMultiplier = (category: string, pair: string) => {
  if (category === "forex") {
    return pair.includes("JPY") ? 100 : 10000;
  }
  if (category === "commodities") {
    if (pair === "XAUUSD") return 100;
    if (pair === "XAGUSD") return 50;
    if (pair === "XPTUSD") return 100;
    return 100;
  }
  return 1;
};

const getUnitName = (category: string) => {
  switch (category) {
    case "forex": return "Pips";
    case "index": return "Points";
    case "indian": return "Points";
    case "crypto": return "Price Difference";
    case "commodities": return "Price Move";
    default: return "Points";
  }
};

function formatMoney(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

const getPipValueUSD = (pair: string, price: number) => {
  if (pair.endsWith("USD") || !price || isNaN(price)) return 10;
  if (pair.startsWith("USD")) {
      if (pair.includes("JPY")) return 1000 / price;
      return 10 / price;
  }
  if (pair.endsWith("JPY")) return 1000 / price;
  return 10;
};

// -----------------------------------------------------------------
// MAIN PAGE EXTENT
// -----------------------------------------------------------------

export default function CalculatorPage() {
  const [activeTab, setActiveTab] = useState("pnl");

  const tabs = [
    { id: "pnl", label: "Profit/Loss", icon: <DollarSign size={16} /> },
    { id: "lot", label: "Lot Size", icon: <Maximize2 size={16} /> },
    { id: "pip", label: "Pip/Point Value", icon: <Activity size={16} /> },
    { id: "combined", label: "Combined", icon: <Percent size={16} /> },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <CalcIcon className="text-emerald-500" />
          Trading Calculators
        </h1>
        <p className="text-sm text-zinc-400 mt-1">Manage risk, calculate position sizing, and estimate your profits across multiple markets.</p>
      </div>

      <div className="flex overflow-x-auto border-b border-white/10 pb-px hide-scrollbar gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === t.id
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-zinc-400 hover:text-white hover:border-zinc-700"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-6 rounded-xl">
        {activeTab === "pnl" && <PnLCalculator />}
        {activeTab === "lot" && <LotSizeCalculator />}
        {activeTab === "pip" && <PipValueCalculator />}
        {activeTab === "combined" && <CombinedCalculator />}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------
// COMPONENTS
// -----------------------------------------------------------------

function PnLCalculator() {
  const [instrument, setInstrument] = useState("forex");
  const [pair, setPair] = useState(INSTRUMENT_PAIRS["forex"][0]);
  const [type, setType] = useState("buy");
  const [entry, setEntry] = useState("");
  const [exit, setExit] = useState("");
  const [lot, setLot] = useState("");

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCat = e.target.value;
    setInstrument(newCat);
    setPair(INSTRUMENT_PAIRS[newCat][0]);
  };

  const calculate = () => {
    const e = parseFloat(entry);
    const x = parseFloat(exit);
    const l = parseFloat(lot);
    
    if (isNaN(e) || isNaN(x) || isNaN(l)) return null;
    
    if (l <= 0) {
      return { pnl: 0, diffAmount: 0, error: true, message: "Lot must be positive" };
    }
    
    const move = type === "buy" ? (x - e) : (e - x);
    let pnl = 0;
    let diffAmount = move;

    if (instrument === "forex") {
        const multiplier = getMultiplier("forex", pair); 
        const pips = move * multiplier;
        diffAmount = pips;
        const pipValue = getPipValueUSD(pair, x);
        pnl = pips * l * pipValue;
    } else {
        const multiplier = getMultiplier(instrument, pair);
        diffAmount = move;
        pnl = move * l * multiplier;
    }
    return { pnl, diffAmount, error: false, message: "" };
  };

  const result = calculate();

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
      <h2 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
        <DollarSign size={18} /> Profit / Loss Calculator
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Instrument Category</label>
          <select value={instrument} onChange={handleCategoryChange} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none">
            <option value="forex">Forex</option>
            <option value="crypto">Crypto</option>
            <option value="index">Indices / Stocks</option>
            <option value="indian">Indian Market</option>
            <option value="commodities">Commodities</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Select Pair / Instrument</label>
          <select value={pair} onChange={e => setPair(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none">
            {INSTRUMENT_PAIRS[instrument].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Trade Type</label>
          <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none">
            <option value="buy">Buy (Long)</option>
            <option value="sell">Sell (Short)</option>
          </select>
        </div>
        <div className="hidden md:block"></div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Entry Price</label>
          <input type="number" step="any" value={entry} onChange={e => setEntry(e.target.value)} placeholder="e.g. 1.0500" className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Exit Price</label>
          <input type="number" step="any" value={exit} onChange={e => setExit(e.target.value)} placeholder="e.g. 1.0550" className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Lot Size / Quantity</label>
          <input type="number" step="any" value={lot} onChange={e => setLot(e.target.value)} placeholder="e.g. 1.0" className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none" />
        </div>
      </div>

      {result && result.error && (
        <div className="p-4 rounded-lg border bg-red-500/10 border-red-500/20 text-red-500 font-medium">
          {result.message}
        </div>
      )}

      {result && !result.error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border bg-zinc-950 border-white/5">
             <div className="text-sm font-medium text-zinc-400 mb-1">{getUnitName(instrument)} Output</div>
             <div className={`text-2xl font-bold flex items-baseline gap-1.5 ${result.diffAmount >= 0 ? "text-emerald-500" : "text-red-500"}`}>
               {result.diffAmount >= 0 ? "+" : ""}
               {result.diffAmount.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 5 })}
               <span className="text-sm opacity-70 font-semibold">{getUnitName(instrument).toLowerCase()}</span>
             </div>
          </div>
          <div className={`p-4 rounded-lg border flex flex-col justify-center ${result.pnl >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}`}>
            <div className="text-sm font-medium text-zinc-400 mb-1">{result.pnl >= 0 ? "Profit" : "Loss"}</div>
            <div className={`text-3xl font-bold ${result.pnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {result.pnl >= 0 ? "+" : ""}{formatMoney(result.pnl)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LotSizeCalculator() {
  const [instrument, setInstrument] = useState("forex");
  const [pair, setPair] = useState(INSTRUMENT_PAIRS["forex"][0]);
  const [balance, setBalance] = useState("");
  const [riskPct, setRiskPct] = useState("");
  const [entry, setEntry] = useState("");
  const [sl, setSl] = useState("");

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCat = e.target.value;
    setInstrument(newCat);
    setPair(INSTRUMENT_PAIRS[newCat][0]);
  };

  const calculate = () => {
    const bal = parseFloat(balance);
    const risk = parseFloat(riskPct);
    const e = parseFloat(entry);
    const s = parseFloat(sl);
    if (isNaN(bal) || isNaN(risk) || isNaN(e) || isNaN(s)) return null;

    const riskAmount = bal * (risk / 100);
    const move = Math.abs(e - s);
    if (move === 0) return null;

    let lot = 0;
    if (instrument === "forex") {
        const multiplier = getMultiplier("forex", pair);
        const pips = move * multiplier;
        const pipValue = getPipValueUSD(pair, e);
        lot = riskAmount / (pips * pipValue);
    } else {
        const multiplier = getMultiplier(instrument, pair);
        lot = riskAmount / (move * multiplier);
    }

    if (lot <= 0 || !isFinite(lot)) return null;

    return { riskAmount, lot };
  };

  const result = calculate();

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
      <h2 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
        <Maximize2 size={18} /> Lot Size Calculator
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Instrument Category</label>
          <select value={instrument} onChange={handleCategoryChange} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none">
            <option value="forex">Forex</option>
            <option value="crypto">Crypto</option>
            <option value="index">Indices / Stocks</option>
            <option value="indian">Indian Market</option>
            <option value="commodities">Commodities</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Select Pair / Instrument</label>
          <select value={pair} onChange={e => setPair(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none">
            {INSTRUMENT_PAIRS[instrument].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Account Balance ($)</label>
          <input type="number" step="any" value={balance} onChange={e => setBalance(e.target.value)} placeholder="e.g. 10000" className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Risk Percentage (%)</label>
          <input type="number" step="any" value={riskPct} onChange={e => setRiskPct(e.target.value)} placeholder="e.g. 1" className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Entry Price</label>
          <input type="number" step="any" value={entry} onChange={e => setEntry(e.target.value)} placeholder="e.g. 1.0500" className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Stop Loss Price</label>
          <input type="number" step="any" value={sl} onChange={e => setSl(e.target.value)} placeholder="e.g. 1.0450" className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none" />
        </div>
      </div>

      {result !== null && (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border bg-zinc-950 border-white/5">
            <div className="text-sm font-medium text-zinc-400 mb-1">Risk Amount</div>
            <div className="text-2xl font-bold text-white">{formatMoney(result.riskAmount)}</div>
          </div>
          <div className="p-4 rounded-lg border bg-emerald-500/10 border-emerald-500/20">
            <div className="text-sm font-medium text-emerald-500/70 mb-1">Suggested Lot Size</div>
            <div className="text-2xl font-bold text-emerald-400">{result.lot.toFixed(4)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function PipValueCalculator() {
  const [instrument, setInstrument] = useState("forex");
  const [pair, setPair] = useState(INSTRUMENT_PAIRS["forex"][0]);
  const [lot, setLot] = useState("");
  const [entry, setEntry] = useState("");
  const [exit, setExit] = useState("");

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCat = e.target.value;
    setInstrument(newCat);
    setPair(INSTRUMENT_PAIRS[newCat][0]);
  };

  const calculate = () => {
    const l = parseFloat(lot);
    const e = parseFloat(entry);
    const x = parseFloat(exit);

    if (isNaN(l) || isNaN(e) || isNaN(x)) return null;
    if (l <= 0) return { error: true, message: "Lot size must be positive", pips: 0, profit: 0 };

    const rawDiff = Math.abs(x - e);
    let pips = 0;
    let profit = 0;

    if (instrument === "forex") {
        const multiplier = getMultiplier("forex", pair);
        pips = rawDiff * multiplier;
        const pipValue = getPipValueUSD(pair, x);
        profit = pips * l * pipValue;
    } else {
        const multiplier = getMultiplier(instrument, pair);
        pips = rawDiff; 
        profit = rawDiff * l * multiplier;
    }

    return { pips, profit, error: false, message: "" };
  };

  const result = calculate();
  const unitName = getUnitName(instrument);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
      <h2 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
        <Activity size={18} /> {unitName} Value Calculator
      </h2>

      {result && result.error && (
        <div className="p-4 rounded-lg border bg-red-500/10 border-red-500/20 text-red-500 font-medium text-sm">
          {result.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Instrument Category</label>
          <select value={instrument} onChange={handleCategoryChange} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none">
            <option value="forex">Forex</option>
            <option value="crypto">Crypto</option>
            <option value="index">Indices / Stocks</option>
            <option value="indian">Indian Market</option>
            <option value="commodities">Commodities</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Select Pair / Instrument</label>
          <select value={pair} onChange={e => setPair(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none">
            {INSTRUMENT_PAIRS[instrument].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-zinc-400 mb-1">Lot Size / Quantity</label>
          <input type="number" step="any" value={lot} onChange={e => setLot(e.target.value)} placeholder="e.g. 1.0" className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Entry Price</label>
          <input type="number" step="any" value={entry} onChange={e => setEntry(e.target.value)} placeholder="e.g. 1.0500" className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Exit Price</label>
          <input type="number" step="any" value={exit} onChange={e => setExit(e.target.value)} placeholder="e.g. 1.0550" className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none" />
        </div>
      </div>

      {result && !result.error && (
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="p-4 rounded-lg border bg-zinc-950 border-white/5">
            <div className="text-sm font-medium text-zinc-400 mb-1">{unitName} Movement</div>
            <div className="text-2xl font-bold text-emerald-400">
              {result.pips.toFixed(1)} <span className="text-base text-emerald-500/70 font-semibold">{unitName.toLowerCase()}</span>
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-emerald-500/10 border-emerald-500/20">
            <div className="text-sm font-medium text-zinc-400 mb-1">Absolute Profit / Loss Value ($)</div>
            <div className="text-3xl font-bold text-emerald-500">{formatMoney(result.profit)}</div>
          </div>
        </div>
      )}
      <p className="text-xs text-zinc-500">Measures the explicit absolute monetary value of the distance between two price points given your lot size.</p>
    </div>
  );
}

function CombinedCalculator() {
  const [instrument, setInstrument] = useState("forex");
  const [pair, setPair] = useState(INSTRUMENT_PAIRS["forex"][0]);
  const [balance, setBalance] = useState("");
  const [riskPct, setRiskPct] = useState("");
  const [lot, setLot] = useState("");
  const [type, setType] = useState("buy");
  const [entry, setEntry] = useState("");
  const [exit, setExit] = useState("");
  const [sl, setSl] = useState("");

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCat = e.target.value;
    setInstrument(newCat);
    setPair(INSTRUMENT_PAIRS[newCat][0]);
  };

  const calculate = () => {
    const bal = parseFloat(balance);
    const risk = parseFloat(riskPct);
    const l = parseFloat(lot);
    const e = parseFloat(entry);
    const x = parseFloat(exit);
    const s = parseFloat(sl);

    if (isNaN(l) || isNaN(e) || isNaN(x)) return null;
    if (l <= 0) return { error: true, message: "Lot size must be positive", pnl: 0, unitGained: 0, riskAmount: 0, rr: 0 };

    const move = type === "buy" ? (x - e) : (e - x);
    let pnl = 0;
    let unitGained = move;
    let riskAmount = 0;

    if (instrument === "forex") {
        const multiplier = getMultiplier("forex", pair);
        const pips = move * multiplier;
        unitGained = pips;
        const pipValExit = getPipValueUSD(pair, x);
        pnl = pips * l * pipValExit;
        
        if (!isNaN(bal) && !isNaN(risk)) {
            riskAmount = bal * (risk / 100);
        } else if (!isNaN(s)) {
            const riskMove = type === "buy" ? (e - s) : (s - e);
            const riskPips = riskMove * multiplier;
            const pipValEntry = getPipValueUSD(pair, e);
            riskAmount = Math.abs(riskPips * l * pipValEntry);
        }
    } else {
        const multiplier = getMultiplier(instrument, pair);
        unitGained = move;
        pnl = move * l * multiplier;
        
        if (!isNaN(bal) && !isNaN(risk)) {
            riskAmount = bal * (risk / 100);
        } else if (!isNaN(s)) {
            const riskMove = type === "buy" ? (e - s) : (s - e);
            riskAmount = Math.abs(riskMove * l * multiplier);
        }
    }

    let rr = 0;
    if (riskAmount > 0 && pnl > 0) {
      rr = pnl / riskAmount;
    }

    return { pnl, unitGained, riskAmount, rr, error: false, message: "" };
  };

  const result = calculate();

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
      <h2 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
        <Percent size={18} /> Advanced Combined Calculator
      </h2>

      {result && result.error && (
        <div className="p-4 rounded-lg border bg-red-500/10 border-red-500/20 text-red-500 font-medium text-sm">
          {result.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs text-zinc-400 mb-1">Category & Type</label>
          <div className="flex gap-2">
            <select value={instrument} onChange={handleCategoryChange} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none">
                <option value="forex">Forex</option>
                <option value="crypto">Crypto</option>
                <option value="index">Indices / Stocks</option>
                <option value="indian">Indian Market</option>
                <option value="commodities">Commodities</option>
            </select>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none">
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-zinc-400 mb-1">Select Pair / Instrument</label>
          <select value={pair} onChange={e => setPair(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none">
            {INSTRUMENT_PAIRS[instrument].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Lot Size</label>
          <input type="number" step="any" value={lot} onChange={e => setLot(e.target.value)} placeholder="0.1" className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Account Balance (Opt)</label>
          <input type="number" step="any" value={balance} onChange={e => setBalance(e.target.value)} placeholder="10000" className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none" />
        </div>
        
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Risk % (Opt)</label>
          <input type="number" step="any" value={riskPct} onChange={e => setRiskPct(e.target.value)} placeholder="1" className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none" />
        </div>
        <div className="hidden md:block"></div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Entry Price</label>
          <input type="number" step="any" value={entry} onChange={e => setEntry(e.target.value)} placeholder="1.0500" className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Exit / Target Price</label>
          <input type="number" step="any" value={exit} onChange={e => setExit(e.target.value)} placeholder="1.0550" className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Stop Loss Price</label>
          <input type="number" step="any" value={sl} onChange={e => setSl(e.target.value)} placeholder="1.0450" className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm focus:border-emerald-500 focus:outline-none" />
        </div>
      </div>

      {result && !result.error && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="p-4 rounded-lg border bg-zinc-950 border-white/5">
            <div className="text-sm font-medium text-zinc-400 mb-1">Est PnL</div>
            <div className={`text-xl font-bold ${result.pnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {result.pnl >= 0 ? "+" : ""}{formatMoney(result.pnl)}
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-zinc-950 border-white/5">
            <div className="text-sm font-medium text-zinc-400 mb-1">{getUnitName(instrument)} Gained</div>
            <div className={`text-xl font-bold flex items-baseline gap-1.5 ${result.unitGained >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {result.unitGained.toFixed(2)}
              <span className="text-sm opacity-70 font-semibold">{getUnitName(instrument).toLowerCase()}</span>
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-zinc-950 border-white/5">
            <div className="text-sm font-medium text-zinc-400 mb-1">Risk Amount</div>
            <div className="text-xl font-bold text-white">{formatMoney(result.riskAmount)}</div>
          </div>
          <div className="p-4 rounded-lg border bg-zinc-950 border-white/5">
            <div className="text-sm font-medium text-zinc-400 mb-1">Reward Ratio</div>
            <div className="text-xl font-bold text-blue-400">{result.rr > 0 ? `1 : ${result.rr.toFixed(2)}` : "-"}</div>
          </div>
        </div>
      )}
    </div>
  );
}
