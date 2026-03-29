"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { Mail, RefreshCw, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { sendEmailVerification, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function VerifyEmailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [cooldown, setCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [displayEmail, setDisplayEmail] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (user?.email) {
        setDisplayEmail(localStorage.getItem("signupEmail") || user.email);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!loading && user?.emailVerified) {
      router.push("/dashboard");
    }
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleResend = async () => {
    if (!auth.currentUser || cooldown > 0) return;
    setResendLoading(true);
    try {
      await sendEmailVerification(auth.currentUser);
      setSent(true);
      setCooldown(30);
      const interval = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error(err);
    } finally {
      setResendLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!auth.currentUser) return;
    setVerifyLoading(true);
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleBackToLogin = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loading || !user) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-black">
         <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black flex items-center justify-center p-6 selection:bg-emerald-500/30">
      <div className="max-w-md w-full bg-[#111827] border border-black/10 dark:border-[#111827] fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-8 rounded-2xl shadow-xl text-center space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-700">
        <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center shadow-inner border border-emerald-500/20">
          <Mail className="text-emerald-500" size={32} />
        </div>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-black tracking-tight text-[#E5E7EB]">Check your inbox</h2>
          <p className="text-[#9CA3AF] leading-relaxed text-sm">
            We've sent a verification link to <br/>
            <span className="font-bold text-amber-400 mt-1 block">{displayEmail}</span>
          </p>
          <div className="space-y-2 text-xs text-[#9CA3AF] pt-2">
            <p>If you don’t see the email, please check your spam or promotions folder.</p>
            <p>Once verified, click the continue button to access your dashboard.</p>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-[#111827]">
          <button 
            onClick={handleCheckVerification}
            disabled={verifyLoading}
            className="w-full bg-[#C9A646] hover:bg-[#C9A646]/90 text-black font-black py-3.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(201,166,70,0.2)] disabled:opacity-50"
          >
            {verifyLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            I've verified, continue
          </button>
          
          <button 
            onClick={handleResend}
            disabled={cooldown > 0 || resendLoading}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-[#E5E7EB] font-semibold py-3.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {resendLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            {cooldown > 0 ? `Resend in ${cooldown}s` : sent ? "Verification Email Sent!" : "Resend Verification Email"}
          </button>
          
          <button 
            onClick={handleBackToLogin}
            className="w-full bg-transparent hover:bg-white/5 text-[#9CA3AF] hover:text-[#E5E7EB] font-semibold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
