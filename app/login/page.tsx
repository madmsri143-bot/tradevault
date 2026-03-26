"use client";
import { useState, useEffect } from "react";
import { auth, googleProvider, db } from "@/lib/firebase";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { TrendingUp, Loader2, Mail, Lock, User as UserIcon, Eye, EyeOff, CheckCircle2, ChevronLeft, Globe, Shield, Target } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import Link from "next/link";

// Define strict error mappings for Firebase auth
const getAuthErrorMessage = (errCode: string): string => {
  switch (errCode) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password.';
    case 'auth/email-already-in-use':
      return 'Email is already registered.';
    case 'auth/weak-password':
      return 'Password is too weak (min 6 chars).';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try later.';
    default:
      return 'An unexpected error occurred.';
  }
};

export default function LoginPage({ forceSignup }: { forceSignup?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup" | "setup-username" | "forgot-password">(forceSignup ? "signup" : "login");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; general?: string }>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isResetSent, setIsResetSent] = useState(false);

  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user && mode !== "setup-username") {
      router.push("/dashboard");
    }
  }, [user, authLoading, mode, router]);

  const handleFirebaseError = (err: any) => {
    const code = err.code;
    const msg = getAuthErrorMessage(code);
    if (code === 'auth/invalid-email' || code === 'auth/user-not-found' || code === 'auth/email-already-in-use') {
      setFieldErrors({ email: msg });
    } else if (code === 'auth/wrong-password' || code === 'auth/weak-password' || code === 'auth/invalid-credential') {
      setFieldErrors({ password: msg });
    } else {
      setFieldErrors({ general: msg });
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        if (password !== confirmPassword) {
          setFieldErrors({ confirmPassword: "Passwords do not match." });
          setLoading(false);
          return;
        }
        if (!name || !username) {
          setFieldErrors({ general: "Name and username are required." });
          setLoading(false);
          return;
        }
        const res = await createUserWithEmailAndPassword(auth, email, password);
        const now = Date.now();
        await setDoc(doc(db, "users", res.user.uid, "settings", "profile"), {
          name, 
          email, 
          username, 
          lastActive: now, 
          plan: "trial",
          trial_started_at: now,
          trial_end_date: now + (7 * 24 * 60 * 60 * 1000), // + 7 days
          isPro: false,
          photoUrl: ""
        });
        await sendEmailVerification(res.user);
        setSuccessMsg("Verification link sent! Check your inbox.");
        setTimeout(() => router.push("/dashboard"), 3000);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        router.push("/dashboard");
      }
    } catch (err: any) {
      handleFirebaseError(err);
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const profileRef = doc(db, "users", res.user.uid, "settings", "profile");
      const profileSnap = await getDoc(profileRef);
      
      if (!profileSnap.exists()) {
        setName(res.user.displayName || "");
        setEmail(res.user.email || "");
        setMode("setup-username");
        setLoading(false);
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") handleFirebaseError(err);
      setLoading(false);
    }
  };

  const handleSetupUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !auth.currentUser) return;
    setLoading(true);
    try {
      const now = Date.now();
      await setDoc(doc(db, "users", auth.currentUser.uid, "settings", "profile"), {
        name, 
        email, 
        username, 
        lastActive: now, 
        plan: "trial",
        trial_started_at: now,
        trial_end_date: now + (7 * 24 * 60 * 60 * 1000), 
        isPro: false,
        photoUrl: auth.currentUser.photoURL || ""
      }, { merge: true });
      router.push("/dashboard");
    } catch (err) {
      setFieldErrors({ general: "Failed to save profile." });
      setLoading(false);
    }
  };

  if (authLoading || (user && mode !== "setup-username")) {
    return <div className="flex h-screen items-center justify-center bg-[#0B0F14] text-white font-bold animate-pulse">TradeVault</div>;
  }

  return (
    <div className="min-h-screen bg-[#0B0F14] flex flex-col md:flex-row overflow-hidden">
      
      {/* Left Column: Branding / Marketing */}
      <div className="hidden md:flex flex-1 relative bg-gradient-to-br from-[#11161D] to-[#0D1218] border-r border-white/5 flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-20">
           <div className="absolute top-0 -left-20 w-96 h-96 bg-[#00FFB2]/20 blur-[120px] rounded-full" />
           <div className="absolute bottom-0 -right-20 w-80 h-80 bg-[#3B82F6]/10 blur-[100px] rounded-full" />
        </div>

        <Link href="/" className="relative z-10 flex items-center gap-3 group">
          <div className="w-10 h-10 bg-[#00FFB2]/10 rounded-xl flex items-center justify-center border border-[#00FFB2]/20">
            <TrendingUp size={24} className="text-[#00FFB2]" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">TradeVault</span>
        </Link>

        <div className="relative z-10 max-w-md space-y-6">
           <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight">Master your <br/> execution.</h1>
           <p className="text-zinc-400 text-lg leading-relaxed">
             Join thousands of traders building discipline through structured journaling and automated target tracking.
           </p>
           
           {/* Mini App Preview */}
           <div className="mt-8 bg-[#0B0F14]/50 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-md transform -rotate-2 hover:rotate-0 transition-transform duration-500">
             <div className="flex items-center gap-2 mb-4">
               <div className="w-8 h-8 rounded-lg bg-[#00FFB2]/20 flex items-center justify-center"><Target size={14} className="text-[#00FFB2]" /></div>
               <div>
                  <div className="w-16 h-2 bg-zinc-700 rounded-full mb-1" />
                  <div className="w-24 h-2 bg-zinc-800 rounded-full" />
               </div>
             </div>
             <div className="space-y-2">
               <div className="h-6 w-full bg-gradient-to-r from-emerald-500/20 to-transparent rounded-md" />
               <div className="h-6 w-3/4 bg-gradient-to-r from-emerald-500/10 to-transparent rounded-md" />
             </div>
           </div>
        </div>

        <div className="relative z-10 text-zinc-500 text-sm font-medium">
          © 2026 TradeVault Inc. All rights reserved.
        </div>
      </div>

      {/* Right Column: Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative">
        <Link href="/" className="md:hidden absolute top-6 left-6 flex items-center gap-2 text-zinc-500 font-bold text-sm">
          <ChevronLeft size={16} /> Back
        </Link>

        <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center md:text-left space-y-2">
             <h2 className="text-3xl font-bold text-white tracking-tight">
               {mode === "login" ? "Welcome Back" : mode === "signup" ? "Get Started" : "Profile Setup"}
             </h2>
             <p className="text-zinc-500 text-sm">
               {mode === "signup" ? "7-day free trial included" : "Please enter your details."}
             </p>
          </div>

          {successMsg && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-sm font-bold text-center animate-in zoom-in-95">{successMsg}</div>}
          {fieldErrors.general && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-bold text-center animate-in zoom-in-95">{fieldErrors.general}</div>}

          <form onSubmit={mode === "setup-username" ? handleSetupUsername : handleEmailAuth} className="space-y-4">
            {mode === "signup" && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                <Input label="Name" value={name} onChange={setName} type="text" placeholder="John" />
                <Input label="Username" value={username} onChange={setUsername} type="text" placeholder="trader1" />
              </div>
            )}
            
            {mode === "setup-username" ? (
              <Input label="Username" value={username} onChange={setUsername} type="text" placeholder="pick_a_name" autofocus />
            ) : (
              <>
                <Input label="Email" value={email} onChange={setEmail} type="email" placeholder="you@example.com" error={fieldErrors.email} />
                <div className="relative">
                  <Input 
                    label="Password" value={password} onChange={setPassword} 
                    type={showPassword ? "text" : "password"} placeholder="••••••••" 
                    error={fieldErrors.password}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 bottom-3 text-zinc-600 hover:text-white transition-colors">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </>
            )}

            {mode === "signup" && (
              <Input label="Confirm Password" value={confirmPassword} onChange={setConfirmPassword} type="password" placeholder="••••••••" error={fieldErrors.confirmPassword} />
            )}

            <button disabled={loading} type="submit" className="w-full bg-[#00FFB2] text-black font-black py-4 rounded-2xl hover:shadow-[0_0_25px_rgba(0,185,129,0.3)] hover:-translate-y-0.5 transition-all disabled:opacity-50 mt-4">
              {loading ? <Loader2 className="animate-spin mx-auto" /> : mode === "login" ? "Sign In" : mode === "signup" ? "Start Free Trial" : "Finish Setup"}
            </button>
            {mode === "signup" && (
               <p className="text-center text-xs text-zinc-500 font-medium mt-3">
                 No payment details required. Your 7-day trial starts instantly.
               </p>
            )}
          </form>

          {mode !== "setup-username" && (
            <>
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink-0 mx-4 text-zinc-600 text-[10px] font-black uppercase tracking-widest leading-none">OR CONTINURE WITH</span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              <button onClick={handleGoogleLogin} className="w-full bg-white/5 border border-white/5 text-white font-bold py-4 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>

              <div className="text-center group">
                 <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-sm text-zinc-500 font-medium hover:text-white transition-colors">
                   {mode === "login" ? <>New to TradeVault? <span className="text-[#00FFB2] font-black underline underline-offset-4">Start Trial</span></> : <>Already have an account? <span className="text-[#00FFB2] font-black underline underline-offset-4">Sign In</span></>}
                 </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type, placeholder, error, autofocus = false }: any) {
  return (
    <div className="relative group">
      <input 
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder=" "
        autoFocus={autofocus}
        id={`input-${label}`}
        className={`peer w-full bg-white/5 border rounded-2xl px-4 pt-6 pb-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#00FFB2]/20 transition-all ${error ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-[#00FFB2]'}`} 
      />
      <label 
        htmlFor={`input-${label}`}
        className="absolute left-4 top-4 text-xs font-bold uppercase tracking-widest text-zinc-500 transition-all duration-200 peer-focus:-translate-y-2.5 peer-focus:text-[10px] peer-focus:text-[#00FFB2] peer-[:not(:placeholder-shown)]:-translate-y-2.5 peer-[:not(:placeholder-shown)]:text-[10px] pointer-events-none"
      >
        {label}
      </label>
      {error && <p className="text-[10px] text-red-500 font-bold pl-4 mt-1">{error}</p>}
    </div>
  );
}
