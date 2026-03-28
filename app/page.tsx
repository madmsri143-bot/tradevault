"use client";

import Link from "next/link";
import {
  ChevronRight, Check, Play, Zap, ShieldCheck, BrainCircuit, Sparkles,
  HeartPulse, Star, Upload, X, ArrowRight, LineChart, Target,
  AlertTriangle, Eye, TrendingUp, FileText, Clock, Brain, MessageSquare
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useTrial } from "@/components/TrialGuard";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";

/* ─── Rotating AI thoughts for the orb ─── */
const AI_THOUGHTS = [
  "Analyzing last 7 trades...",
  "Pattern: Early exits detected",
  "Confidence improving ↑",
  "Win rate trending at 68.4%",
  "Emotional state: Stable",
  "Risk exposure: Within limits",
  "Suggestion: Tighten stops on XAUUSD",
  "Best session: London Open",
];

/* ─── Chat conversation for "Buddy Watching" section ─── */
const CHAT_SEQUENCE = [
  { from: "user", text: "I followed my plan today", delay: 0 },
  { from: "bud", text: "You exited 3 trades early. Fear pattern detected.", delay: 1200 },
  { from: "user", text: "But I was profitable overall", delay: 2800 },
  { from: "bud", text: "True — but you left $847 on the table. Your exits cluster around +0.5R. Consider trailing.", delay: 4200 },
];

/* ─── Floating AI insight tips ─── */
const BUD_INSIGHTS = [
  "You trade better after 2PM",
  "Avoid trading after 2 losses",
  "Your win rate drops on Fridays",
  "Gold trades are your edge",
  "Reduce lot size when anxious",
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const { hasUsedTrial } = useTrial();
  const router = useRouter();

  // Hero states
  const [aiThoughtIdx, setAiThoughtIdx] = useState(0);
  const [uploadStep, setUploadStep] = useState(0);
  const [chatVisible, setChatVisible] = useState(0);
  const [insightIdx, setInsightIdx] = useState(0);

  // Refs for scroll reveal
  const revealRefs = useRef<(HTMLElement | null)[]>([]);
  const addRevealRef = useCallback((el: HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) {
      revealRefs.current.push(el);
    }
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.replace(hasUsedTrial ? "/billing" : "/dashboard");
    }
  }, [user, loading, hasUsedTrial, router]);

  // AI thought rotator
  useEffect(() => {
    const interval = setInterval(() => setAiThoughtIdx(p => (p + 1) % AI_THOUGHTS.length), 2400);
    return () => clearInterval(interval);
  }, []);

  // Upload mock stepper
  useEffect(() => {
    const interval = setInterval(() => setUploadStep(p => (p + 1) % 5), 2000);
    return () => clearInterval(interval);
  }, []);

  // Chat sequence autoplay
  useEffect(() => {
    const timers = CHAT_SEQUENCE.map((msg, i) =>
      setTimeout(() => setChatVisible(i + 1), msg.delay + 2000)
    );
    const reset = setTimeout(() => setChatVisible(0), 10000);
    const restart = setInterval(() => {
      setChatVisible(0);
      CHAT_SEQUENCE.forEach((msg, i) =>
        setTimeout(() => setChatVisible(i + 1), msg.delay + 500)
      );
    }, 12000);
    return () => { timers.forEach(clearTimeout); clearTimeout(reset); clearInterval(restart); };
  }, []);

  // Insight rotator
  useEffect(() => {
    const interval = setInterval(() => setInsightIdx(p => (p + 1) % BUD_INSIGHTS.length), 3500);
    return () => clearInterval(interval);
  }, []);

  // Scroll reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
    );
    revealRefs.current.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  if (loading || user) return <div className="min-h-screen bg-[#0B0F14]" />;

  const ctaLink = user ? (hasUsedTrial ? "/billing" : "/dashboard") : "/signup?plan=trial";
  const ctaText = user ? (hasUsedTrial ? "Upgrade to Pro" : "Launch App") : "Start With Your Trading Buddy";

  return (
    <div className="min-h-screen bg-[#0B0F14] text-white selection:bg-[#00FFB2]/30 overflow-x-hidden">

      {/* ═══════════ AMBIENT BLURS ═══════════ */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[15%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[#00FFB2]/8 blur-[160px]" />
        <div className="absolute top-[30%] -right-[15%] w-[45%] h-[45%] rounded-full bg-[#3B82F6]/6 blur-[180px]" />
        <div className="absolute -bottom-[15%] left-[25%] w-[40%] h-[40%] rounded-full bg-[#A855F7]/5 blur-[140px]" />
      </div>

      {/* ═══════════ NAVBAR ═══════════ */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00FFB2] to-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(0,255,178,0.3)] group-hover:shadow-[0_0_30px_rgba(0,255,178,0.5)] transition-all">
            <LineChart size={18} className="text-black" />
          </div>
          <span className="text-xl font-brand font-black tracking-tight">JournalBud</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Login</Link>
          <Link href="/demo" className="text-sm font-medium text-zinc-400 hover:text-[#00FFB2] transition-colors flex items-center gap-1.5">
            <Play size={14} className="text-[#00FFB2]" /> Live Demo
          </Link>
          <Link href={ctaLink} className="bg-white text-black px-5 py-2.5 rounded-full text-sm font-bold hover:bg-[#00FFB2] hover:shadow-[0_0_20px_rgba(0,255,178,0.4)] transition-all hidden sm:inline-flex">
            {user ? (hasUsedTrial ? "Upgrade" : "Dashboard") : "Start Free"}
          </Link>
        </div>
      </nav>

      {/* ═══════════ 1. HERO — "YOU TRADE. YOUR BUDDY UNDERSTANDS." ═══════════ */}
      <section className="relative z-10 pt-12 md:pt-20 pb-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left: Copy */}
          <div className="space-y-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00FFB2]/10 border border-[#00FFB2]/20 text-[#00FFB2] text-xs font-bold uppercase tracking-widest">
              <Brain size={14} /> Your AI Trading Companion
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05]">
              You Trade.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FFB2] via-[#3BE5AD] to-[#00FFB2] animate-gradient-x">
                Your Buddy
              </span><br />
              Understands.
            </h1>
            <p className="text-lg md:text-xl text-zinc-400 max-w-lg leading-relaxed">
              JournalBud reads your trades, tracks your behavior, and helps you improve — <strong className="text-zinc-200">automatically.</strong>
            </p>
            <div className="flex flex-col pt-2">
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <Link href={ctaLink} className="px-8 py-4 bg-[#00FFB2] text-black font-black rounded-2xl flex items-center justify-center gap-2 hover:shadow-[0_0_40px_rgba(0,255,178,0.4)] hover:-translate-y-1 transition-all text-base">
                  {ctaText} <ChevronRight size={20} />
                </Link>
              </div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">No card. No setup. Just upload and begin.</p>
            </div>
            <div className="flex items-center gap-6 pt-2 text-zinc-500">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest"><ShieldCheck size={16} className="text-[#00FFB2]" /> Zero Data Stored</div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest"><Zap size={16} className="text-amber-400" /> 2s Processing</div>
            </div>
          </div>

          {/* Right: Living AI Orb + Floating Thoughts */}
          <div className="relative flex items-center justify-center min-h-[420px] animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            {/* Outermost glow ring */}
            <div className="absolute w-72 h-72 rounded-full bg-[#00FFB2]/5 blur-[60px] animate-orb-pulse" />
            {/* Pulsing rings */}
            <div className="absolute w-56 h-56 rounded-full border border-[#00FFB2]/10 animate-neural-ring" />
            <div className="absolute w-44 h-44 rounded-full border border-[#00FFB2]/15 animate-neural-ring" style={{ animationDelay: "0.8s" }} />
            <div className="absolute w-32 h-32 rounded-full border border-[#00FFB2]/20 animate-neural-ring" style={{ animationDelay: "1.6s" }} />

            {/* Core orb */}
            <div className="relative w-28 h-28 rounded-full animate-orb-float">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#00FFB2] via-[#00D99A] to-[#3B82F6] opacity-80 animate-orb-glow" />
              <div className="absolute inset-1 rounded-full bg-gradient-to-br from-[#00FFB2]/90 to-[#3B82F6]/60 backdrop-blur-xl" />
              <div className="absolute inset-0 flex items-center justify-center">
                <BrainCircuit size={36} className="text-black/60" />
              </div>
            </div>

            {/* Floating AI thoughts */}
            <div className="absolute top-8 right-4 md:right-0 bg-[#11161D]/90 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 max-w-[220px] animate-insight-float shadow-lg" style={{ animationDelay: "0s" }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-[#00FFB2] animate-blink" />
                <span className="text-[10px] uppercase font-bold text-[#00FFB2] tracking-widest">Live Analysis</span>
              </div>
              <p className="text-xs text-zinc-300 font-medium leading-snug" key={aiThoughtIdx}>
                {AI_THOUGHTS[aiThoughtIdx]}
              </p>
            </div>

            <div className="absolute bottom-10 left-2 md:left-0 bg-[#11161D]/90 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 max-w-[200px] animate-insight-float shadow-lg" style={{ animationDelay: "2s" }}>
              <div className="flex items-center gap-2 mb-1">
                <Eye size={12} className="text-purple-400" />
                <span className="text-[10px] uppercase font-bold text-purple-400 tracking-widest">Insight</span>
              </div>
              <p className="text-xs text-zinc-300 font-medium leading-snug" key={insightIdx}>
                {BUD_INSIGHTS[insightIdx]}
              </p>
            </div>

            <div className="absolute top-[55%] -right-4 md:right-[-20px] bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-xl px-3 py-2 animate-insight-float" style={{ animationDelay: "1s" }}>
              <span className="text-[11px] font-bold text-emerald-400">Confidence ↑ 12%</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ 2. "YOUR BUD IS WATCHING" — CHAT SECTION ═══════════ */}
      <section ref={addRevealRef} className="py-24 px-6 relative z-10 border-t border-white/5 reveal" id="features">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest">
              <Eye size={14} /> Behavioral Intelligence
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
              It Watches What<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-[#00FFB2]">You Miss</span>
            </h2>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto">JournalBud doesn&apos;t just log your trades. It understands your psychology and talks back.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            {/* Chat Mock */}
            <div className="bg-[#11161D]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 space-y-4 shadow-2xl min-h-[350px]">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
                <div className="w-3 h-3 rounded-full bg-[#00FFB2] animate-blink" />
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Conversation with your Bud</span>
              </div>

              {CHAT_SEQUENCE.map((msg, i) => (
                <div
                  key={i}
                  className={`transition-all duration-500 ${i < chatVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <div className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"} mb-3`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.from === "user"
                      ? "bg-zinc-800 border border-white/5 text-zinc-200"
                      : "bg-gradient-to-r from-[#00FFB2]/15 to-purple-500/10 border border-[#00FFB2]/20 text-zinc-100"
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        {msg.from === "bud" && <BrainCircuit size={12} className="text-[#00FFB2]" />}
                        <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-500">
                          {msg.from === "user" ? "You" : "JournalBud"}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Feature cards */}
            <div className="space-y-4">
              {[
                { icon: HeartPulse, color: "purple", title: "Emotional Tracking", desc: "Pre & post trade emotional state logging. Spot fear, greed, and tilt patterns before they cost you." },
                { icon: AlertTriangle, color: "amber", title: "Mistake Intelligence", desc: "Auto-detects FOMO, revenge trading, early exits, and overtrading. Your blind spots, illuminated." },
                { icon: BrainCircuit, color: "emerald", title: "Weekly AI Reports", desc: "Every week, your Bud synthesizes your data into actionable strategy advice. Like a coach in your pocket." },
                { icon: TrendingUp, color: "blue", title: "Behavior Patterns", desc: "Discover when you trade best, which pairs are your edge, and what conditions trigger mistakes." },
              ].map((f, i) => {
                const colors: Record<string, string> = {
                  purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
                  amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
                  emerald: "bg-[#00FFB2]/10 border-[#00FFB2]/20 text-[#00FFB2]",
                  blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
                };
                return (
                  <div key={i} className="bg-[#11161D]/60 backdrop-blur-sm border border-white/5 rounded-2xl p-5 flex gap-4 items-start hover:border-white/10 hover:-translate-y-0.5 transition-all group cursor-default">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${colors[f.color]}`}>
                      <f.icon size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm mb-1">{f.title}</h3>
                      <p className="text-zinc-400 text-xs leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ 3. MAGIC INPUT — "JUST DROP YOUR TRADES" ═══════════ */}
      <section ref={addRevealRef} className="py-24 px-6 relative z-10 bg-gradient-to-b from-[#0B0F14] via-[#0D1117] to-[#0B0F14] border-y border-white/5 reveal">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest">
              <Upload size={14} /> Zero-Friction Input
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight">
              Just Drop Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3B82F6] to-[#00FFB2]">Trades</span>
            </h2>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto">Screenshot, paste, or PDF. Your Bud extracts everything instantly.</p>
          </div>

          {/* Upload → Scan → Fill animation */}
          <div className="relative max-w-[700px] mx-auto">
            <div className="absolute inset-0 bg-[#00FFB2]/5 blur-[100px] rounded-full" />
            <div className="relative bg-[#11161D]/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex min-h-[380px]">

              {/* Left: Upload zone */}
              <div className="w-1/2 p-6 border-r border-white/5 bg-[#0B0E13]/80 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="text-center space-y-4 z-10 w-full">
                  <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center transition-all duration-700
                    ${uploadStep <= 1 ? "bg-zinc-800/80 border border-zinc-700 text-zinc-400" :
                      uploadStep === 2 ? "bg-[#3B82F6]/20 border border-[#3B82F6]/40 text-[#3B82F6]" :
                      "bg-[#00FFB2]/20 border border-[#00FFB2]/40 text-[#00FFB2]"}`}>
                    {uploadStep <= 1 ? <Upload size={32} /> :
                     uploadStep === 2 ? <Eye size={32} className="animate-pulse" /> :
                     <Check size={32} />}
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 h-4">
                    {uploadStep <= 1 ? "Drop Screenshot or PDF" : uploadStep === 2 ? "AI Scanning..." : "Data Extracted ✓"}
                  </p>
                </div>

                {/* Upload method pills */}
                <div className="flex gap-2 mt-6 z-10">
                  {["Screenshot", "PDF", "Paste"].map((m, i) => (
                    <span key={m} className={`text-[9px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-lg border transition-all duration-500
                      ${uploadStep === i ? "border-[#00FFB2]/30 bg-[#00FFB2]/10 text-[#00FFB2]" : "border-white/5 bg-white/5 text-zinc-500"}`}>
                      {m}
                    </span>
                  ))}
                </div>

                {/* Ghost table appearing */}
                <div className={`absolute bottom-4 left-4 right-4 bg-zinc-900/90 border border-white/10 rounded-xl p-3 transition-all duration-700 ${uploadStep >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                  <div className="flex justify-between items-center text-[8px] font-mono text-zinc-500 border-b border-white/10 pb-1 mb-2">
                    <span>Pair</span><span>Type</span><span>Lot</span><span>Profit</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-mono font-bold">
                      <span>XAUUSD</span><span className="text-emerald-500">BUY</span><span>0.10</span><span className="text-red-500">-114.65</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono font-bold">
                      <span>EURUSD</span><span className="text-red-400">SELL</span><span>0.50</span><span className="text-emerald-400">+230.00</span>
                    </div>
                  </div>
                </div>

                {/* Scanning line */}
                {uploadStep === 2 && (
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-[#3B82F6] shadow-[0_0_15px_#3B82F6,0_0_30px_#3B82F6]" style={{ animation: "scan 1.5s ease-in-out infinite" }} />
                )}
              </div>

              {/* Right: Auto-filled form */}
              <div className="w-1/2 p-6 bg-gradient-to-br from-[#11161D] to-[#0D1218] flex flex-col space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-sm text-[#00FFB2]">Log New Trade</h3>
                  <X size={14} className="text-zinc-600" />
                </div>

                {[
                  { label: "Symbol", value: "XAUUSD", full: true },
                  { label: "Type", value: "Buy", half: true },
                  { label: "Lot Size", value: "0.10", half: true },
                  { label: "Result", value: "Loss", half: true, isLoss: true },
                  { label: "Amount", value: "114.65", half: true, isLoss: true },
                ].map((field, i) => (
                  <div key={field.label} className={field.full ? "" : "inline-block w-[calc(50%-4px)] mr-1"}>
                    <p className="text-[9px] uppercase text-zinc-500 font-bold mb-1">{field.label}</p>
                    <div className={`w-full h-8 bg-[#0B0E13] border rounded-lg px-2 flex items-center transition-all duration-700 ${uploadStep >= 3 ? (field.isLoss ? "border-red-500/30" : "border-emerald-500/30") : "border-white/5"}`}>
                      {uploadStep >= 3 && (
                        <span className={`text-xs font-bold ${field.isLoss ? "text-red-400" : i === 0 ? "text-emerald-400" : "text-white"}`}>
                          {field.value}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                <div className={`mt-auto w-full h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all duration-700 ${uploadStep >= 3 ? "bg-[#00FFB2] text-black shadow-[0_0_20px_rgba(0,255,178,0.2)]" : "bg-zinc-800 text-zinc-500"}`}>
                  {uploadStep >= 4 ? "✓ Trade Saved" : "Save Trade"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ 4. DATA → INTELLIGENCE TRANSFORMATION ═══════════ */}
      <section ref={addRevealRef} className="py-24 px-6 relative z-10 reveal">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-6xl font-black tracking-tight">
              Raw Trades →<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FFB2] to-[#3B82F6]">Real Awareness</span>
            </h2>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto">Your past becomes insight. Every trade teaches you something — your Bud makes sure you learn it.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { label: "Total P&L", value: "+$2,847", sub: "This Month", color: "text-[#00FFB2]", bg: "from-[#00FFB2]/10 to-transparent" },
              { label: "Win Rate", value: "68.4%", sub: "137 Trades", color: "text-[#3B82F6]", bg: "from-[#3B82F6]/10 to-transparent" },
              { label: "Emotional State", value: "Stable", sub: "↑ from Anxious", color: "text-purple-400", bg: "from-purple-500/10 to-transparent" },
              { label: "Bud Score", value: "82/100", sub: "Discipline Index", color: "text-amber-400", bg: "from-amber-500/10 to-transparent" },
            ].map((stat, i) => (
              <div key={i} className={`bg-gradient-to-b ${stat.bg} bg-[#11161D]/60 backdrop-blur-sm border border-white/5 rounded-2xl p-5 md:p-6 text-center hover:border-white/10 hover:-translate-y-1 transition-all`}>
                <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-2">{stat.label}</p>
                <p className={`text-2xl md:text-3xl font-black ${stat.color}`}>{stat.value}</p>
                <p className="text-[11px] text-zinc-500 font-medium mt-1">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 5. WEEKLY AI REPORT — "YOUR WEEK, EXPLAINED BY AI" ═══════════ */}
      <section ref={addRevealRef} className="py-24 px-6 relative z-10 border-y border-white/5 reveal">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left: Report mock */}
            <div className="bg-[#11161D]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[#00FFB2]" />
                  <span className="text-sm font-bold text-white">Weekly AI Report</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Mar 17 — Mar 23</span>
              </div>

              {/* Score */}
              <div className="flex items-center gap-4 bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/15 rounded-2xl p-4">
                <div className="w-14 h-14 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center">
                  <span className="text-xl font-black text-red-400">20</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-red-400 uppercase tracking-widest">Discipline Score</p>
                  <p className="text-zinc-400 text-xs mt-0.5">Critical improvement needed</p>
                </div>
              </div>

              {/* Findings */}
              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle size={14} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Primary Mistake: Emotional Trading</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">4 of 7 losing trades were triggered after consecutive losses. Revenge pattern confirmed.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-lg bg-[#00FFB2]/10 border border-[#00FFB2]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Target size={14} className="text-[#00FFB2]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Advice: Implement 2-Loss Rule</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Stop trading after 2 consecutive losses. Historical data shows 73% of your recovery trades fail.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Copy */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00FFB2]/10 border border-[#00FFB2]/20 text-[#00FFB2] text-xs font-bold uppercase tracking-widest">
                <Sparkles size={14} /> Pro Feature
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                Your Week,<br />Explained by <span className="text-[#00FFB2]">AI</span>
              </h2>
              <p className="text-zinc-400 text-base leading-relaxed">
                Every week, your Bud compiles your performance data into a brutally honest strategy report. No fluff — just the patterns, mistakes, and specific actions to improve.
              </p>
              <div className="flex flex-col gap-3 pt-2">
                {["Mistake analysis with root causes", "Personalized trading advice", "Discipline scoring (0-100)", "Historical trend comparison"].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                    <Check size={16} className="text-[#00FFB2] shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ 6. GOALS — "DISCIPLINE, ENGINEERED" ═══════════ */}
      <section ref={addRevealRef} className="py-24 px-6 relative z-10 reveal">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest">
                <Target size={14} /> Goal Engine
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                Discipline,<br /><span className="text-amber-400">Engineered</span>
              </h2>
              <p className="text-zinc-300 text-lg leading-relaxed italic border-l-2 border-amber-500/30 pl-4">
                &ldquo;You don&apos;t rise to your goals.<br />You fall to your system.&rdquo;
              </p>
              <p className="text-zinc-400 text-base leading-relaxed">
                Set daily targets, drawdown limits, and trade count boundaries. Your Bud enforces accountability with real-time tracking against your own rules.
              </p>
            </div>

            {/* Goals mock UI */}
            <div className="order-1 lg:order-2 bg-[#11161D]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <span className="text-sm font-bold text-white">Today&apos;s Targets</span>
                <span className="text-[10px] font-bold px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg uppercase tracking-widest">Active</span>
              </div>
              {[
                { label: "Daily P&L Target", current: "$420", target: "$500", pct: 84, color: "bg-[#00FFB2]" },
                { label: "Max Drawdown", current: "$80", target: "$200", pct: 40, color: "bg-emerald-500" },
                { label: "Trade Count", current: "4", target: "6", pct: 67, color: "bg-[#3B82F6]" },
              ].map((g, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold text-zinc-300">{g.label}</span>
                    <span className="text-[11px] text-zinc-500">{g.current} / {g.target}</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${g.color} transition-all duration-1000`} style={{ width: `${g.pct}%` }} />
                  </div>
                </div>
              ))}
              <div className="bg-gradient-to-r from-[#00FFB2]/5 to-transparent border border-[#00FFB2]/10 rounded-xl p-3 flex items-start gap-2 mt-2">
                <MessageSquare size={14} className="text-[#00FFB2] shrink-0 mt-0.5" />
                <p className="text-[11px] text-zinc-300 leading-relaxed"><strong className="text-[#00FFB2]">Bud says:</strong> You&apos;re at 84% of your daily target with 2 trades left. Stay disciplined.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ 7. PRICING ═══════════ */}
      <section id="pricing" ref={addRevealRef} className="py-24 px-6 relative overflow-hidden border-t border-white/5 reveal">
        <div className="max-w-4xl mx-auto text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            Professional Tools for<br /><span className="text-[#00FFB2]">Profitable Minds</span>
          </h2>
          <p className="text-zinc-400 text-lg">Choose a path that fits your trading journey.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto relative z-10">
          {/* Free */}
          <div className="bg-[#11161D]/80 backdrop-blur-sm border border-white/5 p-8 rounded-[32px] space-y-8 flex flex-col group hover:border-white/10 transition-all">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-zinc-400">Standard Plan</h3>
              <p className="text-3xl font-black italic">Free <span className="text-sm text-zinc-500 font-medium not-italic">/ forever</span></p>
            </div>
            <ul className="space-y-4 flex-1">
              <PricingTier feature="Manual Trade Logging" />
              <PricingTier feature="Standard Journal View" />
              <PricingTier feature="Basic Analytics Dashboard" />
              <PricingTier feature="Mistake Intelligence Tracking" />
              <PricingExcluded feature="Automated Screenshot Logging" />
              <PricingExcluded feature="Elite Target Engine & Export" />
              <PricingExcluded feature="AI Weekly Insights Report" />
            </ul>
            <Link href="/signup?plan=free" className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl transition-all text-center block">
              Start Free Plan
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-gradient-to-br from-[#11161D] to-[#0D1218] border-2 border-[#00FFB2]/20 p-8 rounded-[32px] space-y-8 relative overflow-hidden flex flex-col shadow-[0_0_60px_rgba(0,255,178,0.05)] transform md:-translate-y-4 hover:border-[#00FFB2]/40 transition-all">
            <div className="absolute top-0 right-0 p-4">
              <span className="px-3 py-1 bg-[#00FFB2] text-black text-[10px] font-black uppercase rounded-full tracking-widest">AI Buddy Inside</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#00FFB2]">Professional Access</h3>
              <p className="text-3xl font-black">$2.99 <span className="text-sm text-zinc-500 font-medium">/ month</span></p>
              <p className="text-sm font-bold text-zinc-400">or <span className="text-white">$19.99</span> / year</p>
            </div>
            <ul className="space-y-4 flex-1">
              <PricingTier feature="Unlimited AI Screenshot Extraction" pro />
              <PricingTier feature="Full Trading Journal" pro />
              <PricingTier feature="Deep Analytics Dashboard" pro />
              <PricingTier feature="Mistake Intelligence Tracking" pro />
              <PricingTier feature="Export Capabilities (PDF, CSV)" pro />
              <PricingTier feature="Elite Target Engine (Daily/Weekly)" pro />
              <PricingTier feature="Weekly AI Trading Strategy Report" pro />
            </ul>
            <Link href={ctaLink} className="w-full py-4 bg-[#00FFB2] text-black font-black rounded-2xl hover:shadow-[0_0_20px_rgba(0,255,178,0.4)] transition-all block text-center">
              {user && hasUsedTrial ? "Upgrade to Pro" : "Start 7-Day Free Trial"}
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ 8. FLOATING BUD INSIGHT BAR ═══════════ */}
      <section ref={addRevealRef} className="py-12 px-6 relative z-10 reveal">
        <div className="max-w-3xl mx-auto">
          <div className="bg-[#11161D]/80 backdrop-blur-xl border border-[#00FFB2]/15 rounded-2xl p-5 flex items-center gap-4 shadow-[0_0_40px_rgba(0,255,178,0.05)]">
            <div className="w-10 h-10 rounded-xl bg-[#00FFB2]/15 border border-[#00FFB2]/25 flex items-center justify-center shrink-0 animate-orb-pulse">
              <BrainCircuit size={20} className="text-[#00FFB2]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase font-bold tracking-widest text-[#00FFB2] mb-0.5">Your Bud is thinking...</p>
              <p className="text-sm text-zinc-300 font-medium truncate" key={insightIdx}>{BUD_INSIGHTS[insightIdx]}</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#00FFB2] animate-blink shrink-0" />
          </div>
        </div>
      </section>

      {/* ═══════════ 9. FOOTER CTA ═══════════ */}
      <section className="py-24 px-6 text-center relative z-10">
        <div className="max-w-4xl mx-auto relative">
          <div className="absolute inset-0 bg-[#00FFB2]/5 blur-[120px] rounded-full" />
          <div className="relative bg-gradient-to-b from-[#11161D] to-[#0B0E13] border border-white/5 rounded-[40px] p-12 md:p-20 space-y-8">
            <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
              Your Buddy is<br /><span className="text-[#00FFB2]">Ready.</span>
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto text-lg">Stop guessing. Start understanding. Let your AI trading companion transform how you grow.</p>
            <Link href={ctaLink} className="mt-8 px-10 py-5 bg-[#00FFB2] text-black font-black rounded-3xl hover:shadow-[0_0_40px_rgba(0,255,178,0.5)] hover:-translate-y-1 transition-all inline-flex items-center gap-2 text-lg">
              Start With Your Trading Buddy <ArrowRight size={20} />
            </Link>
            <p className="text-zinc-500 text-sm font-medium">100% Secure · In-Memory Processing · No Card Required</p>
          </div>
        </div>
      </section>

    </div>
  );
}

/* ─── Pricing sub-components ─── */
function PricingTier({ feature, pro = false }: { feature: string; pro?: boolean }) {
  return (
    <li className="flex items-center gap-3">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${pro ? "bg-[#00FFB2]/20 text-[#00FFB2]" : "bg-zinc-800 text-zinc-500"}`}>
        <Check size={14} strokeWidth={3} />
      </div>
      <span className={`text-sm ${pro ? "text-zinc-200 font-bold" : "text-zinc-400"}`}>{feature}</span>
    </li>
  );
}

function PricingExcluded({ feature }: { feature: string }) {
  return (
    <li className="flex items-center gap-3 opacity-30 select-none">
      <div className="w-5 h-5 rounded-full border border-white/10 flex items-center justify-center shrink-0">
        <span className="text-[10px]">✕</span>
      </div>
      <span className="text-xs text-zinc-500 line-through">{feature}</span>
    </li>
  );
}
