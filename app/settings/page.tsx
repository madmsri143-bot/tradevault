"use client";

import { useAuth } from "@/lib/AuthContext";
import { useTrial, useTrialWindow } from "@/components/TrialGuard";
import { Settings as SettingsIcon, Shield, Palette, LogOut, Info, ExternalLink, Moon, Check, X, Loader2, Mail } from "lucide-react";
import { signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useModal } from "@/lib/ModalContext";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { confirm, alert } = useModal();
  const { access } = useTrial();
  const { trialStart, trialEnd, isTrialRestricted } = useTrialWindow();
  const isFree = access === "free";
  
  // Theme State
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  
  // Password State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isResettingEmail, setIsResettingEmail] = useState(false);

  // Initialize theme from HTML tag which is managed by layout script
  useEffect(() => {
    if (document.documentElement.classList.contains("light")) {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  }, []);

  const handleThemeChange = (newTheme: "dark" | "light") => {
    setTheme(newTheme);
    if (newTheme === "light") {
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
    }
  };

  const handleLogout = async () => {
    const isConfirmed = await confirm({
      title: "Confirm Logout",
      message: "Are you sure you want to log out of your session?",
      confirmLabel: "Logout",
      cancelLabel: "Cancel",
      variant: "danger"
    });
    
    if (isConfirmed) {
      await signOut(auth);
      router.push("/");
    }
  };

  const handleChangePassword = async () => {
    if (!auth.currentUser || !newPassword || !oldPassword) return;
    setIsSavingPassword(true);
    try {
      if (auth.currentUser.email) {
        const credential = EmailAuthProvider.credential(auth.currentUser.email, oldPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
      }
      
      await updatePassword(auth.currentUser, newPassword);
      await alert({ title: "Success", message: "Password updated successfully!", variant: "safe" });
      setIsChangingPassword(false);
      setOldPassword("");
      setNewPassword("");
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
         await alert({ title: "Error", message: "Incorrect current password.", variant: "danger" });
      } else if (err.code === 'auth/requires-recent-login') {
         await alert({ title: "Security Required", message: "Please log out and log back in to change your password for security reasons.", variant: "info" });
      } else {
         await alert({ title: "Error", message: "Failed to update password. Ensure your new password is at least 6 characters.", variant: "danger" });
      }
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handlePasswordResetRequest = async () => {
    if (!user?.email) return;
    setIsResettingEmail(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      await alert({ title: "Email Sent", message: `Password reset link sent to ${user.email}`, variant: "info" });
      setIsChangingPassword(false);
    } catch (err) {
      await alert({ title: "Error", message: "Failed to send reset link.", variant: "danger" });
    } finally {
      setIsResettingEmail(false);
    }
  };

  const getTradeData = async () => {
    if (!user) return [];
    const querySnapshot = await getDocs(collection(db, "users", user.uid, "trades"));
    const trades = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return trades.sort((a: any, b: any) => parseFloat(b.date) - parseFloat(a.date));
  };

  const isGoogleAuth = user?.providerData?.some(p => p.providerId === "google.com");

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[800px] mx-auto pb-10 mt-6 lg:mt-10">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#111827] pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#EAEAEA] flex items-center gap-3">
            <SettingsIcon className="text-emerald-500" /> Account Settings
          </h2>
          <p className="text-sm text-[#A0A0A0] mt-1">Manage your workspace preferences and application security.</p>
        </div>
      </div>

      <div className="space-y-8">
        
        {/* Section: Preferences */}
        <div className="bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border border-[rgba(212,175,55,0.15)] fade-slide-up shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)] rounded-2xl overflow-hidden shadow-sm">
           <div className="p-5 border-b border-[#111827] bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md flex items-center gap-2">
              <Palette className="text-blue-500" size={18} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#EAEAEA]">Preferences</h3>
           </div>
           <div className="p-0 divide-y divide-white/5">
              <div className="flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors">
                 <div className="flex items-center gap-4">
                   <div className="p-2.5 bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md rounded-2xl border border-[rgba(212,175,55,0.15)] shadow-inner hidden sm:block"><Moon size={20} className="text-[#A0A0A0]" /></div>
                   <div>
                     <p className="font-bold text-[#EAEAEA] text-sm">Application Theme</p>
                     <p className="text-[#A0A0A0] text-xs mt-0.5">Toggle between Dark Mode and Light Mode.</p>
                   </div>
                 </div>
                 <div className="flex bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md p-1 rounded-2xl shadow-inner border border-[rgba(212,175,55,0.15)]">
                   <button 
                     onClick={() => handleThemeChange("dark")}
                     className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${theme === "dark" ? "bg-zinc-800 text-[#EAEAEA] shadow-sm ring-1 ring-white/10" : "text-[#A0A0A0] hover:text-[#EAEAEA]"}`}
                   >
                     Dark
                   </button>
                   <button 
                     onClick={() => handleThemeChange("light")}
                     className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${theme === "light" ? "bg-zinc-800 text-[#EAEAEA] shadow-sm ring-1 ring-white/10" : "text-[#A0A0A0] hover:text-[#EAEAEA]"}`}
                   >
                     Light
                   </button>
                 </div>
              </div>
           </div>
        </div>


        {/* Section: Security */}
        <div className="bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border border-[rgba(212,175,55,0.15)] fade-slide-up shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)] rounded-2xl overflow-hidden shadow-sm">
           <div className="p-5 border-b border-[#111827] bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md flex items-center gap-2">
              <Shield className="text-red-500" size={18} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#EAEAEA]">Security</h3>
           </div>
           <div className="p-6 space-y-8">
              <div>
                 <p className="text-sm font-bold text-[#EAEAEA] mb-4">Login Methods</p>
                 <div className="bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                   <div className="flex items-center gap-3">
                     <div className="p-2 border border-emerald-500/20 bg-emerald-500/10 rounded-lg">
                       <Shield className="text-emerald-500" size={20} />
                     </div>
                     <div>
                       <p className="text-sm font-bold text-[#EAEAEA]">{isGoogleAuth ? "Google Authentication" : "Email & Password"}</p>
                       <p className="text-xs text-[#A0A0A0] mt-0.5 text-emerald-500/70 font-medium">Primary authentication method active.</p>
                     </div>
                   </div>
                   {!isGoogleAuth && !isChangingPassword && (
                     <button 
                       onClick={() => setIsChangingPassword(true)}
                       className="px-5 py-2.5 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-[#EAEAEA] rounded-lg border border-[rgba(212,175,55,0.15)] transition-colors shadow-sm"
                     >
                       Change Password
                     </button>
                   )}
                 </div>
                 
                 {isChangingPassword && !isGoogleAuth && (
                   <div className="mt-4 p-5 bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border border-zinc-800 rounded-2xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
                     <p className="text-sm font-bold text-[#EAEAEA]">Update Password</p>
                     
                     <div className="space-y-3">
                       <input 
                         type="password" 
                         value={oldPassword}
                         onChange={(e) => setOldPassword(e.target.value)}
                         placeholder="Current Password"
                         className="w-full bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border border-zinc-800 rounded-2xl p-3 text-sm text-[#EAEAEA] focus:outline-none focus:border-emerald-500 transition-colors"
                       />
                       <input 
                         type="password" 
                         value={newPassword}
                         onChange={(e) => setNewPassword(e.target.value)}
                         placeholder="New Strong Password"
                         className="w-full bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border border-zinc-800 rounded-2xl p-3 text-sm text-[#EAEAEA] focus:outline-none focus:border-emerald-500 transition-colors"
                       />
                     </div>

                     <div className="flex gap-3 mt-1">
                       <button 
                         onClick={handleChangePassword}
                         disabled={isSavingPassword || !newPassword || !oldPassword}
                         className="px-5 py-2.5 text-xs font-bold bg-emerald-500 hover:bg-amber-400 text-zinc-950 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                       >
                         {isSavingPassword ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Update Password
                       </button>
                       <button 
                         onClick={() => { setIsChangingPassword(false); setNewPassword(""); setOldPassword(""); }}
                         disabled={isSavingPassword}
                         className="px-5 py-2.5 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-[#EAEAEA] rounded-lg transition-colors"
                       >
                         Cancel
                       </button>
                     </div>
                     
                     <div className="pt-3 border-t border-[#111827] mt-1 flex flex-col gap-1 items-start">
                       <p className="text-xs text-[#A0A0A0]">Forgot your current password?</p>
                       <button 
                         onClick={handlePasswordResetRequest} 
                         disabled={isResettingEmail}
                         className="text-xs text-emerald-500 hover:text-amber-400 font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                       >
                         {isResettingEmail ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                         Change via Email Link
                       </button>
                     </div>
                   </div>
                 )}
              </div>

              <div className="pt-6 border-t border-[#111827]">
                 <p className="text-sm font-bold text-[#EAEAEA] mb-4">Device Sessions</p>
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                   <p className="text-xs text-[#A0A0A0] max-w-md leading-relaxed">Securely log out of your current session on this device.</p>
                   <button onClick={handleLogout} className="shrink-0 px-4 py-2.5 text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg flex items-center gap-2 transition-colors shadow">
                     <LogOut size={14} /> Log Out
                   </button>
                 </div>
              </div>
           </div>
        </div>

        {/* Section: App Info */}
        <div className="bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md border border-[rgba(212,175,55,0.15)] fade-slide-up shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)] rounded-2xl overflow-hidden shadow-sm">
           <div className="p-5 border-b border-[#111827] bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md flex items-center gap-2">
              <Info className="text-purple-500" size={18} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#EAEAEA]">App Info</h3>
           </div>
           <div className="p-6">
              <div className="flex items-center justify-between">
                 <div>
                   <p className="text-base font-brand font-black text-[#EAEAEA] tracking-tight">JournalBud Version</p>
                   <p className="text-xs text-[#A0A0A0] mt-1 font-medium">v2.4.0 (Build 9081)</p>
                 </div>
                 <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                   <a href="#" className="flex items-center gap-1.5 text-xs font-bold text-[#A0A0A0] hover:text-[#D4AF37] transition-colors">
                     Privacy Policy <ExternalLink size={12} />
                   </a>
                   <a href="#" className="flex items-center gap-1.5 text-xs font-bold text-[#A0A0A0] hover:text-[#D4AF37] transition-colors">
                     Terms of Service <ExternalLink size={12} />
                   </a>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
