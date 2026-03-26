"use client";
import { useState, useEffect } from "react";
import { auth, googleProvider, db } from "@/lib/firebase";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, fetchSignInMethodsForEmail, sendEmailVerification } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { TrendingUp, Loader2, Mail, Lock, User as UserIcon, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useModal } from "@/lib/ModalContext";

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
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled in your Firebase Console.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

export default function LoginPage() {
  const router = useRouter();
  const { alert } = useModal();
  const [mode, setMode] = useState<"login" | "signup" | "setup-username" | "forgot-password">("login");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; general?: string }>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isResetSent, setIsResetSent] = useState(false);

  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // If user is already authenticated and not in setup mode, skip login
    if (!authLoading && user && mode !== "setup-username") {
      router.push("/");
    }
  }, [user, authLoading, mode, router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (localStorage.getItem("sessionExpired") === "true") {
        setFieldErrors({ general: "Session expired due to inactivity. Please login again." });
        localStorage.removeItem("sessionExpired");
      }
    }
  }, []);

  // Prevent login flash
  if (authLoading || (user && mode !== "setup-username")) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background">
        <div className="text-[32px] md:text-[40px] font-bold text-black dark:text-white animate-blink tracking-tight">
          TradeVault
        </div>
      </div>
    );
  }

  const handleFirebaseError = (err: any) => {
    const code = err.code;
    const msg = getAuthErrorMessage(code);
    if (code === 'auth/invalid-email' || code === 'auth/user-not-found' || code === 'auth/email-already-in-use') {
      setFieldErrors({ email: msg });
    } else if (code === 'auth/wrong-password' || code === 'auth/weak-password' || code === 'auth/invalid-credential') {
      setFieldErrors({ password: msg, email: code === 'auth/invalid-credential' ? msg : undefined });
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
        setLoadingText("Creating account...");
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
        await setDoc(doc(db, "users", res.user.uid, "settings", "profile"), {
          name, email, username, lastActive: Date.now(), photoUrl: ""
        });
        await sendEmailVerification(res.user);
        setSuccessMsg("We've sent a verification link to your email. If you don't see it, check your spam or promotions folder.");
        setTimeout(() => router.push("/"), 4000);
      } else {
        setLoadingText("Signing in...");
        await signInWithEmailAndPassword(auth, email, password);
        setSuccessMsg("Login successful!");
        setTimeout(() => router.push("/"), 1000);
      }
    } catch (err: any) {
      console.error(err);
      handleFirebaseError(err);
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setFieldErrors({});
    setSuccessMsg(null);
    setLoading(true);
    setLoadingText("Signing in...");
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
        setSuccessMsg("Login successful!");
        setTimeout(() => router.push("/"), 1000);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code !== "auth/popup-closed-by-user") {
         handleFirebaseError(err);
      }
      setLoading(false);
    }
  };

  const handleSetupUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !auth.currentUser) return;
    
    setLoading(true);
    setLoadingText("Saving profile...");
    try {
      await setDoc(doc(db, "users", auth.currentUser.uid, "settings", "profile"), {
        name, email, username, lastActive: Date.now(), photoUrl: auth.currentUser.photoURL || ""
      }, { merge: true });
      setSuccessMsg("Profile completed!");
      setTimeout(() => router.push("/"), 1000);
    } catch (err: any) {
       console.error(err);
       setFieldErrors({ general: "Failed to save profile. Please try again." });
       setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setFieldErrors({ email: "Please enter your email address." });
      return;
    }
    setLoading(true);
    setLoadingText("Sending...");
    setFieldErrors({});
    try {
      try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.includes("google.com") && !methods.includes("password")) {
          setFieldErrors({ general: "This account uses Google Sign-In. Please login with Google." });
          setLoading(false);
          return;
        }
      } catch (methodErr) {
        // Obfuscate enumeration protection errors safely
      }

      await sendPasswordResetEmail(auth, email);
      setIsResetSent(true);
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-email") {
        setFieldErrors({ email: "Please enter a valid email address." });
      } else {
        // auth/user-not-found or others: Always show success to prevent enumeration
        setIsResetSent(true);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-black flex flex-col md:flex-row animate-in fade-in duration-700">
      {/* Left side: Branding / Landing Area */}
      <div className="hidden md:flex flex-1 relative bg-zinc-950 border-r border-white/5 flex-col justify-center p-12 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-emerald-900/40 blur-[120px]" />
          <div className="absolute bottom-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-emerald-600/20 blur-[100px]" />
        </div>
        
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center shadow-inner border border-emerald-500/20">
              <TrendingUp className="text-emerald-500" size={32} strokeWidth={2.5} />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white">TradeVault</h1>
          </div>
          <h2 className="text-3xl font-semibold text-zinc-200 mb-6 leading-tight">Track. Improve. Win.</h2>
          <p className="text-lg text-zinc-400 leading-relaxed mb-8">
            A premium workspace to log your trades, automatically track targets, and review your daily performance. Completely private to you.
          </p>
          <div className="space-y-4">
            <Feature check="Data Isolation & Multi-tenant Privacy" />
            <Feature check="Automated PnL Target Tracking" />
            <Feature check="Cloud-Synced Image Journals" />
          </div>
        </div>
      </div>

      {/* Right side: Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative z-10">
        <div className="w-full max-w-md bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-8 rounded-2xl shadow-xl space-y-6 sm:space-y-8 animate-in fly-in-y-4 duration-700">
          
          <div className="text-center">
            {mode === "setup-username" ? (
              <>
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Almost there!</h2>
                <p className="text-zinc-400 text-sm">Pick a username to complete your profile.</p>
              </>
            ) : mode === "forgot-password" ? (
              <>
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Reset Password</h2>
                <p className="text-zinc-400 text-sm">Enter your email and we&apos;ll send you a reset link.</p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2 transition-all">
                  {mode === "login" ? "Welcome back, trader." : "Create an account"}
                </h2>
                <p className="text-zinc-400 text-sm transition-all">
                  {mode === "login" 
                    ? "Enter your details to access your journal." 
                    : "Start tracking your trading journey today."}
                </p>
              </>
            )}
          </div>

          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center justify-center gap-3 text-emerald-500 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
              <CheckCircle2 size={18} className="shrink-0" />
              {successMsg}
            </div>
          )}

          {fieldErrors.general && !successMsg && (
            <div className="bg-red-500/10 border border-red-500/20 p-3.5 rounded-xl text-center text-red-500 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
              {fieldErrors.general}
            </div>
          )}

          {!successMsg && (
            <>
              {mode === "setup-username" ? (
                <form onSubmit={handleSetupUsername} className="space-y-5">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2">Username</label>
                    <div className="relative group">
                      <UserIcon className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${fieldErrors.general ? 'text-red-500' : 'text-zinc-500 group-focus-within:text-emerald-500'}`} size={18} />
                      <input type="text" value={username} onChange={e => setUsername(e.target.value)} required placeholder="e.g. trading_pro" autoFocus className={`w-full bg-zinc-950 border rounded-xl py-3.5 pl-11 pr-4 text-sm transition-all shadow-sm text-white focus:outline-none ${fieldErrors.general ? 'border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' : 'border-zinc-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'}`} />
                    </div>
                  </div>
                  <button disabled={loading} type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-md disabled:opacity-50 mt-6">
                    {loading ? <><Loader2 size={18} className="animate-spin" /> {loadingText}</> : "Complete Profile"}
                  </button>
                </form>
              ) : mode === "forgot-password" ? (
                isResetSent ? (
                  <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-xl text-emerald-500 text-sm leading-relaxed flex items-center gap-3 text-left">
                      <CheckCircle2 size={24} className="shrink-0" />
                      Check your email (and spam folder) for the reset link.
                    </div>
                    <div className="space-y-3">
                      <button 
                        onClick={handleForgotPassword}
                        disabled={loading}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                      >
                        {loading ? <><Loader2 size={18} className="animate-spin" /> {loadingText}</> : "Resend Email"}
                      </button>
                      <button 
                        onClick={() => { setMode("login"); setIsResetSent(false); setFieldErrors({}); }}
                        className="w-full text-sm font-medium text-zinc-400 hover:text-white transition-colors py-2"
                      >
                        Back to Login
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2">Email Address</label>
                      <div className="relative group">
                        <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${fieldErrors.email ? 'text-red-500' : 'text-zinc-500 group-focus-within:text-emerald-500'}`} size={18} />
                        <input type="email" value={email} onChange={e => {setEmail(e.target.value); setFieldErrors(p => ({...p, email: undefined}))}} required autoFocus placeholder="you@example.com" className={`w-full bg-zinc-950 border rounded-xl py-3.5 pl-11 pr-4 text-sm transition-all shadow-sm text-white focus:outline-none ${fieldErrors.email ? 'border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' : 'border-zinc-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'}`} />
                      </div>
                      {fieldErrors.email && <p className="text-[11px] text-red-500 font-medium mt-1.5 pl-1">{fieldErrors.email}</p>}
                    </div>
                    <button 
                      disabled={loading}
                      type="submit" 
                      className="w-full bg-emerald-600 hover:bg-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 focus:ring-4 focus:ring-emerald-500/20 text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:hover:translate-y-0 mt-4"
                    >
                      {loading ? <><Loader2 size={18} className="animate-spin" /> {loadingText}</> : "Send Reset Link"}
                    </button>
                  </form>
                )
              ) : (
                <>
                  <form onSubmit={handleEmailAuth} className="space-y-5">
                    {mode === "signup" && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-2">Full Name</label>
                          <div className="relative group">
                            <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required autoFocus={mode === 'signup'} placeholder="John Doe" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3.5 pl-11 pr-4 text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none transition-all shadow-sm text-white placeholder-zinc-600" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-2">Username</label>
                          <div className="relative group">
                            <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required placeholder="johndoe_trader" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3.5 pl-11 pr-4 text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none transition-all shadow-sm text-white placeholder-zinc-600" />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-2">Email Address</label>
                        <div className="relative group">
                          <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${fieldErrors.email ? 'text-red-500' : 'text-zinc-500 group-focus-within:text-emerald-500'}`} size={18} />
                          <input type="email" value={email} onChange={e => {setEmail(e.target.value); setFieldErrors(p => ({...p, email: undefined}))}} required autoFocus={mode === 'login'} placeholder="you@example.com" className={`w-full bg-zinc-950 border rounded-xl py-3.5 pl-11 pr-4 text-sm transition-all shadow-sm text-white focus:outline-none ${fieldErrors.email ? 'border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 placeholder-red-500/30' : 'border-zinc-800 placeholder-zinc-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'}`} />
                        </div>
                        {fieldErrors.email && <p className="text-[11px] text-red-500 font-medium mt-1.5 pl-1 animate-in fade-in">{fieldErrors.email}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-2">Password</label>
                        <div className="relative group">
                          <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${fieldErrors.password ? 'text-red-500' : 'text-zinc-500 group-focus-within:text-emerald-500'}`} size={18} />
                          <input type={showPassword ? "text" : "password"} value={password} onChange={e => {setPassword(e.target.value); setFieldErrors(p => ({...p, password: undefined}))}} required placeholder="••••••••" className={`w-full bg-zinc-950 border rounded-xl py-3.5 pl-11 pr-10 text-sm transition-all shadow-sm text-white focus:outline-none ${fieldErrors.password ? 'border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 placeholder-red-500/30' : 'border-zinc-800 placeholder-zinc-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'}`} />
                          <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                            {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                          </button>
                        </div>
                        {fieldErrors.password && <p className="text-[11px] text-red-500 font-medium mt-1.5 pl-1 animate-in fade-in">{fieldErrors.password}</p>}
                        
                        {mode === "login" && (
                          <div className="flex justify-end mt-2">
                            <button 
                              type="button" 
                              onClick={() => { setFieldErrors({}); setMode("forgot-password"); setIsResetSent(false); }}
                              className="text-[11px] text-zinc-500 hover:text-white transition-colors"
                            >
                              Forgot password?
                            </button>
                          </div>
                        )}
                      </div>

                      {mode === "signup" && (
                        <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                          <label className="block text-xs font-medium text-zinc-400 mb-2">Confirm Password</label>
                          <div className="relative group">
                            <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${fieldErrors.confirmPassword ? 'text-red-500' : 'text-zinc-500 group-focus-within:text-emerald-500'}`} size={18} />
                            <input 
                              type={showPassword ? "text" : "password"} 
                              value={confirmPassword} 
                              onChange={e => {setConfirmPassword(e.target.value); setFieldErrors(p => ({...p, confirmPassword: undefined}))}} 
                              required 
                              placeholder="••••••••" 
                              className={`w-full bg-zinc-950 border rounded-xl py-3.5 pl-11 pr-4 text-sm transition-all shadow-sm text-white focus:outline-none ${
                                fieldErrors.confirmPassword 
                                  ? "border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 placeholder-red-500/30" 
                                  : "border-zinc-800 placeholder-zinc-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                              }`} 
                            />
                          </div>
                          {fieldErrors.confirmPassword && (
                            <p className="text-[11px] text-red-500 font-medium mt-1.5 pl-1 animate-in fade-in">
                              {fieldErrors.confirmPassword}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <button 
                      disabled={loading}
                      type="submit" 
                      className="w-full bg-emerald-600 hover:bg-emerald-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-[1.02] focus:ring-4 focus:ring-emerald-500/20 text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:hover:scale-100 mt-6"
                    >
                      {loading ? <><Loader2 size={18} className="animate-spin" /> {loadingText}</> : (mode === "login" ? "Enter TradeVault" : "Create Account")}
                    </button>
                  </form>

                  <div className="relative flex items-center py-5">
                    <div className="flex-grow border-t border-white/5"></div>
                    <span className="flex-shrink-0 mx-4 text-zinc-500 text-[11px] font-bold uppercase tracking-widest">OR</span>
                    <div className="flex-grow border-t border-white/5"></div>
                  </div>

                  <button 
                    disabled={loading}
                    onClick={handleGoogleLogin}
                    className="w-full bg-zinc-900 border border-white/10 hover:border-white/20 hover:bg-zinc-800 hover:-translate-y-0.5 focus:ring-4 focus:ring-white/10 text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-md disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Google
                  </button>

                  <div className="text-center pt-2">
                    <button 
                      type="button" 
                      onClick={() => {
                        setFieldErrors({});
                        setSuccessMsg(null);
                        setMode(mode === "login" ? "signup" : "login");
                        setIsResetSent(false);
                      }} 
                      className="text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                      {mode === "login" ? (
                        <>New here? <span className="text-emerald-500 font-medium">Start tracking today</span></>
                      ) : (
                        <>Already have an account? <span className="text-emerald-500 font-medium">Log in</span></>
                      )}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}

function Feature({ check }: { check: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <span className="text-zinc-300 font-medium">{check}</span>
    </div>
  );
}
