"use client";

import { useState, useEffect } from "react";
import { Calculator as CalcIcon, DollarSign, Activity, Percent, Maximize2, ChevronDown } from "lucide-react";

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
// SHARED UI COMPONENTS
// -----------------------------------------------------------------

function FloatingInput({ label, value, onChange, type = "number", placeholder = " ", step = "any" }: any) {
  return (
    <div className="relative group">
      <input 
        type={type} step={step} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        id={`input-${label.replace(/[\s/()]+/g, '-')}`}
        className="peer w-full bg-[#0B0F14]/50 border border-white/5 rounded-xl px-4 pt-6 pb-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all hover:bg-white/5 shadow-inner" 
      />
      <label 
        htmlFor={`input-${label.replace(/[\s/()]+/g, '-')}`}
        className="absolute left-4 top-4 text-xs font-bold uppercase tracking-widest text-zinc-500 transition-all duration-200 peer-focus:-translate-y-2.5 peer-focus:text-[10px] peer-focus:text-amber-400 peer-[:not(:placeholder-shown)]:-translate-y-2.5 peer-[:not(:placeholder-shown)]:text-[10px] pointer-events-none"
      >
        {label}
      </label>
    </div>
  );
}

function FloatingSelect({ label, value, onChange, options }: any) {
  return (
    <div className="relative group">
      <select 
        value={value} onChange={onChange}
        id={`select-${label.replace(/[\s/()]+/g, '-')}`}
        className="peer w-full bg-[#0B0F14]/50 border border-white/5 rounded-xl px-4 pt-6 pb-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all hover:bg-white/5 appearance-none shadow-inner" 
      >
        {options.map((opt: any) => (
          <option key={opt.value || opt} value={opt.value || opt} className="bg-zinc-900">{opt.label || opt}</option>
        ))}
      </select>
      <label 
        htmlFor={`select-${label.replace(/[\s/()]+/g, '-')}`}
        className="absolute left-4 top-4 text-[10px] -translate-y-2.5 font-bold uppercase tracking-widest text-zinc-500 transition-all duration-200 peer-focus:text-amber-400 pointer-events-none"
      >
        {label}
      </label>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 group-hover:text-amber-400 transition-colors">
        <ChevronDown size={14} />
      </div>
    </div>
  );
}

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
    <div className="space-y-8 animate-in fade-in duration-700 max-w-5xl mx-auto pb-20 mt-4 px-4 sm:px-0">
      <div className="text-center sm:text-left flex flex-col sm:flex-row items-center gap-6 mb-8 border-b border-white/5 pb-6 group">
        <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)] group-hover:scale-105 group-hover:shadow-[0_0_40px_rgba(16,185,129,0.25)] transition-all duration-500">
          <CalcIcon className="text-amber-400" size={32} />
        </div>
        <div>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-white mb-2">Trading Calculators</h1>
          <p className="text-zinc-400 font-medium text-lg">Manage risk, size positions, and calculate your edge.</p>
        </div>
      </div>

      <div className="flex overflow-x-auto border-b border-white/5 pb-0 hide-scrollbar gap-2 sm:gap-6 w-full">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`relative flex items-center gap-2.5 px-4 sm:px-6 py-4 text-sm font-bold transition-all whitespace-nowrap group ${
              activeTab === t.id
                ? "text-amber-400"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            <span className={`transition-transform duration-300 ${activeTab === t.id ? 'scale-110 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'group-hover:scale-110'}`}>{t.icon}</span>
            {t.label}
            {activeTab === t.id && (
              <div className="absolute bottom-0 left-0 w-full h-[3px] rounded-t-full bg-emerald-500 shadow-[0_-3px_12px_rgba(16,185,129,0.8)] animate-in slide-in-from-bottom-[2px] zoom-in-95 duration-300" />
            )}
          </button>
        ))}
      </div>

      <div className="relative bg-[#0B0F14]/60 backdrop-blur-2xl border border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] p-6 sm:p-10 rounded-3xl overflow-hidden min-h-[400px]">
        {/* Glow effects */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-40 -left-60 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
        
        {/* Active Tool */}
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
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        <FloatingSelect label="Instrument Category" value={instrument} onChange={handleCategoryChange} options={[
          {value: "forex", label: "Forex"},
          {value: "crypto", label: "Crypto"},
          {value: "index", label: "Indices / Stocks"},
          {value: "indian", label: "Indian Market"},
          {value: "commodities", label: "Commodities"}
        ]} />
        <FloatingSelect label="Select Pair / Instrument" value={pair} onChange={(e: any) => setPair(e.target.value)} options={INSTRUMENT_PAIRS[instrument]} />
        <FloatingSelect label="Trade Type" value={type} onChange={(e: any) => setType(e.target.value)} options={[
          {value: "buy", label: "Buy (Long)"},
          {value: "sell", label: "Sell (Short)"}
        ]} />
        <div className="hidden md:block"></div>
        <FloatingInput label="Entry Price" value={entry} onChange={setEntry} placeholder="e.g. 1.0500" />
        <FloatingInput label="Exit Price" value={exit} onChange={setExit} placeholder="e.g. 1.0550" />
        <FloatingInput label="Lot Size / Quantity" value={lot} onChange={setLot} placeholder="e.g. 1.0" />
      </div>

      {result && result.error && (
        <div className="p-4 rounded-xl border bg-red-500/10 border-red-500/20 text-red-500 font-bold text-sm animate-in zoom-in-95">
          {result.message}
        </div>
      )}

      {result && !result.error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-6 rounded-2xl bg-black/20 border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">{getUnitName(instrument)} Output</div>
            <div className={`relative z-10 text-3xl font-black flex items-baseline gap-1.5 ${result.diffAmount >= 0 ? "text-amber-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.2)]" : "text-red-400 drop-shadow-[0_0_15px_rgba(248,113,113,0.2)]"}`}>
              {result.diffAmount >= 0 ? "+" : ""}{result.diffAmount.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 5 })}
              <span className="text-sm opacity-50 font-bold uppercase tracking-widest">{getUnitName(instrument)}</span>
            </div>
          </div>

          <div className={`p-6 rounded-2xl border flex flex-col justify-center relative overflow-hidden group ${result.pnl >= 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
            <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${result.pnl >= 0 ? "from-emerald-500/20 to-transparent" : "from-red-500/20 to-transparent"}`} />
            <div className="relative z-10 text-xs font-black uppercase tracking-widest mb-2 opacity-60 text-white">{result.pnl >= 0 ? "Profit" : "Loss"}</div>
            <div className={`relative z-10 text-4xl lg:text-5xl font-black ${result.pnl >= 0 ? "text-amber-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.4)]" : "text-red-400 drop-shadow-[0_0_20px_rgba(248,113,113,0.4)]"}`}>
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
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        <FloatingSelect label="Instrument Category" value={instrument} onChange={handleCategoryChange} options={[
          {value: "forex", label: "Forex"},
          {value: "crypto", label: "Crypto"},
          {value: "index", label: "Indices / Stocks"},
          {value: "indian", label: "Indian Market"},
          {value: "commodities", label: "Commodities"}
        ]} />
        <FloatingSelect label="Select Pair / Instrument" value={pair} onChange={(e: any) => setPair(e.target.value)} options={INSTRUMENT_PAIRS[instrument]} />
        <FloatingInput label="Account Balance ($)" value={balance} onChange={setBalance} placeholder="e.g. 10000" />
        <FloatingInput label="Risk Percentage (%)" value={riskPct} onChange={setRiskPct} placeholder="e.g. 1" />
        <FloatingInput label="Entry Price" value={entry} onChange={setEntry} placeholder="e.g. 1.0500" />
        <FloatingInput label="Stop Loss Price" value={sl} onChange={setSl} placeholder="e.g. 1.0450" />
      </div>

      {result !== null && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-6 rounded-2xl bg-black/20 border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Risk Amount</div>
            <div className="relative z-10 text-3xl font-black text-white">{formatMoney(result.riskAmount)}</div>
          </div>
          <div className="p-6 rounded-2xl border bg-emerald-500/10 border-emerald-500/30 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 text-xs font-black uppercase tracking-widest text-emerald-500/70 mb-2">Suggested Lot Size</div>
            <div className="relative z-10 text-4xl lg:text-5xl font-black text-amber-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.4)]">
              {result.lot.toFixed(4)}
            </div>
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
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      {result && result.error && (
        <div className="p-4 rounded-xl border bg-red-500/10 border-red-500/20 text-red-500 font-bold text-sm animate-in zoom-in-95">
          {result.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        <FloatingSelect label="Instrument Category" value={instrument} onChange={handleCategoryChange} options={[
          {value: "forex", label: "Forex"},
          {value: "crypto", label: "Crypto"},
          {value: "index", label: "Indices / Stocks"},
          {value: "indian", label: "Indian Market"},
          {value: "commodities", label: "Commodities"}
        ]} />
        <FloatingSelect label="Select Pair / Instrument" value={pair} onChange={(e: any) => setPair(e.target.value)} options={INSTRUMENT_PAIRS[instrument]} />
        <div className="md:col-span-2">
          <FloatingInput label="Lot Size / Quantity" value={lot} onChange={setLot} placeholder="e.g. 1.0" />
        </div>
        <FloatingInput label="Entry Price" value={entry} onChange={setEntry} placeholder="e.g. 1.0500" />
        <FloatingInput label="Exit Price" value={exit} onChange={setExit} placeholder="e.g. 1.0550" />
      </div>

      {result && !result.error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-6 rounded-2xl bg-black/20 border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">{unitName} Movement</div>
            <div className="relative z-10 text-3xl font-black text-amber-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.2)] flex items-baseline gap-1.5">
              {result.pips.toFixed(1)} <span className="text-sm opacity-50 font-bold uppercase tracking-widest">{unitName}</span>
            </div>
          </div>
          <div className="p-6 rounded-2xl border bg-emerald-500/10 border-emerald-500/30 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 text-xs font-black uppercase tracking-widest text-emerald-500/70 mb-2">Absolute Value ($)</div>
            <div className="relative z-10 text-4xl lg:text-5xl font-black text-amber-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.4)]">
              {formatMoney(result.profit)}
            </div>
          </div>
        </div>
      )}
      <p className="text-xs text-zinc-500 mt-6 text-center font-medium max-w-lg mx-auto">Measures the explicit absolute monetary value of the distance between two price points given your selected lot size/quantity.</p>
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
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      {result && result.error && (
        <div className="p-4 rounded-xl border bg-red-500/10 border-red-500/20 text-red-500 font-bold text-sm animate-in zoom-in-95">
          {result.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
        <div className="md:col-span-2">
          <div className="grid grid-cols-2 gap-2">
            <FloatingSelect label="Category" value={instrument} onChange={handleCategoryChange} options={[
                {value: "forex", label: "Forex"},
                {value: "crypto", label: "Crypto"},
                {value: "index", label: "Indices"},
                {value: "indian", label: "Indian"},
                {value: "commodities", label: "Commodities"}
            ]} />
            <FloatingSelect label="Type" value={type} onChange={(e: any) => setType(e.target.value)} options={[
              {value: "buy", label: "Buy"},
              {value: "sell", label: "Sell"}
            ]} />
          </div>
        </div>
        <div className="md:col-span-2">
          <FloatingSelect label="Select Pair / Instrument" value={pair} onChange={(e: any) => setPair(e.target.value)} options={INSTRUMENT_PAIRS[instrument]} />
        </div>
        <FloatingInput label="Lot Size" value={lot} onChange={setLot} placeholder="0.1" />
        <FloatingInput label="Balance (Opt)" value={balance} onChange={setBalance} placeholder="10000" />
        <FloatingInput label="Risk % (Opt)" value={riskPct} onChange={setRiskPct} placeholder="1" />
        <div className="hidden md:block"></div>
        <FloatingInput label="Entry Price" value={entry} onChange={setEntry} placeholder="1.0500" />
        <FloatingInput label="Target Price" value={exit} onChange={setExit} placeholder="1.0550" />
        <FloatingInput label="Stop Loss Price" value={sl} onChange={setSl} placeholder="1.0450" />
      </div>

      {result && !result.error && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className={`p-5 rounded-2xl border flex flex-col justify-center relative overflow-hidden group md:col-span-2 lg:col-span-1 ${result.pnl >= 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
             <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
             <div className="relative z-10 text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Est PnL</div>
             <div className={`relative z-10 text-3xl font-black ${result.pnl >= 0 ? "text-amber-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]" : "text-red-400 drop-shadow-[0_0_15px_rgba(248,113,113,0.3)]"}`}>
               {result.pnl >= 0 ? "+" : ""}{formatMoney(result.pnl)}
             </div>
          </div>
          <div className="p-5 rounded-2xl bg-black/20 border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors">
             <div className="relative z-10 text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">{getUnitName(instrument)} Gained</div>
             <div className={`relative z-10 text-2xl font-black flex items-baseline gap-1 ${result.unitGained >= 0 ? "text-amber-400" : "text-red-400"}`}>
               {result.unitGained.toFixed(2)}
               <span className="text-[10px] opacity-50 font-bold uppercase">{getUnitName(instrument)}</span>
             </div>
          </div>
          <div className="p-5 rounded-2xl bg-black/20 border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors">
             <div className="relative z-10 text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Risk Amount</div>
             <div className="relative z-10 text-2xl font-black text-white">{formatMoney(result.riskAmount)}</div>
          </div>
          <div className="p-5 rounded-2xl bg-black/20 border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors">
             <div className="relative z-10 text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Reward Ratio</div>
             <div className="relative z-10 text-2xl font-black text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.3)]">{result.rr > 0 ? `1 : ${result.rr.toFixed(1)}` : "-"}</div>
          </div>
        </div>
      )}
    </div>
  );
}
