"use client";
import { useAuth } from "@/lib/AuthContext";
import { useTrial } from "@/components/TrialGuard";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { Loader2, Mail, RefreshCw, LogOut, ArrowLeft } from "lucide-react";
import { sendEmailVerification, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { access, plan, loading: planLoading } = useTrial();
  const router = useRouter();
  const pathname = usePathname();
  
  const [cooldown, setCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [displayEmail, setDisplayEmail] = useState("");
  const [isCheckingLocals, setIsCheckingLocals] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsCheckingLocals(false);
    }
  }, []);

  const publicRoutes = ["/", "/login", "/signup", "/demo", "/terms", "/privacy", "/verify-email"];
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    if (loading || planLoading) return;

    if (!user && !isPublicRoute) {
      router.push("/login");
      return;
    }

    if (user && !isPublicRoute) {
      if (!user.emailVerified) {
        router.push("/verify-email");
        return;
      }

      // Redirect legacy /free-dashboard to /dashboard
      if (pathname === "/free-dashboard") {
        router.push("/dashboard");
      }
    }
  }, [user, loading, planLoading, plan, pathname, isPublicRoute, router]);

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

  if (loading || isCheckingLocals) {
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

  // Verified user access allowed
  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background max-w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-4 pb-4 md:px-8 md:pb-8 relative selection:bg-emerald-500/30 animate-in fade-in duration-300">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
