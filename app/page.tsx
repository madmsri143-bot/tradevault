"use client";

import Link from "next/link";
import { TrendingUp, BookText, Target, BarChart3, ChevronRight, Check, Play, Zap, ShieldCheck, BrainCircuit, Sparkles, AlertTriangle, HeartPulse, Star, Camera, Upload, ScanLine, X, Lock, ArrowRight, Cpu } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useTrial } from "@/components/TrialGuard";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const { hasUsedTrial } = useTrial();
  const router = useRouter();
  const [mockStep, setMockStep] = useState(0);

  useEffect(() => {
    if (!loading && user) {
      router.replace(hasUsedTrial ? "/billing" : "/dashboard");
    }
  }, [user, loading, hasUsedTrial, router]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMockStep(prev => (prev + 1) % 4);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  if (loading || user) return <div className="min-h-screen bg-[#0B0F14]" />;

  return (
    <div className="min-h-screen bg-[#0B0F14] text-white selection:bg-[#00FFB2]/30 overflow-x-hidden">
      
      {/* Dynamic Background Blurs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-[#00FFB2]/10 blur-[120px] animate-pulse" />
        <div className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] rounded-full bg-[#3B82F6]/10 blur-[150px]" />
        <div className="absolute -bottom-[10%] left-[20%] w-[30%] h-[30%] rounded-full bg-[#FF4D6D]/5 blur-[100px]" />
      </div>

      {/* Navbar */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-10 h-10 bg-[#00FFB2]/10 rounded-xl flex items-center justify-center border border-[#00FFB2]/20 group-hover:scale-110 transition-transform">
            <TrendingUp size={24} className="text-[#00FFB2]" />
          </div>
          <span className="text-xl font-brand font-black tracking-tight">TradeVault</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
          <a href="#ai-intelligence" className="hover:text-white transition-colors">AI Logger</a>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </div>

          <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
            Login
          </Link>
          <Link href={user ? (hasUsedTrial ? "/billing" : "/dashboard") : "/signup?plan=trial"} className="bg-white text-black px-5 py-2.5 rounded-full text-sm font-bold hover:bg-[#00FFB2] hover:shadow-[0_0_20px_rgba(0,255,178,0.4)] transition-all">
            {user ? (hasUsedTrial ? "Upgrade to Pro" : "Launch App") : "Start 7-Day Trial"}
          </Link>
        </div>
      </nav>

      {/* 1. HERO SECTION */}
      <section className="relative z-10 pt-16 md:pt-24 pb-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 fade-slide-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00FFB2]/10 border border-[#00FFB2]/20 text-[#00FFB2] text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(0,255,178,0.2)]">
              <BrainCircuit size={14} /> New: AI Screenshot Extraction
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1]">
              Stop Manual <br /> Trade Logging. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FFB2] via-[#3B82F6] to-[#00FFB2] bg-[length:200%_auto] animate-gradient-x">
                Let AI Do It.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-zinc-400 max-w-md leading-relaxed">
              Upload your trading screenshot. TradeVault instantly extracts, logs, and analyzes your trades — no typing, no errors.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href={user ? (hasUsedTrial ? "/billing" : "/dashboard") : "/signup?plan=trial"} className="px-8 py-4 bg-[#00FFB2] text-black font-black rounded-2xl flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(0,255,178,0.3)] hover:-translate-y-1 transition-all">
                Start Free Trial <ChevronRight size={20} />
              </Link>
              <Link href="/signup" className="px-8 py-4 bg-zinc-900 border border-white/10 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all">
                <Camera size={18} className="text-zinc-400" /> Try Screenshot Upload
              </Link>
            </div>
            <div className="flex items-center gap-6 pt-6 text-zinc-500">
               <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest leading-none">
                 <ShieldCheck size={16} className="text-[#00FFB2]" /> 100% Secure
               </div>
               <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest leading-none">
                 <Zap size={16} className="text-amber-400" /> Done in Seconds
               </div>
            </div>
          </div>

          {/* Interactive Hero Animated Mockup */}
          <div className="relative fade-slide-up group" style={{ animationDelay: "200ms" }}>
             <div className="absolute inset-0 bg-[#00FFB2]/20 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
             <div className="relative bg-[#11161D] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex transform group-hover:scale-[1.02] transition-transform duration-500 max-w-[600px] h-[350px]">
                
                {/* Left side: Upload Mock */}
                <div className="w-1/2 p-6 border-r border-white/5 bg-[#0B0E13] flex flex-col items-center justify-center relative shadow-inner overflow-hidden">
                   <div className="text-center space-y-3 z-10 w-full">
                     <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center transition-all duration-500 
                       ${mockStep === 0 ? 'bg-zinc-800 border-zinc-700' : 
                         mockStep === 1 ? 'bg-[#3B82F6]/20 border-[#3B82F6]/40 text-[#3B82F6] animate-pulse' : 
                         'bg-[#00FFB2]/20 border-[#00FFB2]/40 text-[#00FFB2]'}`}>
                       {mockStep === 0 ? <Upload size={28} className="text-zinc-400" /> : 
                        mockStep === 1 ? <ScanLine size={28} /> : 
                        <Check size={28} /> }
                     </div>
                     <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                        {mockStep === 0 ? 'Select MT5 Screenshot' : mockStep === 1 ? 'Scanning Image...' : 'Data Extracted'}
                     </p>
                   </div>
                   
                   {/* Ghost MT5 table behind the scanner */}
                   <div className={`absolute bottom-4 left-4 right-4 bg-zinc-900 border border-white/10 rounded-xl p-3 transition-opacity duration-500 ${mockStep >= 1 ? 'opacity-100' : 'opacity-0'}`}>
                      <div className="flex justify-between items-center text-[8px] font-mono text-zinc-500 border-b border-white/10 pb-1 mb-2">
                        <span>Pair</span><span>Type</span><span>Lot</span><span>Profit</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-mono font-bold">
                        <span>XAUUSD</span><span className="text-emerald-500">BUY</span><span>0.10</span><span className="text-red-500">-114.65</span>
                      </div>
                   </div>

                   {/* Scanning line animation */}
                   {mockStep === 1 && (
                     <div className="absolute top-0 left-0 w-full h-[2px] bg-[#3B82F6] shadow-[0_0_15px_#3B82F6] animate-[scan_1.5s_ease-in-out_infinite]" />
                   )}
                </div>

                {/* Right side: Auto-filled Modal */}
                <div className="w-1/2 p-6 bg-gradient-to-br from-[#11161D] to-[#0D1218] flex flex-col space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm text-[#00FFB2]">Log New Trade</h3>
                    <X size={14} className="text-zinc-600" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase text-zinc-500 font-bold">Symbol</p>
                      <div className={`w-full h-8 bg-[#0B0E13] border rounded-lg px-2 flex items-center transition-all duration-500 ${mockStep >= 2 ? 'border-emerald-500/30' : 'border-white/5'}`}>
                        {mockStep >= 2 && <span className="text-xs font-bold text-emerald-400">XAUUSD</span>}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase text-zinc-500 font-bold">Type</p>
                        <div className={`w-full h-8 bg-[#0B0E13] border rounded-lg px-2 flex items-center transition-all duration-500 ${mockStep >= 2 ? 'border-emerald-500/30' : 'border-white/5'}`}>
                          {mockStep >= 2 && <span className="text-xs font-bold text-white uppercase">Buy</span>}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase text-zinc-500 font-bold">Lot Size</p>
                        <div className={`w-full h-8 bg-[#0B0E13] border rounded-lg px-2 flex items-center transition-all duration-500 ${mockStep >= 2 ? 'border-emerald-500/30' : 'border-white/5'}`}>
                          {mockStep >= 2 && <span className="text-xs font-bold text-white">0.10</span>}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase text-zinc-500 font-bold">Result</p>
                        <div className={`w-full h-8 bg-[#0B0E13] border rounded-lg px-2 flex items-center transition-all duration-500 ${mockStep >= 2 ? 'border-red-500/30' : 'border-white/5'}`}>
                          {mockStep >= 2 && <span className="text-xs font-bold text-red-500">Loss</span>}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase text-zinc-500 font-bold">Amount</p>
                        <div className={`w-full h-8 bg-[#0B0E13] border rounded-lg px-2 flex items-center relative transition-all duration-500 ${mockStep >= 2 ? 'border-red-500/30' : 'border-white/5'}`}>
                          {mockStep >= 2 && <span className="text-xs font-bold text-white absolute pl-1">114.65</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`mt-auto w-full h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-colors duration-500 ${mockStep >= 2 ? 'bg-[#00FFB2] text-black shadow-[0_0_15px_rgba(0,255,178,0.2)]' : 'bg-zinc-800 text-zinc-500'}`}>
                    Save Trade
                  </div>
                </div>

             </div>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS (Core Feature Showcase) */}
      <section className="py-24 px-6 relative z-10 bg-[#0B0F14]/50 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4 fade-slide-up">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">From Screenshot to Smart Journal in Seconds</h2>
            <p className="text-zinc-400 text-lg">Stop fighting with spreadsheets. TradeVault’s vision AI does the heavy lifting instantly.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* connecting line */}
            <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-transparent via-[#00FFB2]/20 to-transparent -translate-y-1/2 z-0" />
            
            <div className="relative z-10 bg-[#11161D] border border-white/5 p-8 rounded-3xl space-y-4 text-center transform hover:-translate-y-2 transition-transform shadow-xl">
              <div className="w-16 h-16 mx-auto bg-zinc-800/50 rounded-2xl flex items-center justify-center border border-white/10 mb-6 shadow-inner">
                <Upload className="text-zinc-300" size={28} />
              </div>
              <h3 className="text-xl font-bold">1. Upload Screenshot</h3>
              <p className="text-zinc-400 leading-relaxed text-sm">Drop in any valid MT4, MT5, or broker history image showing your executed trades.</p>
            </div>
            
            <div className="relative z-10 bg-[#11161D] border border-white/5 p-8 rounded-3xl space-y-4 text-center transform hover:-translate-y-2 transition-transform shadow-xl">
              <div className="w-16 h-16 mx-auto bg-[#3B82F6]/10 rounded-2xl flex items-center justify-center border border-[#3B82F6]/30 mb-6 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                <BrainCircuit className="text-[#3B82F6]" size={28} />
              </div>
              <h3 className="text-xl font-bold">2. AI Scans Image</h3>
              <p className="text-zinc-400 leading-relaxed text-sm">The vision engine instantly recognizes the Pair, Buy/Sell type, Lot Size, Entry, Exit & PnL.</p>
            </div>

            <div className="relative z-10 bg-[#11161D] border border-white/5 p-8 rounded-3xl space-y-4 text-center transform hover:-translate-y-2 transition-transform shadow-xl">
              <div className="w-16 h-16 mx-auto bg-[#00FFB2]/10 rounded-2xl flex items-center justify-center border border-[#00FFB2]/30 mb-6 shadow-[0_0_30px_rgba(0,255,178,0.15)]">
                <Check className="text-[#00FFB2]" size={32} strokeWidth={3} />
              </div>
              <h3 className="text-xl font-bold">3. Auto-Filled Instantly</h3>
              <p className="text-zinc-400 leading-relaxed text-sm">All columns are populated recursively. Just review the single trade or bulk list and click Save.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. COMPARISON SECTION (Conversion Driver) */}
      <section className="py-24 px-6 relative z-10 max-w-5xl mx-auto">
        <div className="text-center mb-16 space-y-4 fade-slide-up">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-bold uppercase tracking-widest">
             Efficiency Comparison
           </div>
           <h2 className="text-3xl md:text-5xl font-black tracking-tight">Why Waste Time Logging Trades Manually?</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
           {/* Manual Log */}
           <div className="bg-[#11161D] border border-red-500/20 p-8 rounded-3xl flex flex-col hover:border-red-500/40 transition-colors">
              <div className="flex items-center gap-3 mb-8">
                 <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                    <X size={20} className="text-red-500" />
                 </div>
                 <h3 className="text-2xl font-bold text-zinc-300">Manual Logging</h3>
              </div>
              <ul className="space-y-6 flex-1 text-zinc-400 text-sm md:text-base font-medium">
                 <li className="flex gap-4 items-start"><span className="text-red-500 mt-0.5 opacity-50">❌</span> Takes 5–10 minutes per session</li>
                 <li className="flex gap-4 items-start"><span className="text-red-500 mt-0.5 opacity-50">❌</span> High risk of human typos</li>
                 <li className="flex gap-4 items-start"><span className="text-red-500 mt-0.5 opacity-50">❌</span> Repetitive entry of Date, Pair, & PnL</li>
                 <li className="flex gap-4 items-start"><span className="text-red-500 mt-0.5 opacity-50">❌</span> Inconsistent rules tracking</li>
              </ul>
              <div className="mt-8 pt-6 border-t border-red-500/10 text-center text-zinc-500 font-bold uppercase tracking-wide text-xs">
                 The Old Way
              </div>
           </div>

           {/* AI Log */}
           <div className="bg-gradient-to-b from-[#11161D] to-[#0A0D11] border border-[#00FFB2]/30 p-8 rounded-3xl flex flex-col shadow-[0_0_40px_rgba(0,255,178,0.05)] transform md:-translate-y-4 hover:border-[#00FFB2]/60 transition-colors">
              <div className="flex items-center gap-3 mb-8">
                 <div className="w-10 h-10 rounded-full bg-[#00FFB2]/20 flex items-center justify-center border border-[#00FFB2]/40 shadow-[0_0_15px_rgba(0,255,178,0.2)]">
                    <Check size={20} className="text-[#00FFB2]" strokeWidth={3} />
                 </div>
                 <h3 className="text-2xl font-bold text-white">TradeVault AI <Sparkles size={16} className="inline ml-1 text-[#00FFB2] mb-1" /></h3>
              </div>
              <ul className="space-y-6 flex-1 text-zinc-200 text-sm md:text-base font-bold">
                 <li className="flex gap-4 items-start"><span className="text-[#00FFB2] mt-0.5">✅</span> Processed in exactly 2 seconds</li>
                 <li className="flex gap-4 items-start"><span className="text-[#00FFB2] mt-0.5">✅</span> Mathematical AI accuracy</li>
                 <li className="flex gap-4 items-start"><span className="text-[#00FFB2] mt-0.5">✅</span> One-click bulk extraction</li>
                 <li className="flex gap-4 items-start"><span className="text-[#00FFB2] mt-0.5">✅</span> Perfectly structured journal data</li>
              </ul>
              <div className="mt-8 pt-6 border-t border-[#00FFB2]/10 text-center text-[#00FFB2] font-black uppercase tracking-widest text-xs flex justify-center items-center gap-2">
                 The Future <ArrowRight size={14} />
              </div>
           </div>
        </div>
      </section>

      {/* 4. AI FEATURE POSITIONING */}
      <section id="ai-intelligence" className="py-24 px-6 relative z-10 max-w-7xl mx-auto space-y-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 relative group bg-gradient-to-tr from-[#11161D] to-[#0D1218] p-[1px] rounded-[2.25rem] shadow-2xl overflow-hidden">
             {/* Dynamic Border */}
             <div className="absolute inset-0 bg-gradient-to-b from-[#00FFB2] via-purple-500 to-transparent opacity-30 group-hover:opacity-50 transition-opacity duration-1000" />
             <div className="relative bg-[#0B0F14] m-[1px] rounded-[2.2rem] p-8 h-full">
                
                <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/40" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/40" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/40" />
                  </div>
                  <div className="px-3 py-1 bg-white/5 rounded text-[10px] font-mono text-zinc-500 uppercase">Screenshot Analysis Memory</div>
                </div>
                
                <div className="space-y-5">
                   {/* Fake scanning logs */}
                   <div className="font-mono text-xs text-zinc-500 space-y-2">
                     <p className="flex items-center gap-2"><span className="text-blue-400">[vision-model]</span> Input image processed.</p>
                     <p className="flex items-center gap-2"><span className="text-[#00FFB2]">[extract_engine]</span> Found Trade #01 (XAUUSD, BUY)</p>
                     <p className="flex items-center gap-2"><span className="text-[#00FFB2]">[extract_engine]</span> Found Trade #02 (USDJPY, SELL)</p>
                     <p className="flex items-center gap-2"><span className="text-[#00FFB2]">[extract_engine]</span> Extracted Net PnL securely.</p>
                     <p className="flex items-center gap-2"><span className="text-zinc-600">cleaning_memory... dumped.</span></p>
                   </div>
                   
                   <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex gap-4 mt-8">
                     <ShieldCheck className="text-emerald-400 shrink-0" size={24} />
                     <div>
                       <h4 className="font-bold text-emerald-400 text-sm mb-1">Zero-Retention Policy</h4>
                       <p className="text-xs text-zinc-400 leading-relaxed font-medium">Your uploaded broker screenshots are processed securely in temporary server memory and are strictly never stored in any database or cloud storage. Total privacy guaranteed.</p>
                     </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="order-1 lg:order-2 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest">
              <Cpu size={14} /> Advanced Processing Module
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">AI-Powered Screenshot Intelligence</h2>
            <p className="text-zinc-400 text-lg leading-relaxed">Experience a premium, high-speed extraction engine that parses visual data with flawless precision.</p>
            <ul className="space-y-4 pt-4 shrink-0">
              <li className="flex items-start gap-4 text-zinc-300">
                <div className="w-8 h-8 rounded-lg bg-zinc-800/80 flex items-center justify-center border border-white/5 mt-0.5">
                  <Check size={16} className="text-[#00FFB2]" />
                </div>
                <div>
                  <span className="font-bold block text-white">Full Schema Detection</span>
                  <span className="text-sm text-zinc-500">Auto-identifies Symbol, Type, Lot Size, Entry, Exit & Absolute PnL.</span>
                </div>
              </li>
              <li className="flex items-start gap-4 text-zinc-300">
                <div className="w-8 h-8 rounded-lg bg-zinc-800/80 flex items-center justify-center border border-white/5 mt-0.5">
                  <Check size={16} className="text-[#00FFB2]" />
                </div>
                <div>
                  <span className="font-bold block text-white">Universal Broker Support</span>
                  <span className="text-sm text-zinc-500">Trained to understand MT4, MT5, and heavily modified prop firm histories.</span>
                </div>
              </li>
              <li className="flex items-start gap-4 text-zinc-300">
                <div className="w-8 h-8 rounded-lg bg-zinc-800/80 flex items-center justify-center border border-white/5 mt-0.5">
                  <Check size={16} className="text-[#00FFB2]" />
                </div>
                <div>
                  <span className="font-bold block text-white">Smart Mapping API</span>
                  <span className="text-sm text-zinc-500">Correctly sorts negative PnL values identically to your native dashboard calculations.</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5. PAIN POINT SECTION (Emotional Hook) */}
      <section className="py-32 px-6 bg-black relative z-10 border-y border-zinc-900 border-b-0 overflow-hidden">
        {/* Subtle radial glow to draw eyes */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-red-500/5 blur-[120px] rounded-[100%] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center space-y-10 relative">
          <h2 className="text-5xl md:text-7xl font-black tracking-tight text-white uppercase leading-[1.1]">
            <span className="opacity-90">You’re Not <br/>Losing Trades.</span> <br/>
            <span className="text-red-500 font-brand">You’re Losing Data.</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 pb-10 border-b border-white/5 max-w-2xl mx-auto">
             <div className="text-center font-bold text-zinc-400 text-lg sm:text-xl">
               <span className="block text-3xl mb-2">🤷‍♂️</span> No Tracking <br/><span className="text-zinc-600 text-sm font-medium">No Improvement</span>
             </div>
             <div className="text-center font-bold text-zinc-400 text-lg sm:text-xl">
               <span className="block text-3xl mb-2">📉</span> No Data <br/><span className="text-zinc-600 text-sm font-medium">No Strategy</span>
             </div>
             <div className="text-center font-bold text-zinc-400 text-lg sm:text-xl">
               <span className="block text-3xl mb-2">🎭</span> No Consistency <br/><span className="text-zinc-600 text-sm font-medium">No Growth</span>
             </div>
          </div>
          <div className="pt-4 flex flex-col items-center">
            <p className="text-xl md:text-2xl text-white font-medium bg-black px-6 py-2 rounded-xl inline-block shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
              TradeVault fixes this in seconds with <strong className="text-[#00FFB2]">AI automation.</strong>
            </p>
            <Link href="/signup" className="mt-8 px-10 py-5 bg-[#00FFB2] text-black font-black rounded-2xl hover:shadow-[0_0_30px_rgba(0,255,178,0.4)] hover:-translate-y-1 transition-all md:text-lg">
              Stop Making Excuses →
            </Link>
          </div>
        </div>
      </section>

      {/* 6. EXISTING FEATURES MOVED BELOW */}
      <section className="py-24 px-6 relative z-10 max-w-7xl mx-auto space-y-32">
        <div className="text-center max-w-3xl mx-auto">
           <h2 className="text-3xl font-black text-zinc-500 uppercase tracking-widest pb-4">A complete ecosystem</h2>
           <p className="text-lg text-zinc-600">Once your trades are extracted, we arm you with institutional-grade logic.</p>
        </div>

        {/* Feature 2: Post Trade Journal Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest">
              <Sparkles size={14} /> Psychology Engine V2
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
              A Complete <br />Trading Journal
            </h2>
            <p className="text-zinc-400 text-base leading-relaxed">
              Track your emotions, mistakes, and decisions with precision. Our Journal analyzes your entries to uncover hidden patterns that raw charts simply can't tell you.
            </p>
            <ul className="space-y-4 pt-2">
              <li className="flex items-start gap-3 text-zinc-300">
                <div className="w-6 h-6 rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <HeartPulse size={14} className="text-purple-400" />
                </div>
                <span className="text-[15px]">Pre & Post Trade Emotional Tracking</span>
              </li>
              <li className="flex items-start gap-3 text-zinc-300">
                <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle size={14} className="text-amber-400" />
                </div>
                <span className="text-[15px]">Mistake Detection (FOMO, Revenge Trading)</span>
              </li>
              <li className="flex items-start gap-3 text-zinc-300">
                <div className="w-6 h-6 rounded-lg bg-[#00FFB2]/15 border border-[#00FFB2]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <BrainCircuit size={14} className="text-[#00FFB2]" />
                </div>
                <span className="text-[15px]">Weekly Performance Review generation (Pro)</span>
              </li>
              <li className="flex items-start gap-3 text-zinc-300">
                <div className="w-6 h-6 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Star size={14} className="text-blue-400" />
                </div>
                <span className="text-[15px]">Execution Grade Logging</span>
              </li>
            </ul>
          </div>
          <div className="relative group p-6 bg-zinc-900 border border-white/5 rounded-[2rem] shadow-xl flex items-center justify-center overflow-hidden">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none" />
             <div className="space-y-3 relative z-10 w-full max-w-sm">
                 <div className="bg-[#0B0E13] rounded-2xl border border-white/5 p-4 shadow-inner">
                   <span className="text-[9px] uppercase font-black tracking-[0.2em] text-zinc-500 block mb-3">Emotional Pattern</span>
                   <div className="flex items-center gap-2.5">
                     <span className="text-[11px] font-bold text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded">Confident</span>
                     <ChevronRight size={14} className="text-zinc-600" />
                     <span className="text-[11px] font-bold text-red-400 bg-red-500/10 px-3 py-1.5 rounded">Frustrated</span>
                   </div>
                 </div>
                 <div className="bg-[#0B0E13] rounded-2xl border border-white/5 p-4 shadow-inner flex flex-wrap gap-2">
                     <span className="text-[10px] font-black uppercase text-amber-400 border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 rounded-lg shadow-sm">FOMO</span>
                     <span className="text-[10px] font-black uppercase text-red-400 border border-red-500/30 bg-red-500/10 px-3 py-1.5 rounded-lg shadow-sm">Early Exit</span>
                     <span className="text-[10px] font-black uppercase text-zinc-500 border border-white/10 bg-white/5 px-3 py-1.5 rounded-lg">Overtrading</span>
                 </div>
             </div>
          </div>
        </div>

        {/* Feature 3: Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 relative group p-6 bg-zinc-900 border border-white/5 rounded-[2rem] shadow-xl flex flex-col items-center justify-center">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="80" cy="80" r="65" stroke="currentColor" strokeWidth="14" fill="transparent" className="text-white/5" />
                    <circle cx="80" cy="80" r="65" stroke="currentColor" strokeWidth="14" fill="transparent" strokeDasharray="408" strokeDashoffset="120" className="text-[#00FFB2]" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <span className="text-2xl font-black text-white">70.5%</span>
                     <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Win Rate</span>
                  </div>
                </div>
                <div className="mt-8 flex gap-4 w-full">
                   <div className="flex-1 bg-[#0B0F14] border border-white/5 p-4 rounded-2xl text-center">
                     <p className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Execution Index</p>
                     <p className="text-xl font-black text-[#00FFB2]">A-</p>
                   </div>
                   <div className="flex-1 bg-[#0B0F14] border border-white/5 p-4 rounded-2xl text-center">
                     <p className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Profit Factor</p>
                     <p className="text-xl font-black text-white">2.41</p>
                   </div>
                </div>
          </div>
          <div className="order-1 lg:order-2 space-y-6">
            <div className="w-10 h-10 bg-[#00FFB2]/10 rounded-2xl flex items-center justify-center border border-[#00FFB2]/20">
              <Target className="text-[#00FFB2]" size={20} />
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">Elite Consistency Targets</h2>
            <p className="text-zinc-400 text-lg leading-relaxed">Gamify your execution. Visualize your true edge and get immediate feedback on whether you are maintaining professional pacing constraints.</p>
          </div>
        </div>

      </section>

      {/* 7. PRICING SECTION */}
      <section id="pricing" className="py-24 px-6 relative overflow-hidden border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center space-y-4 mb-16">
           <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">Professional Tools for Profitable Minds</h2>
           <p className="text-zinc-400">Choose a path that fits your current trading journey.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto relative z-10">
          {/* Free Plan */}
          <div className="bg-[#11161D] border border-white/5 p-8 rounded-[32px] space-y-8 flex flex-col group hover:border-white/10 transition-colors">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-zinc-400">Standard Plan</h3>
              <p className="text-3xl font-black italic">Free <span className="text-sm text-zinc-500 font-medium not-italic">/ forever</span></p>
            </div>
            <ul className="space-y-4 flex-1">
              <PricingTier feature="Manual Trade Logging" />
              <PricingTier feature="Standard Journal View" />
              <PricingTier feature="Basic Analytics Dashboard" />
              <PricingTier feature="Mistake Intelligence Tracking" />
              <li className="flex items-center gap-3 opacity-30 select-none">
                <div className="w-5 h-5 rounded-full border border-white/10 flex items-center justify-center shrink-0">
                  <span className="text-[10px]">✕</span>
                </div>
                <span className="text-xs text-zinc-500 line-through">Automated Screenshot Logging</span>
              </li>
              <li className="flex items-center gap-3 opacity-30 select-none">
                <div className="w-5 h-5 rounded-full border border-white/10 flex items-center justify-center shrink-0">
                  <span className="text-[10px]">✕</span>
                </div>
                <span className="text-xs text-zinc-500 line-through">Elite Target Engine & Export</span>
              </li>
              <li className="flex items-center gap-3 opacity-30 select-none">
                <div className="w-5 h-5 rounded-full border border-white/10 flex items-center justify-center shrink-0">
                  <span className="text-[10px]">✕</span>
                </div>
                <span className="text-xs text-zinc-500 line-through">AI Weekly Insights Report</span>
              </li>
            </ul>
            <Link href="/signup?plan=free" className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl transition-all text-center">
              Start Free Plan
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="bg-gradient-to-br from-[#11161D] to-[#0D1218] border-2 border-[#00FFB2]/20 p-8 rounded-[32px] space-y-8 relative overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,255,178,0.05)] transform md:-translate-y-4">
            <div className="absolute top-0 right-0 p-4">
               <span className="px-3 py-1 bg-[#00FFB2] text-black text-[10px] font-black uppercase rounded-full tracking-widest">New AI Engine Inside</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#00FFB2]">Professional Access</h3>
              <p className="text-3xl font-black">$2.99 <span className="text-sm text-zinc-500 font-medium font-bold">/ month</span></p>
              <p className="text-sm font-bold text-zinc-400">or <span className="text-white">$19.99</span> / year</p>
            </div>
            <ul className="space-y-4 flex-1">
              <PricingTier feature="Unlimited Automated Screenshot AI" pro />
              <PricingTier feature="Standard Journal View" pro />
              <PricingTier feature="Deep Analytics Dashboard" pro />
              <PricingTier feature="Mistake Intelligence Tracking" pro />
              <PricingTier feature="Export Capabilities (PDF, CSV)" pro />
              <PricingTier feature="Elite Target Engine (Daily/Weekly)" pro />
              <PricingTier feature="Weekly AI Trading Review Report" pro />
            </ul>
            <div className="space-y-4">
              <Link href={user ? (hasUsedTrial ? "/billing" : "/dashboard") : "/signup?plan=trial"} className="w-full py-4 bg-[#00FFB2] text-black font-black rounded-2xl hover:shadow-[0_0_20px_rgba(0,255,178,0.4)] transition-all block text-center">
                {user && hasUsedTrial ? "Upgrade to Pro instantly" : "Start 7-Day Free Trial"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FOOTER CTA */}
      <section className="py-24 px-6 text-center">
         <div className="max-w-4xl mx-auto bg-gradient-to-r from-[#0B0E13] to-[#11161D] border border-white/5 rounded-[40px] p-12 md:p-20 space-y-8 relative overflow-hidden">
            <h2 className="text-4xl md:text-6xl font-black tracking-tight">Stop Typing. <br /> Start Trading.</h2>
            <p className="text-zinc-400 max-w-xl mx-auto text-lg">Join the intelligent traders who let TradeVault's AI engine handle their data entry.</p>
            <Link href="/signup" className="inline-flex items-center gap-2 px-10 py-5 bg-white text-black font-black rounded-2xl hover:bg-[#00FFB2] transition-colors relative z-10 text-lg">
               Upload Your First Screenshot <Upload size={20}/>
            </Link>
            <p className="text-zinc-500 text-sm mt-4 font-medium relative z-10 flex border border-zinc-900 justify-center">100% Secure. In-Memory Processing.</p>
         </div>
      </section>
      
    </div>
  );
}

function PricingTier({ feature, pro = false }: { feature: string; pro?: boolean }) {
  return (
    <li className="flex items-center gap-3">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${pro ? 'bg-[#00FFB2]/20 text-[#00FFB2]' : 'bg-zinc-800 text-zinc-500'}`}>
        <Check size={14} strokeWidth={3} />
      </div>
      <span className={`text-sm ${pro ? 'text-zinc-200 font-bold' : 'text-zinc-400'}`}>{feature}</span>
    </li>
  );
}
