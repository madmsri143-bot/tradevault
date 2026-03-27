import { useState, useRef, useEffect } from "react";
import { User, LogOut, Settings as SettingsIcon, CreditCard, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useTrial } from "@/components/TrialGuard";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useModal } from "@/lib/ModalContext";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface UserProfile {
  name: string;
  photoUrl: string;
}

export default function Topbar() {
  const { user } = useAuth();
  const { planName, plan } = useTrial();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { confirm } = useModal();
  const [profile, setProfile] = useState<UserProfile>({ name: "", photoUrl: "" });

  const isExpired = plan === "free"; // free means standard/expired trial conceptually, or active if pro
  const isActive = plan !== "free";
  const isTrial = plan === "trial";

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid, "settings", "profile"), (d) => {
      if (d.exists()) {
        const data = d.data() as UserProfile;
        setProfile({ name: data.name || user.displayName || "Trader", photoUrl: data.photoUrl || "" });
      } else {
        setProfile({ name: user.displayName || "Trader", photoUrl: "" });
      }
    });
    return () => unsub();
  }, [user]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    const isConfirmed = await confirm({
      title: "Confirm Logout",
      message: "Are you sure you want to log out of your session?",
      confirmLabel: "Logout",
      cancelLabel: "Cancel",
      variant: "danger"
    });
    
    if (isConfirmed) {
      await signOut(auth);
      router.push("/login");
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="w-full h-16 shrink-0 bg-transparent flex items-center justify-between px-4 md:px-8 relative z-50">
      {/* Brand Logo - Left Aligned */}
      <h1 
        onClick={() => window.location.reload()}
        className="text-2xl md:text-3xl font-brand tracking-tight cursor-pointer hover:drop-shadow-[0_0_8px_rgba(0,255,178,0.4)] transition-all select-none flex items-center"
      >
        <span className="text-[#00FFB2] font-black">T</span>
        <span className="text-zinc-950 dark:text-white font-bold">rade</span>
        <span className="text-[#00FFB2] font-black">V</span>
        <span className="text-zinc-950 dark:text-white font-bold">ault</span>
      </h1>

      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 p-1.5 pr-3 rounded-full hover:bg-white/5 transition-all group cursor-pointer border border-transparent hover:border-white/10"
        >
          {/* Avatar Area */}
          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
            {profile.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-zinc-300">{getInitials(profile.name)}</span>
            )}
          </div>
          
          {/* User Info Area */}
          <div className="hidden sm:flex flex-col items-start mr-1">
            <span className="text-sm font-bold text-white leading-tight">{profile.name}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] font-semibold text-zinc-400 capitalize">{planName}</span>
              {isActive && (
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full",
                  "bg-emerald-500/10 text-emerald-400"
                )}>
                  Active
                </span>
              )}
            </div>
          </div>

          <ChevronDown size={16} className={cn("text-zinc-500 transition-transform duration-300", isOpen && "rotate-180")} />
        </button>

        {/* Dropdown Menu */}
        <div className={cn(
          "absolute right-0 top-[calc(100%+8px)] w-56 bg-zinc-900 border border-white/10 shadow-2xl rounded-2xl overflow-hidden transition-all duration-200 transform origin-top-right z-50",
          isOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"
        )}>
          <div className="p-2 space-y-1">
            <Link onClick={() => setIsOpen(false)} href="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors group">
              <User size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
              Profile
            </Link>
            <Link onClick={() => setIsOpen(false)} href="/billing" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors group">
              <CreditCard size={16} className="text-zinc-500 group-hover:text-emerald-400 transition-colors" />
              Billing
            </Link>
            <Link onClick={() => setIsOpen(false)} href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors group">
              <SettingsIcon size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
              Settings
            </Link>
            <div className="my-1 border-t border-white/10" />
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-300 hover:text-red-400 hover:bg-red-500/10 transition-colors group">
              <LogOut size={16} className="text-zinc-500 group-hover:text-red-400 transition-colors" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
