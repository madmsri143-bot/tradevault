"use client";

import Link from "next/link";
import Image from "next/image";
import {
  TrendingUp, BookText, Target, BarChart3, ChevronRight, Check, Play, Zap,
  ShieldCheck, BrainCircuit, Sparkles, AlertTriangle, HeartPulse, Star,
  Camera, Upload, ScanLine, X, Lock, ArrowRight, Cpu, LineChart,
  Eye, MessageCircle, FileText, Brain, Activity, Trophy, Flame, Clock,
  ChevronDown, Shield, BarChart2, PieChart, CalendarDays
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useTrial } from "@/components/TrialGuard";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import JBLogo from "@/components/ui/JBLogo";

/* ═══════════════════════════════════════════════
   UTILITY: Scroll-reveal hook
   ═══════════════════════════════════════════════ */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.unobserve(el); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ═══════════════════════════════════════════════
   HERO VISUAL — Logo Spotlight Vignette
/* ═══════════════════════════════════════════════
   HERO VISUAL — Clean Centered Logo
   ═══════════════════════════════════════════════ */
function LogoSpotlight() {
  return (
    <div className="flex items-center justify-center w-full mx-auto mb-8 animate-fade-in-up">
      <div className="transition-transform duration-700 hover:scale-105">
        <JBLogo size={200} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   AI STATUS LINE — Typewriter effect
   ═══════════════════════════════════════════════ */
function AIStatusLine({ lines }: { lines: string[] }) {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    if (typing) {
      const line = lines[idx];
      if (text.length < line.length) {
        const t = setTimeout(() => setText(line.slice(0, text.length + 1)), 35);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setTyping(false), 1800);
        return () => clearTimeout(t);
      }
    } else {
      const t = setTimeout(() => {
        setText("");
        setIdx((idx + 1) % lines.length);
        setTyping(true);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [text, typing, idx, lines]);

  return (
    <div className="flex items-center gap-2 font-mono text-xs md:text-sm text-[#D4AF37]/80 min-h-[1.5em]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse shrink-0" />
      <span>{text}</span>
      <span className="animate-blink text-[#D4AF37]">▊</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   CHAT BUBBLE — Conversation style
   ═══════════════════════════════════════════════ */
function ChatBubble({ sender, message, delay = "0ms", variant = "default" }: {
  sender: string; message: string; delay?: string; variant?: "default" | "ai";
}) {
  const isAI = variant === "ai";
  return (
    <div className="animate-chat-bubble" style={{ animationDelay: delay }}>
      <p className={`text-[10px] uppercase tracking-widest font-bold mb-1.5 ${isAI ? "text-[#D4AF37]" : "text-[#A0A0A0]"}`}>
        {sender}
      </p>
      <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-xs ${isAI
        ? "bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-zinc-200"
        : "bg-white/5 border border-[rgba(212,175,55,0.15)] text-[#A0A0A0]"}`}>
        {message}
      </div>
    </div>
  );
}

/* Removed FloatingTip as per user request */

/* ═══════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════ */
export default function LandingPage() {
  const { user, loading } = useAuth();
  const { hasUsedTrial } = useTrial();
  const router = useRouter();
  const [mockStep, setMockStep] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  // Scroll tracking for parallax
  useEffect(() => {
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.replace(hasUsedTrial ? "/billing" : "/dashboard");
    }
  }, [user, loading, hasUsedTrial, router]);

  // Upload mock animation
  useEffect(() => {
    const interval = setInterval(() => setMockStep(prev => (prev + 1) % 4), 2800);
    return () => clearInterval(interval);
  }, []);

  // Scroll reveal observer
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); } }),
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const ctaHref = user ? (hasUsedTrial ? "/billing" : "/dashboard") : "/signup?plan=trial";
  const ctaText = user ? (hasUsedTrial ? "Upgrade to Pro" : "Launch App") : "Start With Your Trading Buddy";

  if (loading || user) return <div className="min-h-screen bg-[#0B0F14]" />;

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#EAEAEA] selection:bg-[#D4AF37]/30 overflow-x-hidden">

      {/* ── DYNAMIC BACKGROUND ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[#D4AF37]/5 blur-[150px]"
          style={{ transform: `translateY(${scrollY * 0.05}px)` }} />
        <div className="absolute top-[30%] -right-[15%] w-[40%] h-[40%] rounded-full bg-[#D4AF37]/5 blur-[180px]"
          style={{ transform: `translateY(${scrollY * -0.03}px)` }} />
        <div className="absolute -bottom-[15%] left-[25%] w-[35%] h-[35%] rounded-full bg-zinc-500/5 blur-[120px]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px"
          }} />
      </div>

      {/* ── NAVBAR ── */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-3 group">
          <JBLogo size={40} />
          <span className="text-xl font-brand font-black tracking-tight">JournalBud</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#A0A0A0]">
          <a href="#how-it-works" className="hover:text-[#EAEAEA] transition-colors duration-300">How It Works</a>
          <a href="#features" className="hover:text-[#EAEAEA] transition-colors duration-300">Features</a>
          <a href="#pricing" className="hover:text-[#EAEAEA] transition-colors duration-300">Pricing</a>
          <Link href="/demo" className="hidden sm:flex text-sm font-medium text-[#A0A0A0] hover:text-[#D4AF37] transition-colors items-center gap-1.5">
            <Play size={14} className="text-[#D4AF37]" /> Demo
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-[#A0A0A0] hover:text-[#EAEAEA] transition-colors">
            Login
          </Link>
          <Link href={ctaHref}
            className="bg-[#D4AF37] text-black px-5 py-2.5 rounded-full text-sm font-bold hover:bg-[#D4AF37] hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] transition-all duration-300">
            Get Started
          </Link>
        </div>
      </nav>

      <style jsx global>{`
        @keyframes floatSmooth {
          0% { transform: translateY(0px); opacity: 0.8; }
          50% { transform: translateY(-8px); opacity: 1; }
          100% { transform: translateY(0px); opacity: 0.8; }
        }
        @keyframes pulseLine {
          0% { opacity: 0.2; }
          50% { opacity: 1; }
          100% { opacity: 0.2; }
        }
        .animate-pulse-line { animation: pulseLine 4s ease-in-out infinite; }
        .hero-container:hover .hover-scale-target { transform: scale(1.05); }
      `}</style>

      {/* ═══════════════════════════════════════
          1. HERO — "YOU TRADE. YOUR BUDDY UNDERSTANDS."
         ═══════════════════════════════════════ */}
      <section className="relative z-10 pt-16 md:pt-24 pb-24 px-6 max-w-5xl mx-auto flex flex-col items-center text-center">
        
        {/* Cinematic Logo Spotlight */}
        <LogoSpotlight />

        <div className="space-y-8 fade-slide-up mt-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-[11px] font-bold uppercase tracking-[0.15em] mx-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
            AI-Powered Trading Companion
          </div>

          <h1 className="text-5xl md:text-[5.5rem] font-black tracking-tight leading-[1.05]">
            You Trade.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#D4AF37] to-[#D4AF37] bg-[length:200%_auto] animate-gradient-x">
              Your Buddy
            </span>
            <br />Understands.
          </h1>

          <p className="text-lg md:text-xl text-[#A0A0A0] max-w-2xl mx-auto leading-relaxed">
            JournalBud reads your trades, tracks your behavior, and helps you improve —{" "}
            <span className="text-zinc-200 font-semibold">automatically.</span>
          </p>

          <div className="flex flex-col items-center gap-4 pt-4">
            <Link href={ctaHref}
              className="group px-8 py-4 bg-gradient-to-r from-[#D4AF37] to-[#D4AF37] text-[#0B0B0F] font-black rounded-2xl flex items-center justify-center gap-2.5 hover:shadow-[0_0_40px_rgba(212,175,55,0.4)] hover:-translate-y-1 transition-all duration-300 text-lg">
              Start With Your Trading Buddy
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform border-[#0B0B0F]" />
            </Link>
            <p className="text-[11px] font-semibold text-[#A0A0A0] uppercase tracking-[0.15em]">
              No card. No setup. Just upload and begin.
            </p>
          </div>

          <div className="flex items-center justify-center gap-8 pt-6">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#A0A0A0]">
              <ShieldCheck size={15} className="text-[#D4AF37]" /> 100% Secure
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#A0A0A0]">
              <Zap size={15} className="text-[#D4AF37]" /> 2-Second Analysis
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="flex justify-center pt-24 animate-bounce">
          <ChevronDown size={24} className="text-zinc-600" />
        </div>
      </section>

      {/* ═══════════════════════════════════════
          2. "YOUR BUD IS WATCHING" — Chat Insights
         ═══════════════════════════════════════ */}
      <section className="py-16 md:py-20 px-6 relative z-10 border-t border-[#111827]">
        <div className="max-w-6xl mx-auto">
          <div className="reveal text-center mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4AF37]/8 border border-[#D4AF37]/15 text-[#D4AF37] text-[11px] font-bold uppercase tracking-[0.15em] mb-6">
              <Eye size={14} /> Always Observing
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
              It Watches What<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#D4AF37]">You Miss</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Chat simulation */}
            <div className="reveal space-y-5 max-w-md mx-auto lg:mx-0">
              <ChatBubble sender="You" message={`"I followed my plan today"`} delay="0ms" />
              <ChatBubble sender="JournalBud" variant="ai" delay="200ms"
                message={`"You exited 3 trades early. Fear pattern detected. Your average hold time dropped 40% this week."`} />
              <ChatBubble sender="You" message={`"I felt confident though"`} delay="400ms" />
              <ChatBubble sender="JournalBud" variant="ai" delay="600ms"
                message={`"Confidence was high pre-trade, but post-trade anxiety spiked. Classic fear-of-loss cycle. Let's work on this."`} />
            </div>

            {/* Feature cards */}
            <div className="reveal grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: HeartPulse, color: "gold", title: "Emotional Tracking", desc: "Pre & post trade emotional states logged and analyzed" },
                { icon: AlertTriangle, color: "muted", title: "Mistake Intelligence", desc: "FOMO, revenge trading, early exits — auto-detected" },
                { icon: BrainCircuit, color: "gold", title: "Weekly AI Reports", desc: "Full strategy analysis delivered every Sunday" },
                { icon: Activity, color: "muted", title: "Behavior Patterns", desc: "Your trading DNA mapped across sessions" },
              ].map((f, i) => {
                const colors: Record<string, string> = {
                  purple: "from-purple-500/10 to-purple-500/5 border-purple-500/15 text-purple-400",
                  amber: "from-amber-500/10 to-amber-500/5 border-amber-500/15 text-amber-400",
                  emerald: "from-[#D4AF37]/10 to-[#D4AF37]/5 border-[#D4AF37]/15 text-[#D4AF37]",
                  blue: "from-blue-500/10 to-blue-500/5 border-blue-500/15 text-blue-400",
                };
                return (
                  <div key={i}
                    className={`group bg-gradient-to-b ${colors[f.color]} border rounded-2xl p-5 hover:scale-[1.03] hover:shadow-2xl transition-all duration-300`}>
                    <f.icon size={22} className="mb-3 opacity-80" />
                    <h4 className="font-bold text-[#EAEAEA] text-sm mb-1">{f.title}</h4>
                    <p className="text-[#A0A0A0] text-xs leading-relaxed">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          3. MAGIC INPUT — "Just Drop Your Trades"
         ═══════════════════════════════════════ */}
      <section id="how-it-works" className="py-16 md:py-20 px-6 relative z-10 bg-gradient-to-b from-[#0B0F14] via-[#0D1117] to-[#0B0F14] border-t border-[#111827]">
        <div className="max-w-6xl mx-auto">
          <div className="reveal text-center mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-700/20 border border-zinc-600/30 text-[#EAEAEA] text-[11px] font-bold uppercase tracking-[0.15em] mb-6">
              <Upload size={14} /> Core Feature
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
              Just Drop Your<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#D4AF37]">Trades</span>
            </h2>
            <p className="text-[#A0A0A0] text-lg mt-4 max-w-lg mx-auto">
              Screenshot, paste, or PDF. JournalBud scans and fills everything for you.
            </p>
          </div>

          {/* Upload animation mockup */}
          <div className="reveal max-w-3xl mx-auto">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#D4AF37]/20 via-[#D4AF37]/20 to-[#D4AF37]/20 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

              <div className="relative bg-[#11161D]/80 backdrop-blur-xl border border-white/8 rounded-[2rem] shadow-2xl overflow-hidden">
                {/* Top bar */}
                <div className="flex items-center gap-2 px-6 py-4 border-b border-[#111827]">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                  </div>
                  <span className="ml-4 text-[11px] font-mono text-[#A0A0A0]">JournalBud — Trade Extraction</span>
                </div>

                <div className="flex flex-col md:flex-row">
                  {/* Left: Upload zone */}
                  <div className="md:w-1/2 p-8 border-b md:border-b-0 md:border-r border-[#111827] flex flex-col items-center justify-center relative min-h-[300px]">
                    {/* Upload formats */}
                    <div className="flex gap-3 mb-6">
                      {[
                        { icon: Camera, label: "Screenshot" },
                        { icon: FileText, label: "PDF" },
                        { icon: Cpu, label: "Paste" },
                      ].map((f, i) => (
                        <div key={i} className="flex flex-col items-center gap-1.5">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-500 ${mockStep >= 1 ? "bg-[#D4AF37]/15 border border-[#D4AF37]/30" : "bg-white/5 border border-[rgba(212,175,55,0.15)]"}`}>
                            <f.icon size={18} className={mockStep >= 1 ? "text-[#D4AF37]" : "text-[#A0A0A0]"} />
                          </div>
                          <span className="text-[9px] font-bold text-zinc-600 uppercase">{f.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Status indicator */}
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-700 ${mockStep === 0 ? "bg-white/5 border-2 border-dashed border-[#111827]" :
                        mockStep === 1 ? "bg-[#D4AF37]/15 border-2 border-[#D4AF37]/40 animate-pulse" :
                          "bg-[#D4AF37]/15 border-2 border-[#D4AF37]/40"}`}>
                      {mockStep === 0 ? <Upload size={32} className="text-[#A0A0A0]" /> :
                        mockStep === 1 ? <ScanLine size={32} className="text-[#D4AF37]" /> :
                          <Check size={32} className="text-[#D4AF37]" />}
                    </div>

                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#A0A0A0] mt-4">
                      {mockStep === 0 ? "Drop your trade history" : mockStep === 1 ? "AI scanning document..." : "✓ Data extracted"}
                    </p>

                    {/* Scan line */}
                    {mockStep === 1 && (
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-[#D4AF37] shadow-[0_0_20px_#D4AF37] animate-[scan_1.8s_ease-in-out_infinite]" />
                    )}
                  </div>

                  {/* Right: Auto-filled form */}
                  <div className="md:w-1/2 p-6 md:p-8 flex flex-col">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-bold text-sm text-[#D4AF37] flex items-center gap-2">
                        <Sparkles size={14} /> Log New Trade
                      </h3>
                      <X size={14} className="text-zinc-700" />
                    </div>

                    <div className="space-y-3 flex-1">
                      {[
                        { label: "Symbol", value: "XAUUSD", color: "emerald" },
                        { label: "Type", value: "BUY", color: "white" },
                        { label: "Lot Size", value: "0.10", color: "white" },
                        { label: "P&L", value: "-$114.65", color: "red" },
                      ].map((field, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] uppercase text-[#A0A0A0] font-bold tracking-wider">{field.label}</p>
                          <div className={`w-full h-9 bg-[#0B0E13] border rounded-2xl px-3 flex items-center transition-all duration-700 ${mockStep >= 2
                              ? field.color === "red" ? "border-red-500/30" : field.color === "emerald" ? "border-emerald-500/30" : "border-white/15"
                              : "border-[#111827]"}`}
                            style={{ transitionDelay: `${i * 100}ms` }}>
                            {mockStep >= 2 && (
                              <span className={`text-xs font-bold ${field.color === "red" ? "text-red-400" : field.color === "emerald" ? "text-amber-400" : "text-[#EAEAEA]"}`}>
                                {field.value}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className={`mt-5 w-full h-10 rounded-2xl flex items-center justify-center font-bold text-xs transition-all duration-500 ${mockStep >= 2
                        ? "bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(201,166,70,0.2)]"
                        : "bg-zinc-800/50 text-zinc-600"}`}>
                      {mockStep >= 3 ? "✓ Trade Saved" : "Save Trade"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          4. DATA → INTELLIGENCE TRANSFORMATION
         ═══════════════════════════════════════ */}
      <section id="features" className="py-16 md:py-20 px-6 relative z-10 border-t border-[#111827]">
        <div className="max-w-6xl mx-auto">
          <div className="reveal text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
              Raw Trades →<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-amber-300">Real Awareness</span>
            </h2>
            <p className="text-[#A0A0A0] text-lg mt-4 max-w-lg mx-auto">
              Your past becomes insight. Every trade builds a smarter picture.
            </p>
          </div>

          {/* Dashboard-like metrics */}
          <div className="reveal grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { label: "Win Rate", value: "70.5%", sub: "+5.2% vs last month", color: "#D4AF37" },
              { label: "Profit Factor", value: "2.41", sub: "Above breakeven", color: "#D4AF37" },
              { label: "Avg R:R", value: "1:2.8", sub: "Improving steadily", color: "#A855F7" },
              { label: "Discipline Score", value: "82/100", sub: "Top 15% of traders", color: "#F59E0B" },
            ].map((m, i) => (
              <div key={i} className="group bg-[#11161D]/60 backdrop-blur-sm border border-[rgba(212,175,55,0.15)] rounded-2xl p-5 hover:border-white/15 hover:bg-[#11161D] transition-all duration-300">
                <p className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#A0A0A0] mb-2">{m.label}</p>
                <p className="text-2xl md:text-3xl font-black" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[11px] text-[#A0A0A0] mt-1">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Analytics visual */}
          <div className="reveal grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* PnL Chart mock */}
            <div className="lg:col-span-2 bg-[#11161D]/60 backdrop-blur-sm border border-[rgba(212,175,55,0.15)] rounded-2xl p-6 relative overflow-hidden group hover:border-[#111827] transition-all">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-bold text-[#EAEAEA]">PnL Curve</h4>
                <span className="text-[10px] font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-1 rounded-lg">+$2,847.30</span>
              </div>
              {/* Simplified chart visualization */}
              <div className="flex items-end gap-1 h-32">
                {[35, 28, 42, 52, 38, 62, 48, 72, 58, 82, 65, 78, 90, 75, 88, 92, 85, 95, 80, 98].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-sm transition-all duration-500 group-hover:opacity-100"
                    style={{
                      height: `${h}%`,
                      background: h > 60
                        ? "linear-gradient(to top, rgba(201,166,70,0.3), rgba(201,166,70,0.6))"
                        : "linear-gradient(to top, rgba(255,255,255,0.05), rgba(255,255,255,0.15))",
                      opacity: 0.6 + (i / 20) * 0.4
                    }} />
                ))}
              </div>
            </div>

            {/* Emotional states */}
            <div className="bg-[#11161D]/60 backdrop-blur-sm border border-[rgba(212,175,55,0.15)] rounded-2xl p-6 hover:border-[#111827] transition-all">
              <h4 className="text-sm font-bold text-[#EAEAEA] mb-5">Emotional States</h4>
              <div className="space-y-4">
                {[
                  { emotion: "Confident", pct: 45, color: "#D4AF37" },
                  { emotion: "Calm", pct: 25, color: "#D4AF37" },
                  { emotion: "Anxious", pct: 18, color: "#F59E0B" },
                  { emotion: "Frustrated", pct: 12, color: "#EF4444" },
                ].map((e, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-semibold text-[#A0A0A0]">{e.emotion}</span>
                      <span className="font-bold" style={{ color: e.color }}>{e.pct}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full animate-fill-bar"
                        style={{ "--fill-width": `${e.pct}%`, backgroundColor: e.color, animationDelay: `${i * 200}ms` } as React.CSSProperties} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          5. WEEKLY AI REPORT
         ═══════════════════════════════════════ */}
      <section className="py-16 md:py-20 px-6 relative z-10 border-t border-[#111827]">
        <div className="max-w-5xl mx-auto">
          <div className="reveal grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: Copy */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4AF37]/8 border border-[#D4AF37]/15 text-[#D4AF37] text-[11px] font-bold uppercase tracking-[0.15em]">
                <Brain size={14} /> Big Selling Point
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                Your Week,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-amber-300">Explained by AI</span>
              </h2>
              <p className="text-[#A0A0A0] text-base leading-relaxed max-w-md">
                Every week, JournalBud generates a comprehensive strategy report analyzing your
                trades, mistakes, emotional patterns, and gives you a concrete plan to improve.
              </p>
              <Link href={ctaHref}
                className="inline-flex items-center gap-2 text-sm font-bold text-[#D4AF37] hover:underline group">
                See your first report <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Right: Report mockup */}
            <div className="reveal relative">
              <div className="absolute -inset-4 bg-[#D4AF37]/5 blur-3xl rounded-full" />
              <div className="relative bg-[#11161D]/80 backdrop-blur-xl border border-[rgba(212,175,55,0.15)] rounded-2xl p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-[#111827]">
                  <div>
                    <h4 className="font-bold text-[#EAEAEA] text-sm">Weekly AI Report</h4>
                    <p className="text-[11px] text-[#A0A0A0] mt-0.5">Mar 17 — Mar 23, 2026</p>
                  </div>
                    <BrainCircuit size={18} className="text-[#D4AF37] animate-pulse" />
                </div>

                {/* Report items */}
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 shrink-0 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                      <AlertTriangle size={14} className="text-red-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#EAEAEA]">Top Mistake: Emotional Trading</p>
                      <p className="text-[11px] text-[#A0A0A0] mt-0.5">4 trades entered after consecutive losses — classic revenge pattern</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 shrink-0 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                      <Target size={14} className="text-[#D4AF37]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#EAEAEA]">Advice: Stick to Your Plan</p>
                      <p className="text-[11px] text-[#A0A0A0] mt-0.5">Your planned entries have 78% win rate vs 31% for impulse trades</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 shrink-0 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <Trophy size={14} className="text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#EAEAEA]">Discipline Score</p>
                      <p className="text-[11px] text-[#A0A0A0] mt-0.5">You scored <span className="text-amber-400 font-bold">20/100</span> — significant room for growth</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0B0E13] rounded-2xl p-4 border border-[rgba(212,175,55,0.15)]">
                  <p className="text-[10px] uppercase tracking-wider text-[#A0A0A0] font-bold mb-2">AI Summary</p>
                  <p className="text-xs text-[#A0A0A0] leading-relaxed italic">
                    "This week revealed a pattern of revenge trading after losses. Your best trades happen
                    in the London session between 2-4 PM. Consider setting a 2-loss daily circuit breaker."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          6. GOALS ENGINE
         ═══════════════════════════════════════ */}
      <section className="py-16 md:py-20 px-6 relative z-10 border-t border-[#111827]">
        <div className="max-w-5xl mx-auto">
          <div className="reveal grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: Goals mockup */}
            <div className="order-2 lg:order-1 relative">
              <div className="absolute -inset-4 bg-[#D4AF37]/5 blur-3xl rounded-full" />
              <div className="relative bg-[#11161D]/80 backdrop-blur-xl border border-[rgba(212,175,55,0.15)] rounded-2xl p-6 shadow-2xl space-y-4">
                <h4 className="font-bold text-[#EAEAEA] text-sm flex items-center gap-2">
                  <Target size={16} className="text-[#D4AF37]" /> Daily Targets
                </h4>

                {[
                  { label: "Max 3 trades per day", current: "2/3", pct: 66, status: "On track", color: "#D4AF37" },
                  { label: "Max drawdown: $200", current: "$85", pct: 42, status: "Safe zone", color: "#D4AF37" },
                  { label: "Stick to plan", current: "Yes", pct: 100, status: "Perfect", color: "#A855F7" },
                  { label: "No revenge trading", current: "Clean", pct: 100, status: "✓ Clear", color: "#D4AF37" },
                ].map((g, i) => (
                  <div key={i} className="bg-[#0B0E13] border border-[rgba(212,175,55,0.15)] rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#EAEAEA]">{g.label}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white/5" style={{ color: g.color }}>{g.status}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${g.pct}%`, backgroundColor: g.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Copy */}
            <div className="order-1 lg:order-2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-[11px] font-bold uppercase tracking-[0.15em]">
                <Flame size={14} /> Psychology Engine
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                Discipline,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#D4AF37]">Engineered</span>
              </h2>
              <p className="text-[#A0A0A0] text-base leading-relaxed max-w-md">
                Set daily targets, drawdown limits, and trading rules. JournalBud enforces them and tracks your compliance automatically.
              </p>
              <div className="bg-[#0B0E13]/50 border border-[rgba(212,175,55,0.15)] rounded-2xl px-5 py-4">
                <p className="text-sm text-[#EAEAEA] leading-relaxed font-medium italic">
                  "You don&apos;t rise to your goals.<br />
                  <span className="text-[#D4AF37] font-bold not-italic">You fall to your system."</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          7. PRICING
         ═══════════════════════════════════════ */}
      <section id="pricing" className="py-16 md:py-20 px-6 relative z-10 overflow-hidden border-t border-[#111827]">
        <div className="max-w-4xl mx-auto">
          <div className="reveal text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
              Professional Tools for<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#D4AF37]">Profitable Minds</span>
            </h2>
            <p className="text-[#A0A0A0] text-lg">Choose a path that fits your trading journey.</p>
          </div>

          <div className="reveal grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            {/* Free Plan */}
            <div className="bg-[#11161D]/60 backdrop-blur-sm border border-[rgba(212,175,55,0.15)] p-8 rounded-[2rem] space-y-8 flex flex-col group hover:border-[#111827] transition-all duration-300">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-[#A0A0A0]">Standard Plan</h3>
                <p className="text-3xl font-black italic">Free <span className="text-sm text-[#A0A0A0] font-medium not-italic">/ forever</span></p>
              </div>
              <ul className="space-y-4 flex-1">
                <PricingTier feature="Manual Trade Logging" />
                <PricingTier feature="Standard Journal View" />
                <PricingTier feature="Basic Analytics Dashboard" />
                <PricingTier feature="Mistake Intelligence Tracking" />
                <PricingLocked feature="Automated Screenshot Logging" />
                <PricingLocked feature="Elite Target Engine & Export" />
                <PricingLocked feature="AI Weekly Insights Report" />
              </ul>
              <Link href="/signup?plan=free"
                className="w-full py-4 bg-zinc-800/80 hover:bg-zinc-700 text-[#EAEAEA] font-bold rounded-2xl transition-all text-center block">
                Start Free Plan
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-b from-[#11161D] to-[#0D1218] border-2 border-[#D4AF37]/20 p-8 rounded-[2rem] space-y-8 relative overflow-hidden flex flex-col shadow-[0_0_60px_rgba(212,175,55,0.05)] transform md:-translate-y-4 hover:border-[#D4AF37]/40 transition-all duration-300">
              <div className="absolute top-0 right-0 p-4">
                <span className="px-3 py-1 bg-gradient-to-r from-[#D4AF37] to-[#D4AF37] text-[#0B0B0F] text-[10px] font-black uppercase rounded-full tracking-widest shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                  AI Engine Inside
                </span>
              </div>
              {/* Subtle glow */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-[#D4AF37]">Professional Access</h3>
                <p className="text-3xl font-black">$2.99 <span className="text-sm text-[#A0A0A0] font-medium">/ month</span></p>
                <p className="text-sm font-bold text-[#A0A0A0]">or <span className="text-[#EAEAEA]">$19.99</span> / year</p>
              </div>
              <ul className="space-y-4 flex-1">
                <PricingTier feature="Unlimited Screenshot AI" pro />
                <PricingTier feature="Standard Journal View" pro />
                <PricingTier feature="Deep Analytics Dashboard" pro />
                <PricingTier feature="Mistake Intelligence Tracking" pro />
                <PricingTier feature="Export (PDF, CSV)" pro />
                <PricingTier feature="Elite Target Engine" pro />
                <PricingTier feature="Weekly AI Trading Report" pro />
              </ul>
              <div className="space-y-3">
                <Link href={ctaHref}
                  className="w-full py-4 bg-gradient-to-r from-[#D4AF37] to-[#D4AF37] text-[#0B0B0F] font-black rounded-2xl hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] transition-all block text-center">
                  {user && hasUsedTrial ? "Upgrade to Pro" : "Start 7-Day Free Trial"}
                </Link>
                <Link href="/demo" className="w-full py-3 border border-[rgba(212,175,55,0.15)] text-[#EAEAEA] font-bold rounded-2xl hover:bg-white/5 transition-all flex items-center justify-center gap-2">
                  <Play size={14} className="text-[#D4AF37]" /> View Live Demo
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          8. BUDDY EFFECT — Floating personality
         ═══════════════════════════════════════ */}
      <section className="py-16 md:py-20 px-6 relative z-10 border-t border-[#111827]">
        <div className="max-w-4xl mx-auto">
          <div className="reveal text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              More Than a Tool.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#D4AF37] to-[#D4AF37]">
                A Trading Buddy.
              </span>
            </h2>
          </div>

          <div className="reveal grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { text: "You trade better after 2PM. Consider focusing your sessions.", icon: Clock, color: "#D4AF37" },
              { text: "After 2 consecutive losses, take a 30-minute break. It works.", icon: Shield, color: "#D4AF37" },
              { text: "Your win rate on XAUUSD is 82%. It's your strongest pair.", icon: Star, color: "#F59E0B" },
            ].map((tip, i) => (
              <div key={i}
                className="group relative bg-[#11161D]/60 backdrop-blur-sm border border-[rgba(212,175,55,0.15)] rounded-2xl p-6 hover:border-white/15 transition-all duration-300 hover:-translate-y-1">
                <div className="absolute top-0 left-0 w-full h-[1px]"
                  style={{ background: `linear-gradient(90deg, transparent, ${tip.color}30, transparent)` }} />
                <tip.icon size={20} className="mb-3 opacity-60" style={{ color: tip.color }} />
                <p className="text-sm text-[#EAEAEA] leading-relaxed">
                  <span className="text-[10px] font-bold uppercase tracking-wider block mb-2" style={{ color: tip.color }}>
                    <BrainCircuit size={10} className="inline mr-1" />JournalBud Insight
                  </span>
                  {tip.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          9. FINAL CTA
         ═══════════════════════════════════════ */}
      <section className="py-16 md:py-20 px-6 relative z-10">
        <div className="reveal max-w-4xl mx-auto relative">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/5 via-[#D4AF37]/5 to-[#D4AF37]/5 rounded-[3rem] blur-2xl" />

          <div className="relative bg-[#11161D]/60 backdrop-blur-xl border border-white/8 rounded-[3rem] p-12 md:p-20 text-center space-y-8 overflow-hidden">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 pointer-events-none opacity-40">
              <BrainCircuit size={64} className="text-[#D4AF37] animate-pulse opacity-50" />
            </div>

            <div className="relative z-10 space-y-6 pt-8">
              <h2 className="text-4xl md:text-6xl font-black tracking-tight text-[#EAEAEA] leading-tight">
                Stop Trading Blind.
              </h2>
              <p className="text-[#A0A0A0] max-w-xl mx-auto text-lg leading-relaxed">
                Your buddy is waiting. Upload your first trade and let the AI reveal what you&apos;ve been missing.
              </p>
              <Link href={ctaHref}
                className="group mt-8 px-10 py-5 bg-gradient-to-r from-[#D4AF37] to-[#D4AF37] text-[#0B0B0F] font-black rounded-2xl hover:shadow-[0_0_50px_rgba(212,175,55,0.4)] hover:-translate-y-1 transition-all inline-flex items-center gap-3 text-lg">
                Start With Your Trading Buddy
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform border-[#0B0B0F]" />
              </Link>
              <p className="text-zinc-600 text-sm font-medium">
                No card. No setup. Just upload and begin.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#111827] py-12 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#D4AF37] to-amber-400 flex items-center justify-center">
              <LineChart size={14} className="text-black" />
            </div>
            <span className="text-sm font-brand font-bold text-[#A0A0A0]">JournalBud</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-zinc-600">
            <Link href="/terms" className="hover:text-[#A0A0A0] transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-[#A0A0A0] transition-colors">Privacy</Link>
            <span>© 2026 JournalBud</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

/* ═══════════════════════════════════════════════
   PRICING HELPERS
   ═══════════════════════════════════════════════ */
function PricingTier({ feature, pro = false }: { feature: string; pro?: boolean }) {
  return (
    <li className="flex items-center gap-3">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${pro ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "bg-zinc-800 text-[#A0A0A0]"}`}>
        <Check size={14} strokeWidth={3} />
      </div>
      <span className={`text-sm ${pro ? "text-zinc-200 font-bold" : "text-[#A0A0A0]"}`}>{feature}</span>
    </li>
  );
}

function PricingLocked({ feature }: { feature: string }) {
  return (
    <li className="flex items-center gap-3 opacity-30 select-none">
      <div className="w-5 h-5 rounded-full border border-[rgba(212,175,55,0.15)] flex items-center justify-center shrink-0">
        <Lock size={10} />
      </div>
      <span className="text-xs text-[#A0A0A0] line-through">{feature}</span>
    </li>
  );
}
