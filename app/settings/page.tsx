"use client";

import { useAuth } from "@/lib/AuthContext";
import { useTrial } from "@/components/TrialGuard";
import { Settings as SettingsIcon, Shield, Palette, LogOut, Info, ExternalLink, Moon, Check, X, Loader2, Mail, Download, FileText, Presentation } from "lucide-react";
import { signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useModal } from "@/lib/ModalContext";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { confirm, alert } = useModal();
  const { access } = useTrial();
  const isFree = access === "free";
  
  // Theme State
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  
  // Password State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isResettingEmail, setIsResettingEmail] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMode, setExportMode] = useState<"all" | "range" | null>(null);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");

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

  const fetchAndFilterTrades = async () => {
    if (!exportMode) {
      await alert({ title: "Selection Required", message: "Please select Entire History or Specific Date Range.", variant: "info" });
      return null;
    }
    
    if (exportMode === "range" && (!exportFrom || !exportTo)) {
      await alert({ title: "Date Range Required", message: "Please select both From and To dates for the Specific Date Range.", variant: "info" });
      return null;
    }

    const allTrades = await getTradeData();
    let filtered = allTrades;
    
    if (exportMode === "range") {
      const fromD = new Date(exportFrom).setHours(0,0,0,0);
      const toD = new Date(exportTo).setHours(23,59,59,999);
      filtered = allTrades.filter((t: any) => {
        const d = new Date(t.date).getTime();
        return d >= fromD && d <= toD;
      });
    }

    if (filtered.length === 0) {
      await alert({ title: "No Trades Found", message: "No trades available for selected range.", variant: "info" });
      return null;
    }
    return filtered;
  };

  const handleExportGated = async () => {
    await confirm({
      title: "Pro Feature",
      message: "Export is available on the Professional Plan. Upgrade to unlock PDF, CSV, and PPTX exports.",
      confirmLabel: "Upgrade to Pro",
      cancelLabel: "Maybe Later",
      variant: "safe"
    }).then((confirmed) => {
      if (confirmed) router.push("/billing");
    });
  };

  const handleExportCSV = async () => {
    if (isFree) { handleExportGated(); return; }
    const trades = await fetchAndFilterTrades();
    if (!trades) return;
    setIsExporting(true);
    try {
      const headers = ["Date", "Pair", "Direction", "Entry", "Exit", "PnL", "Result", "Tags"];
      const csvContent = [
        headers.join(","),
        ...trades.map((t: any) => [
          format(new Date(parseFloat(t.date)), "yyyy-MM-dd"),
          t.pair || t.symbol || "", // Ensure backwards compatibility for symbol naming
          t.direction || t.type || "",
          t.entryPrice || 0,
          t.exitPrice || 0,
          t.pnl || 0,
          t.result,
          (t.tags || []).join(";")
        ].join(","))
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `JournalBud_Export_${format(new Date(), "MMM_dd_yyyy")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch(err) {
      console.error(err);
      await alert({ title: "Export Failed", message: "Failed to export trades.", variant: "danger" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (isFree) { handleExportGated(); return; }
    const trades = await fetchAndFilterTrades();
    if (!trades) return;
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("JOURNALBUD", 14, 20);
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Trade History Report - ${format(new Date(), "PP")}`, 14, 30);
      
      const bodyData = trades.map((t: any) => [
        format(new Date(parseFloat(t.date)), "MM/dd/yy"),
        t.pair || t.symbol || "Unknown",
        t.direction || t.type || "N/A",
        `$${t.pnl?.toFixed(2) || "0.00"}`,
        t.result
      ]);

      autoTable(doc, {
        startY: 40,
        head: [["Date", "Asset", "Direction", "PnL", "Status"]],
        body: bodyData,
        theme: "striped",
        headStyles: { fillColor: [0, 255, 178], textColor: [0,0,0] }
      });
      
      doc.save(`JournalBud_History_${format(new Date(), "MMM_dd_yyyy")}.pdf`);
    } catch(err) {
      console.error(err);
      await alert({ title: "Export Failed", message: "Failed to export PDF.", variant: "danger" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPPT = async () => {
    if (isFree) { handleExportGated(); return; }
    const trades = await fetchAndFilterTrades();
    if (!trades) return;
    setIsExporting(true);
    try {
      const PptxGenJS = (await import("pptxgenjs")).default;
      const pptx = new PptxGenJS();
      
      pptx.layout = "LAYOUT_16x9";
      
      const slide = pptx.addSlide();
      slide.addText("JournalBud Performance Report", { x: 1.5, y: 1.5, w: "80%", h: 1, fontSize: 36, bold: true, color: "00FFB2" });
      slide.addText(`Generated on ${format(new Date(), "PP")}`, { x: 1.5, y: 2.5, w: "80%", h: 1, fontSize: 18, color: "888888" });
      
      const winningTrades = trades.filter((t:any) => t.result === "Profit" || t.result === "WIN").length;
      const totalTrades = trades.length;
      const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : "0.0";
      
      slide.addText(`Total Trades: ${totalTrades}\nWin Rate: ${winRate}%\n`, { x: 1.5, y: 4, w: "80%", h: 2, fontSize: 24, align: "left" });
      
      await pptx.writeFile({ fileName: `JournalBud_Presentation_${format(new Date(), "MMM_dd_yyyy")}.pptx` });
    } catch(err) {
      console.error(err);
      await alert({ title: "Export Failed", message: "Failed to export PPT.", variant: "danger" });
    } finally {
      setIsExporting(false);
    }
  };

  const isGoogleAuth = user?.providerData?.some(p => p.providerId === "google.com");

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[800px] mx-auto pb-10 mt-6 lg:mt-10">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <SettingsIcon className="text-emerald-500" /> Account Settings
          </h2>
          <p className="text-sm text-zinc-400 mt-1">Manage your workspace preferences and application security.</p>
        </div>
      </div>

      <div className="space-y-8">
        
        {/* Section: Preferences */}
        <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none rounded-2xl overflow-hidden shadow-sm">
           <div className="p-5 border-b border-white/5 bg-zinc-900/50 flex items-center gap-2">
              <Palette className="text-blue-500" size={18} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Preferences</h3>
           </div>
           <div className="p-0 divide-y divide-white/5">
              <div className="flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors">
                 <div className="flex items-center gap-4">
                   <div className="p-2.5 bg-zinc-950 rounded-xl border border-white/5 shadow-inner hidden sm:block"><Moon size={20} className="text-zinc-400" /></div>
                   <div>
                     <p className="font-bold text-white text-sm">Application Theme</p>
                     <p className="text-zinc-500 text-xs mt-0.5">Toggle between Dark Mode and Light Mode.</p>
                   </div>
                 </div>
                 <div className="flex bg-zinc-950 p-1 rounded-xl shadow-inner border border-white/5">
                   <button 
                     onClick={() => handleThemeChange("dark")}
                     className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${theme === "dark" ? "bg-zinc-800 text-white shadow-sm ring-1 ring-white/10" : "text-zinc-500 hover:text-zinc-300"}`}
                   >
                     Dark
                   </button>
                   <button 
                     onClick={() => handleThemeChange("light")}
                     className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${theme === "light" ? "bg-zinc-800 text-white shadow-sm ring-1 ring-white/10" : "text-zinc-500 hover:text-zinc-300"}`}
                   >
                     Light
                   </button>
                 </div>
              </div>
           </div>
        </div>

         {/* Section: Export Engine */}
         <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-white/5 bg-zinc-900/50 flex items-center gap-2">
               <Download className="text-[#00FFB2]" size={18} />
               <h3 className="text-sm font-bold uppercase tracking-wider text-white">Export Data</h3>
            </div>
            <div className="p-6">
               <p className="text-xs text-zinc-400 max-w-lg leading-relaxed mb-6">
                 Download your entire trading history for external accounting, presentations, or offline analytics. All exports include your full historical dataset.
               </p>
               
               <div className="mb-6 space-y-4">
                 <div className="flex flex-col gap-3 p-4 bg-black/20 rounded-xl border border-white/5">
                   <label className="flex items-center gap-3 cursor-pointer group w-fit">
                     <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${exportMode === 'all' ? 'border-[#00FFB2] bg-[#00FFB2]/20' : 'border-zinc-700 bg-zinc-900 group-hover:border-zinc-500'}`}>
                       {exportMode === 'all' && <div className="w-2.5 h-2.5 rounded-full bg-[#00FFB2]" />}
                     </div>
                     <span className={`text-sm font-bold select-none ${exportMode === 'all' ? 'text-white' : 'text-zinc-400'}`}>Entire History</span>
                     <input type="radio" className="hidden" checked={exportMode === 'all'} onChange={() => setExportMode('all')} />
                   </label>
                   
                   <label className="flex items-center gap-3 cursor-pointer group w-fit">
                     <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${exportMode === 'range' ? 'border-orange-500 bg-orange-500/20' : 'border-zinc-700 bg-zinc-900 group-hover:border-zinc-500'}`}>
                       {exportMode === 'range' && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                     </div>
                     <span className={`text-sm font-bold select-none ${exportMode === 'range' ? 'text-white' : 'text-zinc-400'}`}>Specific Date Range</span>
                     <input type="radio" className="hidden" checked={exportMode === 'range'} onChange={() => setExportMode('range')} />
                   </label>

                   {exportMode === 'range' && (
                     <div className="flex flex-col sm:flex-row sm:items-center gap-3 ml-8 mt-1 animate-in slide-in-from-top-2">
                       <input 
                         type="date"
                         value={exportFrom}
                         onChange={(e) => setExportFrom(e.target.value)} 
                         className="bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none focus:border-orange-500 color-scheme-dark" 
                       />
                       <span className="text-zinc-500 text-xs font-bold">TO</span>
                       <input 
                         type="date" 
                         value={exportTo}
                         onChange={(e) => setExportTo(e.target.value)} 
                         className="bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none focus:border-orange-500 color-scheme-dark" 
                       />
                     </div>
                   )}
                 </div>
               </div>
               
               {isExporting && (
                 <div className="mb-4 flex items-center gap-2 text-xs font-bold text-[#00FFB2] bg-[#00FFB2]/10 p-3 rounded-lg border border-[#00FFB2]/20 shadow-sm animate-pulse">
                   <Loader2 size={14} className="animate-spin" /> Exporting trades... Please wait.
                 </div>
               )}

               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <button 
                   onClick={handleExportCSV}
                   disabled={isExporting}
                   className="p-5 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-[#00FFB2]/50 hover:bg-zinc-950/80 transition-all flex flex-col items-center justify-center gap-3 group disabled:opacity-50"
                 >
                   <FileText size={28} className="text-zinc-500 group-hover:text-[#00FFB2] transition-colors" />
                   <span className="text-sm font-bold text-white tracking-tight">Export CSV</span>
                 </button>
                 
                 <button 
                   onClick={handleExportPDF}
                   disabled={isExporting}
                   className="p-5 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-red-500/50 hover:bg-zinc-950/80 transition-all flex flex-col items-center justify-center gap-3 group disabled:opacity-50"
                 >
                   <Download size={28} className="text-zinc-500 group-hover:text-red-400 transition-colors" />
                   <span className="text-sm font-bold text-white tracking-tight">Export PDF</span>
                 </button>
                 
                 <button 
                   onClick={handleExportPPT}
                   disabled={isExporting}
                   className="p-5 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-orange-500/50 hover:bg-zinc-950/80 transition-all flex flex-col items-center justify-center gap-3 group disabled:opacity-50"
                 >
                   <Presentation size={28} className="text-zinc-500 group-hover:text-orange-400 transition-colors" />
                   <span className="text-sm font-bold text-white tracking-tight">Export PPTX</span>
                 </button>
               </div>
            </div>
         </div>

        {/* Section: Security */}
        <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none rounded-2xl overflow-hidden shadow-sm">
           <div className="p-5 border-b border-white/5 bg-zinc-900/50 flex items-center gap-2">
              <Shield className="text-red-500" size={18} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Security</h3>
           </div>
           <div className="p-6 space-y-8">
              <div>
                 <p className="text-sm font-bold text-white mb-4">Login Methods</p>
                 <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                   <div className="flex items-center gap-3">
                     <div className="p-2 border border-emerald-500/20 bg-emerald-500/10 rounded-lg">
                       <Shield className="text-emerald-500" size={20} />
                     </div>
                     <div>
                       <p className="text-sm font-bold text-white">{isGoogleAuth ? "Google Authentication" : "Email & Password"}</p>
                       <p className="text-xs text-zinc-500 mt-0.5 text-emerald-500/70 font-medium">Primary authentication method active.</p>
                     </div>
                   </div>
                   {!isGoogleAuth && !isChangingPassword && (
                     <button 
                       onClick={() => setIsChangingPassword(true)}
                       className="px-5 py-2.5 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg border border-white/5 transition-colors shadow-sm"
                     >
                       Change Password
                     </button>
                   )}
                 </div>
                 
                 {isChangingPassword && !isGoogleAuth && (
                   <div className="mt-4 p-5 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
                     <p className="text-sm font-bold text-white">Update Password</p>
                     
                     <div className="space-y-3">
                       <input 
                         type="password" 
                         value={oldPassword}
                         onChange={(e) => setOldPassword(e.target.value)}
                         placeholder="Current Password"
                         className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                       />
                       <input 
                         type="password" 
                         value={newPassword}
                         onChange={(e) => setNewPassword(e.target.value)}
                         placeholder="New Strong Password"
                         className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                       />
                     </div>

                     <div className="flex gap-3 mt-1">
                       <button 
                         onClick={handleChangePassword}
                         disabled={isSavingPassword || !newPassword || !oldPassword}
                         className="px-5 py-2.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                       >
                         {isSavingPassword ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Update Password
                       </button>
                       <button 
                         onClick={() => { setIsChangingPassword(false); setNewPassword(""); setOldPassword(""); }}
                         disabled={isSavingPassword}
                         className="px-5 py-2.5 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                       >
                         Cancel
                       </button>
                     </div>
                     
                     <div className="pt-3 border-t border-white/5 mt-1 flex flex-col gap-1 items-start">
                       <p className="text-xs text-zinc-500">Forgot your current password?</p>
                       <button 
                         onClick={handlePasswordResetRequest} 
                         disabled={isResettingEmail}
                         className="text-xs text-emerald-500 hover:text-emerald-400 font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                       >
                         {isResettingEmail ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                         Change via Email Link
                       </button>
                     </div>
                   </div>
                 )}
              </div>

              <div className="pt-6 border-t border-white/5">
                 <p className="text-sm font-bold text-zinc-300 mb-4">Device Sessions</p>
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                   <p className="text-xs text-zinc-400 max-w-md leading-relaxed">Securely log out of your current session on this device.</p>
                   <button onClick={handleLogout} className="shrink-0 px-4 py-2.5 text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg flex items-center gap-2 transition-colors shadow">
                     <LogOut size={14} /> Log Out
                   </button>
                 </div>
              </div>
           </div>
        </div>

        {/* Section: App Info */}
        <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none rounded-2xl overflow-hidden shadow-sm">
           <div className="p-5 border-b border-white/5 bg-zinc-900/50 flex items-center gap-2">
              <Info className="text-purple-500" size={18} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">App Info</h3>
           </div>
           <div className="p-6">
              <div className="flex items-center justify-between">
                 <div>
                   <p className="text-base font-brand font-black text-white tracking-tight">JournalBud Version</p>
                   <p className="text-xs text-zinc-500 mt-1 font-medium">v2.4.0 (Build 9081)</p>
                 </div>
                 <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                   <a href="#" className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-[#00FFB2] transition-colors">
                     Privacy Policy <ExternalLink size={12} />
                   </a>
                   <a href="#" className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-[#00FFB2] transition-colors">
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
