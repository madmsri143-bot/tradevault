"use client";

import { useAuth } from "@/lib/AuthContext";
import { Settings as SettingsIcon, Shield, Palette, Smartphone, LogOut, Info, ExternalLink, Moon } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

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
                   <button className="px-4 py-1.5 text-xs font-bold rounded-lg bg-zinc-800 text-white shadow-sm ring-1 ring-white/10">Dark</button>
                   <button className="px-4 py-1.5 text-xs font-bold rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors">Light</button>
                 </div>
              </div>

              <div className="flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors">
                 <div className="flex items-center gap-4">
                   <div className="p-2.5 bg-zinc-950 rounded-xl border border-white/5 shadow-inner hidden sm:block"><Smartphone size={20} className="text-zinc-400" /></div>
                   <div>
                     <p className="font-bold text-white text-sm">Dashboard Layout</p>
                     <p className="text-zinc-500 text-xs mt-0.5">Choose your preferred default grid orientation.</p>
                   </div>
                 </div>
                 <select className="bg-zinc-950 border border-zinc-800 text-zinc-300 font-medium rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/20 transition-colors cursor-pointer">
                   <option>Standard Form Left</option>
                   <option>Legacy Form Bottom</option>
                 </select>
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
                       <p className="text-sm font-bold text-white">Email & Password</p>
                       <p className="text-xs text-zinc-500 mt-0.5">Primary authentication method active.</p>
                     </div>
                   </div>
                   <button className="px-5 py-2.5 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg border border-white/5 transition-colors shadow-sm">Change Password</button>
                 </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                 <p className="text-sm font-bold text-white mb-4">Device Sessions</p>
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                   <p className="text-xs text-zinc-400 max-w-md leading-relaxed">Log out of all active sessions across all devices. Use this if you believe your account has been compromised or you accessed TradeVault from a public terminal.</p>
                   <button onClick={handleLogout} className="shrink-0 px-4 py-2.5 text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg flex items-center gap-2 transition-colors shadow">
                     <LogOut size={14} /> Log Out All Devices
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
                   <p className="text-base font-black text-white tracking-tight">TradeVault Version</p>
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
