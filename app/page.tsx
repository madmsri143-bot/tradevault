"use client";

import Link from "next/link";
import { TrendingUp, BookText, Target, BarChart3, ChevronRight, Check, Play, Zap, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useTrial } from "@/components/TrialGuard";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const { hasUsedTrial } = useTrial();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace(hasUsedTrial ? "/billing" : "/dashboard");
    }
  }, [user, loading, hasUsedTrial, router]);

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
          <span className="text-xl font-bold tracking-tight">TradeVault</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#" className="hover:text-white transition-colors">Resources</a>
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

      {/* Hero Section */}
      <section className="relative z-10 pt-16 md:pt-24 pb-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 fade-slide-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00FFB2]/10 border border-[#00FFB2]/20 text-[#00FFB2] text-xs font-bold uppercase tracking-widest">
              <Zap size={14} /> New: Elite Targets V2
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1]">
              Stop Guessing. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FFB2] via-[#3B82F6] to-[#00FFB2] bg-[length:200%_auto] animate-gradient-x">
                Start Tracking Your Trading Discipline.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-zinc-400 max-w-md leading-relaxed">
              The premier workspace for traders to log execution, identify psychological patterns, and hit mathematical profit targets with surgical precision.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href={user ? (hasUsedTrial ? "/billing" : "/dashboard") : "/signup?plan=trial"} className="px-8 py-4 bg-[#00FFB2] text-black font-black rounded-2xl flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(0,255,178,0.3)] hover:-translate-y-1 transition-all">
                {user ? (hasUsedTrial ? "Upgrade to Pro" : "Launch Workspace") : "Start 7-Day Trial"} <ChevronRight size={20} />
              </Link>
              <Link href="/signup?plan=free" className="px-8 py-4 bg-zinc-900 border border-white/10 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all">
                Get Started for Free
              </Link>
            </div>
            <div className="pt-2">
              <Link href="/demo" className="inline-flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-white transition-colors py-2 group">
                <Play size={16} className="text-[#00FFB2] group-hover:scale-110 transition-transform" /> View Live Demo
              </Link>
            </div>
            <p className="text-sm font-medium text-zinc-500 mt-2">
               Choose the path that fits your discipline — Free or Pro Trial
            </p>
            <div className="flex items-center gap-6 pt-4 text-zinc-500">
               <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest leading-none">
                 <ShieldCheck size={16} className="text-[#00FFB2]" /> 100% Private
               </div>
               <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest leading-none">
                 <ShieldCheck size={16} className="text-[#3B82F6]" /> Cloud Synced
               </div>
            </div>
          </div>

          <div className="relative fade-slide-up group" style={{ animationDelay: "200ms" }}>
             <div className="absolute inset-0 bg-[#00FFB2]/20 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
             <div className="relative bg-gradient-to-br from-[#11161D] to-[#0D1218] border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-4 md:p-6 transform group-hover:scale-[1.02] transition-transform duration-500">
                {/* Simplified Dashboard Mockup */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#FF4D6D]/40" />
                    <div className="w-3 h-3 rounded-full bg-zinc-700" />
                    <div className="w-3 h-3 rounded-full bg-[#00FFB2]/40" />
                  </div>
                  <div className="w-24 h-6 bg-zinc-800 rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 space-y-2">
                     <p className="text-[10px] uppercase font-bold text-zinc-500">Total Profit</p>
                     <p className="text-xl font-bold text-[#00FFB2] scale-in">+$12,450.00</p>
                  </div>
                  <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 space-y-2">
                     <p className="text-[10px] uppercase font-bold text-zinc-500">Win Rate</p>
                     <p className="text-xl font-bold text-white tracking-widest">68.4%</p>
                  </div>
                </div>
                <div className="bg-zinc-950/80 aspect-[16/9] rounded-2xl border border-white/10 p-4 flex flex-col justify-end gap-2 overflow-hidden shadow-inner">
                   <div className="flex items-end gap-1 h-2/3">
                      {[40, 60, 45, 80, 55, 90, 70, 85, 95].map((h, i) => (
                        <div key={i} className="flex-1 bg-gradient-to-t from-[#00FFB2]/40 to-[#00FFB2] rounded-t-sm" style={{ height: `${h}%` }} />
                      ))}
                   </div>
                </div>
                <div className="mt-6 flex gap-3">
                   <div className="w-8 h-8 rounded-full bg-zinc-800" />
                   <div className="flex-1 space-y-2">
                      <div className="w-1/3 h-2 bg-zinc-800 rounded-full" />
                      <div className="w-2/3 h-2 bg-zinc-700/50 rounded-full" />
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Problem / Solution Section */}
      <section className="py-24 px-6 relative z-10 bg-[#0B0F14]/50 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4 fade-slide-up">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">The Cycle of Inconsistency</h2>
            <p className="text-zinc-400 text-lg">Most traders fail because they don't have a system to identify their own psychological leaks. TradeVault bridges the gap between raw data and behavioral change.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#11161D] border border-white/5 p-8 rounded-3xl space-y-4 fade-slide-up" style={{ animationDelay: "100ms" }}>
              <div className="w-12 h-12 bg-[#FF4D6D]/10 rounded-2xl flex items-center justify-center border border-[#FF4D6D]/20 mb-6">
                <TrendingUp className="text-[#FF4D6D] rotate-180" size={24} />
              </div>
              <h3 className="text-xl font-bold">Emotional Overtrading</h3>
              <p className="text-zinc-400 leading-relaxed text-sm">Trading on tilt after a loss destroys weeks of discipline in minutes. Without tracking your mood, you're flying blind.</p>
            </div>
            <div className="bg-[#11161D] border border-white/5 p-8 rounded-3xl space-y-4 fade-slide-up" style={{ animationDelay: "200ms" }}>
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20 mb-6">
                <Target className="text-amber-500" size={24} />
              </div>
              <h3 className="text-xl font-bold">Breaking Rules</h3>
              <p className="text-zinc-400 leading-relaxed text-sm">Moving stop losses or taking profits too early. TradeVault's mistake tags identify exactly which rules you break most often.</p>
            </div>
            <div className="bg-[#11161D] border border-white/5 p-8 rounded-3xl space-y-4 fade-slide-up" style={{ animationDelay: "300ms" }}>
              <div className="w-12 h-12 bg-[#3B82F6]/10 rounded-2xl flex items-center justify-center border border-[#3B82F6]/20 mb-6">
                <BarChart3 className="text-[#3B82F6]" size={24} />
              </div>
              <h3 className="text-xl font-bold">Data Overload</h3>
              <p className="text-zinc-400 leading-relaxed text-sm">Spreadsheets are static. You need dynamic pacing rings and execution scores that auto-calculate your performance edge.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      <section id="features" className="py-32 px-6 relative z-10 max-w-7xl mx-auto space-y-32">
        
        {/* Feature 1: Trade Logging */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 relative group">
             <div className="absolute inset-0 bg-[#3B82F6]/10 blur-[60px] rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
             <div className="relative bg-gradient-to-br from-[#11161D] to-[#0D1218] border border-white/10 p-6 rounded-[2rem] shadow-2xl">
               <div className="flex justify-between items-center mb-6">
                  <h4 className="font-bold text-white">New Trade</h4>
                  <div className="flex gap-2">
                    <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-1 rounded">Buy</span>
                    <span className="bg-white/5 text-zinc-400 text-xs font-bold px-2 py-1 rounded">EUR/USD</span>
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-[#0B0F14] p-3 rounded-xl border border-white/5">
                       <p className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Entry Price</p>
                       <p className="font-mono text-sm">1.09450</p>
                     </div>
                     <div className="bg-[#0B0F14] p-3 rounded-xl border border-white/5">
                       <p className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Exit Price</p>
                       <p className="font-mono text-sm text-emerald-400">1.09800</p>
                     </div>
                  </div>
                  <div className="bg-[#0B0F14] p-3 rounded-xl border border-white/5 flex justify-between items-center">
                     <div>
                       <p className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Net PnL</p>
                       <p className="font-bold text-emerald-400">+$350.00</p>
                     </div>
                     <span className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg"><Check size={16} /></span>
                  </div>
               </div>
             </div>
          </div>
          <div className="order-1 lg:order-2 space-y-6">
            <div className="w-12 h-12 bg-[#3B82F6]/10 rounded-2xl flex items-center justify-center border border-[#3B82F6]/20">
              <Zap className="text-[#3B82F6]" size={24} />
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">Lightning Fast Trade Logging</h2>
            <p className="text-zinc-400 text-lg leading-relaxed">Input your executions with a structured, intuitive UI. Stop fighting with clunky spreadsheets and start organizing your data instantly.</p>
            <ul className="space-y-3 pt-4">
              <li className="flex items-center gap-3 text-zinc-300"><Check size={18} className="text-[#3B82F6]" /> Automatic Risk-to-Reward calculation</li>
              <li className="flex items-center gap-3 text-zinc-300"><Check size={18} className="text-[#3B82F6]" /> Support for multiple currencies</li>
              <li className="flex items-center gap-3 text-zinc-300"><Check size={18} className="text-[#3B82F6]" /> Track exact entry and exit levels</li>
            </ul>
          </div>
        </div>

        {/* Feature 2: Journal System */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <div className="w-12 h-12 bg-[#FF4D6D]/10 rounded-2xl flex items-center justify-center border border-[#FF4D6D]/20">
              <BookText className="text-[#FF4D6D]" size={24} />
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">Advanced Journaling & Psychology</h2>
            <p className="text-zinc-400 text-lg leading-relaxed">Log your emotional state before and after every trade. Tag your mistakes to find exactly what's costing you money.</p>
            <ul className="space-y-3 pt-4">
              <li className="flex items-center gap-3 text-zinc-300"><Check size={18} className="text-[#FF4D6D]" /> Pre & Post Trade Mood Tracking</li>
              <li className="flex items-center gap-3 text-zinc-300"><Check size={18} className="text-[#FF4D6D]" /> Mistake tagging (FOMO, Revenge Trading)</li>
              <li className="flex items-center gap-3 text-zinc-300"><Check size={18} className="text-[#FF4D6D]" /> A/B/C/D Quality Execution Scoring</li>
            </ul>
          </div>
          <div className="relative group">
             <div className="absolute inset-0 bg-[#FF4D6D]/10 blur-[60px] rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
             <div className="relative bg-gradient-to-br from-[#11161D] to-[#0D1218] border border-white/10 p-6 rounded-[2rem] shadow-2xl space-y-4">
                <div className="bg-[#0B0F14] border border-white/5 p-4 rounded-xl space-y-3">
                   <p className="text-xs font-bold text-zinc-500 uppercase">Mistakes Made</p>
                   <div className="flex flex-wrap gap-2">
                     <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded">FOMO</span>
                     <span className="bg-amber-500/20 text-amber-500 text-xs px-2 py-1 rounded">Early Exit</span>
                   </div>
                </div>
                <div className="bg-[#0B0F14] border border-white/5 p-4 rounded-xl space-y-3">
                   <div className="flex justify-between items-center">
                      <p className="text-xs font-bold text-zinc-500 uppercase">Emotional State</p>
                      <span className="bg-[#00FFB2]/10 text-[#00FFB2] text-xs font-bold px-2 py-1 rounded border border-[#00FFB2]/20">A-Quality Trade</span>
                   </div>
                   <div className="flex gap-4">
                      <div className="flex items-center gap-2"><span className="text-xl">😎</span> <span className="text-sm font-medium">Confident</span></div>
                      <span className="text-zinc-600">→</span>
                      <div className="flex items-center gap-2"><span className="text-xl">🙂</span> <span className="text-sm font-medium">Satisfied</span></div>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Feature 3: Targets & Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 relative group">
             <div className="absolute inset-0 bg-[#00FFB2]/10 blur-[60px] rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
             <div className="relative bg-gradient-to-br from-[#11161D] to-[#0D1218] border border-white/10 p-6 rounded-[2rem] shadow-2xl flex items-center justify-center">
                {/* Simulated Radial Progress */}
                <div className="relative w-48 h-48 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
                    <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray="502" strokeDashoffset="150" className="text-[#00FFB2] drop-shadow-[0_0_10px_rgba(0,255,178,0.5)] transition-all duration-1000 ease-out" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <span className="text-3xl font-black text-white">70%</span>
                     <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">On Track</span>
                  </div>
                </div>
                
                {/* Floating execution score */}
                <div className="absolute -bottom-6 -right-6 bg-[#0B0F14] border border-[#00FFB2]/20 p-4 rounded-2xl shadow-xl flex items-center gap-4">
                   <div className="w-10 h-10 bg-[#00FFB2]/10 rounded-full flex items-center justify-center"><Target size={20} className="text-[#00FFB2]" /></div>
                   <div>
                     <p className="text-[10px] uppercase font-bold text-zinc-500 leading-tight mb-1">Execution Score</p>
                     <p className="text-lg font-black text-[#00FFB2] leading-none">92 / 100</p>
                   </div>
                </div>
             </div>
          </div>
          <div className="order-1 lg:order-2 space-y-6">
            <div className="w-12 h-12 bg-[#00FFB2]/10 rounded-2xl flex items-center justify-center border border-[#00FFB2]/20">
              <Target className="text-[#00FFB2]" size={24} />
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">Consistency Targets & Deep Analytics</h2>
            <p className="text-zinc-400 text-lg leading-relaxed">Gamify your trading with pacing algorithms. Visualize your execution score and find your true mathematical edge in the markets.</p>
            <ul className="space-y-3 pt-4">
              <li className="flex items-center gap-3 text-zinc-300"><Check size={18} className="text-[#00FFB2]" /> Daily & Weekly pacing targets</li>
              <li className="flex items-center gap-3 text-zinc-300"><Check size={18} className="text-[#00FFB2]" /> Advanced Radar Charts for execution scoring</li>
              <li className="flex items-center gap-3 text-zinc-300"><Check size={18} className="text-[#00FFB2]" /> Win Rate, Profit Factor, and Bias tracking</li>
            </ul>
          </div>
        </div>

      </section>

      {/* Pricing / Trial Section */}
      <section id="pricing" className="py-24 px-6 relative overflow-hidden">
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
              <PricingTier feature="Basic Trade Logging" />
              <PricingTier feature="Standard Journal View" />
              <PricingTier feature="Basic Statistics" />
              <li className="flex items-center gap-3 opacity-30 select-none">
                <div className="w-5 h-5 rounded-full border border-white/10 flex items-center justify-center shrink-0">
                  <span className="text-[10px]">✕</span>
                </div>
                <span className="text-xs text-zinc-500 line-through">Advanced Edge Analytics</span>
              </li>
            </ul>
            <Link href="/signup?plan=free" className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl transition-all text-center">
              Start Free Plan
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="bg-gradient-to-br from-[#11161D] to-[#0D1218] border-2 border-[#00FFB2]/20 p-8 rounded-[32px] space-y-8 relative overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,255,178,0.05)]">
            <div className="absolute top-0 right-0 p-4">
               <span className="px-3 py-1 bg-[#00FFB2] text-black text-[10px] font-black uppercase rounded-full">Save 40%</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#00FFB2]">Professional Access</h3>
              <p className="text-3xl font-black">₹299 <span className="text-sm text-zinc-500 font-medium font-bold">/ month</span></p>
              <p className="text-sm font-bold text-zinc-400">or <span className="text-white">₹1999</span> / year</p>
            </div>
            <ul className="space-y-4 flex-1">
              <PricingTier feature="Elite Target Engine (Daily/Weekly)" pro />
              <PricingTier feature="Advanced Analytics Dashboard" pro />
              <PricingTier feature="Mistake Intelligence Tracking" pro />
              <PricingTier feature="Export (PDF, Excel, CSV)" pro />
              <PricingTier feature="AI-Powered Trade Insights" pro />
              <PricingTier feature="Unlimited Multi-Device Sync" pro />
            </ul>
            <div className="space-y-4">
              <Link href={user ? (hasUsedTrial ? "/billing" : "/dashboard") : "/signup?plan=trial"} className="w-full py-4 bg-[#00FFB2] text-black font-black rounded-2xl hover:shadow-[0_0_20px_rgba(0,255,178,0.4)] transition-all block text-center">
                {user && hasUsedTrial ? "Upgrade to Pro instantly" : "Start 7-Day Free Trial"}
              </Link>
              <p className="text-[10px] text-zinc-500 text-center uppercase tracking-widest font-bold">Instant Professional Unlock</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24 px-6 text-center">
         <div className="max-w-4xl mx-auto bg-gradient-to-r from-[#00FFB2]/10 to-[#3B82F6]/10 border border-white/5 rounded-[40px] p-12 md:p-20 space-y-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none" />
            <h2 className="text-4xl md:text-6xl font-black tracking-tight">Start Tracking. <br /> Start Improving.</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">Join thousands of disciplined traders who use TradeVault to escape inconsistency and master the markets.</p>
            <Link href={user ? (hasUsedTrial ? "/billing" : "/dashboard") : "/signup"} className="inline-block px-10 py-5 bg-white text-black font-black rounded-2xl hover:bg-[#00FFB2] transition-colors relative z-10">
               {user && hasUsedTrial ? "Upgrade Now" : "Start Free Trial"}
            </Link>
            <p className="text-zinc-500 text-sm mt-4 font-medium relative z-10">{user && hasUsedTrial ? "Instant Professional Unlock." : "Try free for 7 days. Pay only if you choose to upgrade."}</p>
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
