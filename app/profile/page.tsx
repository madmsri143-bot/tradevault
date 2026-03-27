"use client";

import { useAuth } from "@/lib/AuthContext";
import { User } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[800px] mx-auto pb-10 mt-6 lg:mt-10">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <User className="text-blue-500" /> My Profile
          </h2>
          <p className="text-sm text-zinc-400 mt-1">Manage your public information and avatar credentials.</p>
        </div>
      </div>

      {/* Section: Profile */}
      <div className="bg-zinc-900 border border-black/10 dark:border-white/5 fade-slide-up shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none rounded-2xl overflow-hidden shadow-sm">
         <div className="p-5 border-b border-white/5 bg-zinc-900/50 flex items-center gap-2">
            <User className="text-blue-500" size={18} />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Public Profile</h3>
         </div>
         <div className="p-6 md:p-10 space-y-6">
            <div className="flex items-center gap-6">
               <div className="w-24 h-24 rounded-[2rem] bg-zinc-800 border-2 border-white/10 flex items-center justify-center text-4xl font-black text-white uppercase shadow-inner">
                 {user?.email?.[0] || "?"}
               </div>
               <div>
                 <p className="text-2xl font-black text-white mb-1 tracking-tight">{user?.displayName || "Trader"}</p>
                 <p className="text-zinc-500 font-medium">{user?.email}</p>
                 <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#00FFB2]/10 text-[#00FFB2] text-xs font-bold uppercase tracking-widest">
                   Verified
                 </div>
               </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
               <div>
                 <label className="block text-xs uppercase font-bold text-zinc-500 mb-2">Display Name</label>
                 <input type="text" readOnly value={user?.displayName || "Trader"} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-sm text-zinc-400 cursor-not-allowed focus:outline-none focus:border-white/20 transition-colors" />
               </div>
               <div>
                 <label className="block text-xs uppercase font-bold text-zinc-500 mb-2">Email Address</label>
                 <input type="text" readOnly value={user?.email || "Unknown"} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-sm text-zinc-400 cursor-not-allowed focus:outline-none focus:border-white/20 transition-colors" />
               </div>
            </div>
            
            <div className="flex justify-start pt-4 mt-2 border-t border-white/5">
               <button className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-xl transition-all border border-white/5 shadow hover:shadow-lg">Edit Profile Details</button>
            </div>
         </div>
      </div>
    </div>
  );
}
