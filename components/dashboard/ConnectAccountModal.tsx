"use client";

import { useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const POPULAR_SERVERS = [
  "XMGlobal-MT5", "XMGlobal-MT5 2", "XMGlobal-MT5 3", "XMGlobal-MT5 4", "XMGlobal-MT5 5", "XMGlobal-MT5 6", "XMGlobal-MT5 7", "XMGlobal-MT5 8",
  "XMGlobal-Real 1", "XMGlobal-Real 2", "XMGlobal-Real 3", "XMGlobal-Real 4", "XMGlobal-Real 5",
  "XMGlobal-Demo 1", "XMGlobal-Demo 2", "XMGlobal-Demo 3", "XMGlobal-Demo 4",
  "Exness-MT5Real", "Exness-MT5Real2", "Exness-MT5Real3", "Exness-MT5Real4", "Exness-MT5Real5", "Exness-MT5Real6", "Exness-MT5Trial",
  "FTMO-Server", "FTMO-Server2", "FTMO-Server3", "FTMO-Demo", "FTMO-Demo2",
  "ICMarketsSC-MT5", "ICMarketsSC-MT5-2", "ICMarketsSC-MT5-3", "ICMarkets-MT5", "ICMarkets-MT5-2",
  "FundingPips-Server", "FundingPips-Demo", "FundingPips-Live",
  "Pepperstone-Live", "Pepperstone-MT5-Live", "Pepperstone-MT5-Edge",
  "Eightcap-Real", "Eightcap-Demo", "Eightcap-MT5",
  "OANDA-v20 Live-1", "OANDA-v20 Live-2", "OANDA-v20 Practice",
  "Deriv-Server", "Deriv-Server-02", "Deriv-Demo"
];

interface ConnectAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Triggered when account successfully connected
}

export default function ConnectAccountModal({ isOpen, onClose, onSuccess }: ConnectAccountModalProps) {
  const { user } = useAuth();
  const [platform, setPlatform] = useState<"mt5" | "mt4">("mt5");
  const [login, setLogin] = useState("");
  const [server, setServer] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/connect-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: user.uid,
          platform,
          login: parseInt(login, 10),
          server,
          password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Connection failed");
      }

      onSuccess();
      onClose();
      // Reset form on success
      setLogin("");
      setServer("");
      setPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to connect to trading account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="luxury-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200 border border-[#D4AF37]/20" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-black/20 shrink-0">
          <h2 className="text-xl font-bold text-[#D4AF37] tracking-tight">Connect Trading Account</h2>
          <button onClick={onClose} className="p-1.5 text-zinc-600 dark:text-[#A0A0A0] hover:text-[#D4AF37] hover:bg-white/5 rounded-md transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-6">
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={16} />
              <p className="text-xs text-red-500 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-zinc-400 font-bold tracking-[0.15em] px-1">Platform</label>
              <select 
                value={platform} 
                onChange={(e) => setPlatform(e.target.value as "mt4"|"mt5")}
                className="w-full h-11 bg-[#0A0D11] border border-zinc-800 rounded-xl px-4 text-sm focus:border-[#D4AF37]/50 focus:outline-none text-[#EAEAEA]"
              >
                <option value="mt5">MetaTrader 5</option>
                <option value="mt4">MetaTrader 4</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-zinc-400 font-bold tracking-[0.15em] px-1">Account Login (ID)</label>
              <input 
                type="number" 
                required 
                value={login} 
                onChange={(e) => setLogin(e.target.value)}
                placeholder="e.g. 10002134" 
                className="w-full h-11 bg-[#0A0D11] border border-zinc-800 rounded-xl px-4 text-sm focus:border-[#D4AF37]/50 focus:outline-none text-[#EAEAEA] font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-zinc-400 font-bold tracking-[0.15em] px-1">Broker Server</label>
              <input 
                type="text" 
                required 
                list="broker-servers"
                value={server} 
                onChange={(e) => setServer(e.target.value)}
                placeholder="Search or type e.g. XMGlobal-MT5-6" 
                className="w-full h-11 bg-[#0A0D11] border border-zinc-800 rounded-xl px-4 text-sm focus:border-[#D4AF37]/50 focus:outline-none text-[#EAEAEA] placeholder:text-zinc-600"
              />
              <datalist id="broker-servers">
                {POPULAR_SERVERS.map((srv) => (
                  <option key={srv} value={srv} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] uppercase text-zinc-400 font-bold tracking-[0.15em]">Investor Password</label>
                <span className="text-[9px] text-[#D4AF37]/70 font-mono tracking-wide">Read-Only</span>
              </div>
              <input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter investor password" 
                className="w-full h-11 bg-[#0A0D11] border border-zinc-800 rounded-xl px-4 text-sm focus:border-[#D4AF37]/50 focus:outline-none text-[#EAEAEA] font-mono"
              />
              <p className="text-[10px] text-zinc-500 px-1 pt-1 leading-snug">
                Your credentials are encrypted end-to-end and stored securely. We only use the Read-Only (Investor) password to sync your history.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              <button 
                type="button" 
                onClick={onClose}
                className="px-5 h-11 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="px-6 h-11 rounded-xl text-xs font-bold bg-[#D4AF37] text-black hover:bg-[#F3D060] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? <><Loader2 size={14} className="animate-spin" /> Deploying Cloud Container...</> : "Connect Account"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
