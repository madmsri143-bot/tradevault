"use client";

import { User, Download, FileText, Moon, Sun, RefreshCw, Trash2, LogOut, Camera, Loader2, Save, X, Lock, Shield, Key, ShieldAlert, AlertTriangle, Info, Settings } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { collection, getDocs, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { useAuth } from "@/lib/AuthContext";
import { useModal } from "@/lib/ModalContext";
import Modal from "@/components/ui/Modal";
import { signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

interface UserProfile {
  name: string;
  email: string;
  photoUrl: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { confirm, alert } = useModal();
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // --- Profile State ---
  const [profile, setProfile] = useState<UserProfile>({ name: "Demo User", email: "demo@tradingjournal.com", photoUrl: "" });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempProfile, setTempProfile] = useState<UserProfile>({ name: "", email: "", photoUrl: "" });
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Security State ---
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [exportEntireHistory, setExportEntireHistory] = useState(true);
  const [exportFromDate, setExportFromDate] = useState("");
  const [exportToDate, setExportToDate] = useState("");

  useEffect(() => {
    setIsDarkMode(!document.documentElement.classList.contains("light"));
    
    // Live stream profile
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid, "settings", "profile"), (d) => {
      if(d.exists()) {
        const data = d.data() as UserProfile;
        const finalData = { ...data, email: user.email || data.email };
        setProfile(finalData);
        setTempProfile(finalData);
      } else {
        const defaultProfile = { name: "Demo User", email: user.email || "demo@tradingjournal.com", photoUrl: "" };
        setTempProfile(defaultProfile);
        setProfile(defaultProfile);
      }
    });
    return () => unsub();
  }, [user]);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.remove("dark");
      root.classList.add("light");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
  };

  const getFilteredTrades = (allTrades: any[]) => {
    if (exportEntireHistory) return allTrades;
    if (!exportFromDate || !exportToDate) {
      throw new Error("Please select both 'From' and 'To' dates.");
    }
    const fromTime = new Date(exportFromDate).getTime();
    const toDateObj = new Date(exportToDate);
    toDateObj.setHours(23, 59, 59, 999);
    const toTime = toDateObj.getTime();

    return allTrades.filter(t => t.date >= fromTime && t.date <= toTime);
  };

  const handleExportExcel = async () => {
    try {
      if (!user) return;
      const snap = await getDocs(collection(db, "users", user.uid, "trades"));
      let tradesData = snap.docs.map(d => d.data());
      
      try {
        tradesData = getFilteredTrades(tradesData);
      } catch (err: any) {
        await alert({ message: err.message, title: "Validation Error" });
        return;
      }
      
      if (tradesData.length === 0) {
        await alert({ message: "No trades found in the selected date range." });
        return;
      }

      const exportData = tradesData.map((t: any) => ({
        Date: format(new Date(t.date), "yyyy-MM-dd"),
        Asset: t.symbol,
        Type: t.type.toUpperCase(),
        Lot: t.lot,
        Currency: t.currency,
        "PnL": t.result === "Loss" ? -Math.abs(t.pnl) : Math.abs(t.pnl),
        Notes: t.note || ""
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Trades");
      XLSX.writeFile(workbook, `TradingJournal_${exportEntireHistory ? 'All' : exportFromDate}.xlsx`);
    } catch (e) {
      await alert({ message: "Failed to export Excel." });
    }
  };

  const handleExportPDF = async () => {
    try {
      if (!user) return;
      const snap = await getDocs(collection(db, "users", user.uid, "trades"));
      let tradesData = snap.docs.map(d => d.data());

      try {
        tradesData = getFilteredTrades(tradesData);
      } catch (err: any) {
        await alert({ message: err.message, title: "Validation Error" });
        return;
      }
      
      if (tradesData.length === 0) {
        await alert({ message: "No trades found in the selected date range." });
        return;
      }

      tradesData = tradesData.sort((a: any, b: any) => b.date - a.date);
      
      const pdfDoc = new jsPDF();
      pdfDoc.text(exportEntireHistory ? "Trading Journal Report" : `Trading Report (${exportFromDate} to ${exportToDate})`, 14, 15);
      pdfDoc.setFontSize(10);
      pdfDoc.text(`Generated on: ${format(new Date(), "PPpp")}`, 14, 22);
      
      const totalPnL = tradesData.reduce((sum, t: any) => sum + (t.result === "Loss" ? -Math.abs(t.pnl) : Math.abs(t.pnl)), 0);
      pdfDoc.text(`Total PnL: ${totalPnL >= 0 ? '+' : '-'}$${Math.abs(totalPnL).toFixed(2)}`, 14, 29);

      const tableData = tradesData.map((t: any) => [
        format(new Date(t.date), "MMM d, yyyy"),
        t.symbol,
        t.type.toUpperCase(),
        `${t.lot}`,
        `${t.result === "Loss" ? "-" : "+"}$${Math.abs(t.pnl).toFixed(2)}`,
        t.note || "-"
      ]);

      autoTable(pdfDoc, {
        startY: 34,
        head: [["Date", "Asset", "Type", "Lot", "PnL", "Notes"]],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [16, 185, 129] }
      });

      pdfDoc.save("TradingJournal.pdf");
    } catch (e) {
      await alert({ message: "Failed to export PDF." });
    }
  };

  const saveProfile = async () => {
    try {
      if (!user) return;
      // Re-force the real email before saving so it can't be maliciously altered
      const safeProfile = { ...tempProfile, email: user.email || tempProfile.email };
      await setDoc(doc(db, "users", user.uid, "settings", "profile"), safeProfile, { merge: true });
      setIsEditingProfile(false);
    } catch (err) {
      await alert({ message: "Failed to save profile." });
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadingImage(true);
      try {
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "journal_upload");
        const res = await fetch("https://api.cloudinary.com/v1_1/dnvuge0qb/image/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (user) {
          await setDoc(doc(db, "users", user.uid, "settings", "profile"), { ...profile, photoUrl: data.secure_url }, { merge: true });
        }
      } catch (err) {
        await alert({ message: "Failed to upload image." });
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleRefreshData = () => {
    window.location.reload();
  };

  const handleLogout = async () => {
    const isConfirmed = await confirm({
      title: "Confirm Logout",
      message: "Are you sure you want to log out?",
      confirmLabel: "Logout",
      cancelLabel: "Cancel",
      variant: "danger"
    });
    
    if (isConfirmed) {
      await signOut(auth);
      router.push("/login");
    }
  };

  // --- Security Functions ---
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (passwordData.new.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    setPasswordLoading(true);
    setPasswordError("");
    try {
      if (!auth.currentUser || !user?.email) throw new Error("No authenticated user.");
      
      const credential = EmailAuthProvider.credential(user.email, passwordData.current);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, passwordData.new);
      
      await alert({ message: "Password updated successfully", title: "Success", variant: "safe" });
      setPasswordData({ current: "", new: "", confirm: "" });
      setShowPasswordChange(false);
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setPasswordError("Incorrect current password.");
      } else if (err.code === "auth/invalid-login-credentials") {
         setPasswordError("Incorrect credential or you are using Google Login.");
      } else {
        setPasswordError(err.message || "Failed to change password.");
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== "DELETE") {
      setDeleteError("Please type DELETE to confirm.");
      return;
    }
    setDeleteLoading(true);
    setDeleteError("");
    try {
      if (!auth.currentUser || !user?.uid) throw new Error("No authenticated user.");

      // Check credential explicitly for peace of mind
      if (deletePassword && user.email) {
         const credential = EmailAuthProvider.credential(user.email, deletePassword);
         await reauthenticateWithCredential(auth.currentUser, credential);
      }

      // Pre-delete Firestore data
      const tradesSnap = await getDocs(collection(db, "users", user.uid, "trades"));
      const journalSnap = await getDocs(collection(db, "users", user.uid, "journal"));
      const targetsSnap = await getDocs(collection(db, "users", user.uid, "targets"));
      
      const deletePromises: Promise<void>[] = [];
      tradesSnap.forEach(d => deletePromises.push(deleteDoc(doc(db, "users", user.uid, "trades", d.id))));
      journalSnap.forEach(d => deletePromises.push(deleteDoc(doc(db, "users", user.uid, "journal", d.id))));
      targetsSnap.forEach(d => deletePromises.push(deleteDoc(doc(db, "users", user.uid, "targets", d.id))));
      deletePromises.push(deleteDoc(doc(db, "users", user.uid, "settings", "profile")));
      
      await Promise.all(deletePromises);

      // Delete user from Firebase Auth
      await deleteUser(auth.currentUser);
      
      // Force sign out
      await signOut(auth);
      router.push("/login");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/requires-recent-login") {
        setDeleteError("Security requirement: Please log out and back in before deleting your account.");
      } else {
        setDeleteError(err.message || "Failed to delete account. Check your password.");
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Settings</h1>
        <p className="text-sm text-zinc-400 mt-1">Manage your account, preferences, and data exports.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        {/* Profile Section */}
        <section className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-zinc-900/50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
              <User size={18} />
              Profile
            </h2>
            {!isEditingProfile ? (
              <button onClick={() => { setTempProfile(profile); setIsEditingProfile(true); }} className="text-sm text-zinc-400 hover:text-white transition-colors">Edit Profile</button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setIsEditingProfile(false)} className="text-sm text-zinc-400 hover:text-white transition-colors"><X size={16} /></button>
                <button onClick={saveProfile} className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors"><Save size={16} /></button>
              </div>
            )}
          </div>
          <div className="p-6 flex flex-col sm:flex-row items-start gap-8">
            <div className="relative group shrink-0">
              <div className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-emerald-500/50 flex items-center justify-center overflow-hidden">
                {profile.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={40} className="text-zinc-500" />
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                {uploadingImage ? <Loader2 className="animate-spin text-white" size={20} /> : <Camera className="text-white" size={20} />}
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
            </div>
            
            <div className="flex-1 w-full space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  Name
                </label>
                <input 
                  type="text" 
                  value={isEditingProfile ? tempProfile.name : profile.name} 
                  onChange={e => setTempProfile({...tempProfile, name: e.target.value})}
                  readOnly={!isEditingProfile} 
                  className={`w-full bg-zinc-950 border rounded-lg p-3 text-sm text-white focus:outline-none transition-colors ${isEditingProfile ? "border-emerald-500/50" : "border-zinc-800"}`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  Email
                  <Lock size={12} className="text-emerald-500" />
                </label>
                <input 
                  type="email" 
                  value={profile.email} 
                  readOnly
                  className="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-lg p-3 text-sm text-zinc-500 cursor-not-allowed opacity-80"
                />
                <p className="text-[11px] text-zinc-500 mt-2 font-medium flex items-center gap-1.5"><ShieldAlert size={12} className="text-amber-500/70" /> Email cannot be changed for security reasons</p>
              </div>
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-zinc-900/50">
            <h2 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
              <Settings size={18} />
              Preferences
            </h2>
          </div>
          <div className="p-0">
            {/* Export System */}
            <div className="flex flex-col p-6 border-b border-white/5 gap-5 hover:bg-white/[0.02] transition-colors">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                  <Download size={14} className="text-emerald-500" /> Export Local Data
                </h3>
                <p className="text-xs text-zinc-500">Download your history offline.</p>
              </div>
              
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-zinc-950/50 p-4 rounded-xl border border-black/10 dark:border-white/5 shadow-inner">
                {/* Inputs Group */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-6 flex-1">
                  {/* Entire History Toggle */}
                  <label className="flex items-center gap-2.5 cursor-pointer shrink-0 group">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        checked={exportEntireHistory}
                        onChange={(e) => setExportEntireHistory(e.target.checked)}
                        className="peer hidden"
                      />
                      <div className="w-4 h-4 rounded-[4px] border border-zinc-700 bg-zinc-900 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-colors flex items-center justify-center group-hover:border-zinc-500">
                        <svg className={`w-2.5 h-2.5 text-white ${exportEntireHistory ? 'opacity-100' : 'opacity-0'} transition-opacity`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-zinc-300 group-hover:text-white transition-colors">Entire History</span>
                  </label>

                  <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
                  
                  {/* Date Range Group */}
                  <div className={`flex flex-col sm:flex-row items-center gap-3 transition-opacity duration-300 w-full sm:w-auto ${exportEntireHistory ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'}`}>
                    <div className="flex items-center gap-2 w-full sm:w-auto bg-zinc-900 border border-zinc-800 rounded-lg pr-1 pl-3 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all">
                      <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-500">From</span>
                      <input 
                        type="date" 
                        disabled={exportEntireHistory}
                        value={exportFromDate}
                        onChange={(e) => setExportFromDate(e.target.value)}
                        className="bg-transparent border-none p-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-0 [color-scheme:dark] w-full sm:w-[120px]"
                      />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto bg-zinc-900 border border-zinc-800 rounded-lg pr-1 pl-3 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all">
                      <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-500">To</span>
                      <input 
                        type="date" 
                        disabled={exportEntireHistory}
                        value={exportToDate}
                        onChange={(e) => setExportToDate(e.target.value)}
                        className="bg-transparent border-none p-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-0 [color-scheme:dark] w-full sm:w-[120px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions Group */}
                <div className="flex items-center gap-3 md:border-l md:border-white/10 md:pl-5 shrink-0 pt-3 md:pt-0 border-t border-white/5 md:border-t-0 mt-2 md:mt-0">
                  <button onClick={handleExportExcel} className="flex-1 md:flex-none justify-center text-[13px] text-emerald-400 font-semibold px-5 py-2.5 border border-emerald-500/20 bg-emerald-500/10 rounded-lg hover:bg-emerald-500 text-white hover:border-emerald-500 transition-all flex items-center gap-2 shadow-sm group">
                    <span className="group-hover:text-white transition-colors">Export .XLSX</span>
                  </button>
                  <button onClick={handleExportPDF} className="flex-1 md:flex-none justify-center text-[13px] text-blue-400 font-semibold px-5 py-2.5 border border-blue-500/20 bg-blue-500/10 rounded-lg hover:bg-blue-500 text-white hover:border-blue-500 transition-all flex items-center gap-2 shadow-sm group">
                    <span className="group-hover:text-white transition-colors">Export .PDF</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
              <div>
                <h3 className="text-sm font-medium text-white mb-1 flex items-center gap-2"><RefreshCw size={14} className="text-zinc-500" /> Force Sync</h3>
                <p className="text-xs text-zinc-500">Pull latest configuration.</p>
              </div>
              <button
                onClick={handleRefreshData}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm font-medium text-zinc-300 hover:text-white transition-colors"
              >
                Refresh
              </button>
            </div>

            <div className="flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors">
              <div>
                <h3 className="text-sm font-medium text-white mb-1">Theme</h3>
                <p className="text-xs text-zinc-500">Toggle dark / light appearance.</p>
              </div>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                title="Toggle Theme"
              >
                {isDarkMode ? <><Moon size={14} className="text-blue-400" /> Dark Mode</> : <><Sun size={14} className="text-amber-400" /> Light Mode</>}
              </button>
            </div>
          </div>
        </section>

        {/* Security Options */}
        <section className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-zinc-900/50">
            <h2 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
              <Shield size={18} />
              Security
            </h2>
          </div>
          <div className="p-0">
            {/* Change Password */}
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center justify-between hover:bg-white/[0.02] -m-6 p-6 transition-colors group cursor-pointer" onClick={() => setShowPasswordChange(!showPasswordChange)}>
                <div>
                  <h3 className="text-sm font-medium text-white mb-1 flex items-center gap-2"><Key size={14} className="text-emerald-400"/> Change Password</h3>
                  <p className="text-xs text-zinc-500">Update your account password using your current credentials.</p>
                </div>
                <button className="text-sm text-emerald-500 font-medium px-4 py-2 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/10 transition">
                  {showPasswordChange ? "Cancel" : "Change"}
                </button>
              </div>
              
              {showPasswordChange && (
                <div className="mt-6 pt-6 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
                    {passwordError && <div className="text-xs text-red-400 bg-red-400/10 p-3 rounded border border-red-400/20">{passwordError}</div>}
                    <div>
                      <input 
                        type="password" 
                        placeholder="Current Password" 
                        required
                        value={passwordData.current}
                        onChange={e => setPasswordData({...passwordData, current: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <input 
                        type="password" 
                        placeholder="New Password (min. 6 characters)" 
                        required
                        value={passwordData.new}
                        onChange={e => setPasswordData({...passwordData, new: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <input 
                        type="password" 
                        placeholder="Confirm New Password" 
                        required
                        value={passwordData.confirm}
                        onChange={e => setPasswordData({...passwordData, confirm: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                    <button type="submit" disabled={passwordLoading} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 px-4 rounded-lg w-full transition flex justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                      {passwordLoading ? <Loader2 size={16} className="animate-spin" /> : "Update Password"}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Logout */}
            <div className="flex items-center justify-between p-6 hover:bg-white/[0.02] border-b border-white/5 transition-colors cursor-pointer" onClick={handleLogout}>
              <div>
                <h3 className="text-sm font-medium text-white mb-1 flex items-center gap-2"><LogOut size={14} className="text-zinc-400"/> Account Logout</h3>
                <p className="text-xs text-zinc-500">Securely sign out of your trading journal on this device.</p>
              </div>
              <button className="text-sm text-zinc-300 font-medium px-4 py-2 border border-zinc-700 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition">
                Logout
              </button>
            </div>

            {/* Delete Account */}
            <div className="flex items-center justify-between p-6 hover:bg-red-500/[0.02] transition-colors cursor-pointer group" onClick={() => setShowDeleteModal(true)}>
              <div>
                <h3 className="text-sm font-medium text-red-500 mb-1 flex items-center gap-2"><AlertTriangle size={14} /> Delete Account</h3>
                <p className="text-xs text-red-500/70">Permanently erase your account, trades, targets, and settings. This cannot be undone.</p>
              </div>
              <button className="text-sm text-red-500 font-medium px-4 py-2 border border-red-500/20 bg-red-500/10 rounded-lg hover:bg-red-500 hover:text-white transition">
                Delete
              </button>
            </div>
          </div>
        </section>

        {/* App Info Single Block */}
        <section className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-zinc-900/50">
            <h2 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
              <Info size={18} />
              App Info
            </h2>
          </div>
          <div className="p-0">
            <div className="p-6 border-b border-white/5">
              <h3 className="text-sm font-medium text-white mb-2">About Trade Journal</h3>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
                A personal trading journal to precisely track, analyze, and objectively improve your active trading performance entirely in real-time. Designed specifically for ruthless execution.
              </p>
            </div>
            <div className="p-6 bg-zinc-950/30 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Version</span>
              <span className="text-xs font-bold text-zinc-400 bg-white/5 px-2.5 py-1 rounded-md">1.0.0</span>
            </div>
          </div>
        </section>

      </div>

      {/* MODALS OVERLAY ZONE */}
      <Modal 
        isOpen={showDeleteModal} 
        onClose={() => { setShowDeleteModal(false); setDeleteError(""); }} 
        title="Delete Account" 
        icon={<AlertTriangle size={24} className="text-red-500" />}
        className="border-red-500/30 shadow-[0_0_40px_rgba(220,38,38,0.1)]"
        maxWidth="md"
      >
        <p className="text-sm text-red-400 mb-6 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
          This will permanently delete your account and all trading data. This action absolutely cannot be undone.
        </p>
        
        <div className="space-y-4">
          {deleteError && <div className="text-xs text-red-500 font-medium">{deleteError}</div>}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Type <strong className="text-white">DELETE</strong> to confirm</label>
            <input 
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="DELETE"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Current Password (optional for specific users)</label>
            <input 
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>
          
          <div className="flex gap-3 pt-4 border-t border-white/5 mt-4">
            <button onClick={() => { setShowDeleteModal(false); setDeleteError(""); }} className="flex-1 px-4 py-3 bg-zinc-800 text-white rounded-lg text-sm font-medium hover:bg-zinc-700 transition">
              Cancel
            </button>
            <button 
              onClick={handleDeleteAccount}
              disabled={deleteInput !== "DELETE" || deleteLoading}
              className="flex-1 px-4 py-3 bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
            >
              {deleteLoading ? <Loader2 size={16} className="animate-spin" /> : "Delete Forever"}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
