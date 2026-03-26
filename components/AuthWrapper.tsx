"use client";
import { useAuth } from "@/lib/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import { Loader2, Mail, RefreshCw, LogOut } from "lucide-react";
import { sendEmailVerification, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const [cooldown, setCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const publicRoutes = ["/", "/login", "/signup", "/demo", "/terms", "/privacy"];
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    if (!loading && !user && !isPublicRoute) {
      router.push("/login");
    }
  }, [user, loading, isPublicRoute, router]);

  // Synchronous Fast-Check & Activity Tracking
  useEffect(() => {
    if (!user || isPublicRoute) return;

    // Fast local expiration check
    const checkInactivity = async () => {
      const lastActive = localStorage.getItem("lastActive");
      if (lastActive) {
        const now = Date.now();
        if (now - parseInt(lastActive) > 4 * 24 * 60 * 60 * 1000) {
          localStorage.setItem("sessionExpired", "true");
          await signOut(auth);
          router.push("/login");
        }
      }
    };
    checkInactivity();

    // DOM Activity Debouncer
    let timeoutId: NodeJS.Timeout;
    const activityHandler = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const now = Date.now();
        localStorage.setItem("lastActive", now.toString());
        
        const lastDbUpdate = localStorage.getItem("lastDbUpdate") || "0";
        if (now - parseInt(lastDbUpdate) > 5 * 60 * 1000) { // 5 minutes debounce
          localStorage.setItem("lastDbUpdate", now.toString());
          setDoc(doc(db, "users", user.uid, "settings", "profile"), { lastActive: now }, { merge: true })
            .catch(e => console.error("Failed to sync activity logic:", e));
        }
      }, 1000); // 1 second DOM bounce limit
    };

    // Attach listeners
    window.addEventListener("mousedown", activityHandler, { passive: true });
    window.addEventListener("keydown", activityHandler, { passive: true });
    window.addEventListener("touchstart", activityHandler, { passive: true });
    window.addEventListener("scroll", activityHandler, { passive: true });
    
    // Initial route trigger
    activityHandler();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener("mousedown", activityHandler);
      window.removeEventListener("keydown", activityHandler);
      window.removeEventListener("touchstart", activityHandler);
      window.removeEventListener("scroll", activityHandler);
    };
  }, [user, pathname, isPublicRoute, router]);

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

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background">
        <div className="text-[32px] md:text-[40px] font-bold text-black dark:text-white animate-blink tracking-tight">
          TradeVault
        </div>
      </div>
    );
  }

  // If we are on public routes, return raw layout without routing blocks
  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (!user) return null; // Prevent flash

  // Ensure email verification for dashboard access
  if (!user.emailVerified) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center p-6 selection:bg-emerald-500/30">
        <div className="max-w-md w-full bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-8 rounded-2xl shadow-xl text-center space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-700">
          <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center shadow-inner border border-emerald-500/20">
            <Mail className="text-emerald-500" size={32} />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white mb-3">Please verify your email to continue</h2>
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-500 text-sm leading-relaxed mb-4 text-left">
              We've sent a verification link to your email. If you don't see it, check your spam or promotions folder.
            </div>
            <p className="text-zinc-400 text-sm">
              Once verified, simply refresh this page to access your dashboard.
            </p>
          </div>

          <div className="space-y-3 pt-4 border-t border-white/5">
            <button 
              onClick={handleResend}
              disabled={cooldown > 0 || resendLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {resendLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              {cooldown > 0 ? `Resend in ${cooldown}s` : sent ? "Verification Email Sent!" : "Resend Verification Email"}
            </button>
            
            <button 
              onClick={handleLogout}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-semibold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Verified user access allowed
  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background max-w-full">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative selection:bg-emerald-500/30 animate-in fade-in duration-300">
        {children}
      </main>
    </div>
  );
}
