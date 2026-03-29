"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { User, Check, X, Loader2, Camera } from "lucide-react";
import { updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";

export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newName, setNewName] = useState("");
  const [newPhotoUrl, setNewPhotoUrl] = useState("");

  useEffect(() => {
    if (user && !isEditing) {
      setNewName(user.displayName || "");
      setNewPhotoUrl(user.photoURL || "");
    }
  }, [user, isEditing]);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setIsSaving(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: newName,
        photoURL: newPhotoUrl
      });
      
      await setDoc(doc(db, "users", auth.currentUser.uid, "settings", "profile"), {
        name: newName,
        photoUrl: newPhotoUrl,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setIsEditing(false);
    } catch (err) {
      console.error("Profile update failed:", err);
      alert("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !auth.currentUser) return;
    const file = e.target.files[0];
    
    // Validate image format
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file.");
      return;
    }

    setIsSaving(true);
    const storageRef = ref(storage, `users/${auth.currentUser.uid}/avatar`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {},
      (error) => {
        console.error("Upload failed", error);
        alert("Upload failed. Please try again.");
        setIsSaving(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setNewPhotoUrl(downloadURL);
        setIsSaving(false);
      }
    );
  };

  const currentDisplayPhoto = isEditing ? newPhotoUrl : user?.photoURL;
  const currentDisplayName = isEditing ? newName : (user?.displayName || "Trader");

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
               <div className="relative group">
                 <div className="w-24 h-24 rounded-[2rem] bg-zinc-800 border-2 border-white/10 flex items-center justify-center text-4xl font-black text-white uppercase shadow-inner overflow-hidden">
                   {currentDisplayPhoto ? (
                     // eslint-disable-next-line @next/next/no-img-element
                     <img src={currentDisplayPhoto} alt="Profile" className="w-full h-full object-cover" />
                   ) : (
                     user?.email?.[0] || "?"
                   )}
                 </div>
                 
                 {isEditing && (
                   <label className="absolute inset-0 bg-black/50 hover:bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white rounded-[2rem] cursor-pointer transition-colors border border-white/10 group-hover:border-emerald-500/50">
                     <Camera size={24} className="mb-1" />
                     <span className="text-[10px] font-bold uppercase tracking-wider">Change</span>
                     <input 
                       type="file" 
                       accept="image/*" 
                       className="hidden" 
                       onChange={handleImageUpload}
                       disabled={isSaving}
                     />
                   </label>
                 )}
               </div>
               <div>
                 <p className="text-2xl font-black text-white mb-1 tracking-tight">{currentDisplayName}</p>
                 <p className="text-zinc-500 font-medium">{user?.email}</p>
                 <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold uppercase tracking-widest">
                   Verified
                 </div>
               </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
               <div>
                 <label className="block text-xs uppercase font-bold text-zinc-500 mb-2">Display Name</label>
                 <input 
                   type="text" 
                   value={isEditing ? newName : (user?.displayName || "Trader")}
                   onChange={(e) => setNewName(e.target.value)}
                   readOnly={!isEditing} 
                   className={`w-full bg-zinc-950 border rounded-xl p-3.5 text-sm transition-colors focus:outline-none ${isEditing ? 'border-zinc-700 text-white focus:border-[#D4AF37]' : 'border-zinc-800 text-zinc-400 cursor-not-allowed'}`}
                 />
               </div>
               <div>
                 <label className="block text-xs uppercase font-bold text-zinc-500 mb-2">Email Address</label>
                 <input 
                   type="text" 
                   readOnly 
                   value={user?.email || "Unknown"} 
                   className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-sm text-zinc-500 cursor-not-allowed focus:outline-none transition-colors opacity-70" 
                 />
                 <p className="text-[10px] text-zinc-600 mt-1.5">* Email cannot be changed directly for security reasons.</p>
               </div>
            </div>
            
            <div className="flex justify-start pt-4 mt-2 border-t border-white/5">
               {isEditing ? (
                 <div className="flex items-center gap-3">
                   <button 
                     onClick={handleSave} 
                     disabled={isSaving}
                     className="px-6 py-2.5 bg-[#D4AF37] hover:bg-[#00e09d] text-zinc-950 text-sm font-bold rounded-xl transition-all shadow hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
                   >
                     {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                     Save Changes
                   </button>
                   <button 
                     onClick={() => setIsEditing(false)} 
                     disabled={isSaving}
                     className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-xl transition-all border border-white/5 flex items-center gap-2 disabled:opacity-50"
                   >
                     <X size={16} /> Cancel
                   </button>
                 </div>
               ) : (
                 <button 
                   onClick={() => setIsEditing(true)} 
                   className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-xl transition-all border border-white/5 shadow hover:shadow-lg"
                 >
                   Edit Profile Details
                 </button>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
