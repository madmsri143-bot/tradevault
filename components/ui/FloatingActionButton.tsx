"use client";

import { Plus } from "lucide-react";

interface FloatingActionButtonProps {
  onClick: () => void;
  tooltip?: string;
  className?: string;
}

export default function FloatingActionButton({ 
  onClick, 
  tooltip = "Add",
  className = "" 
}: FloatingActionButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={`bg-[#D4AF37] hover:bg-[#F3D060] text-black w-14 h-14 rounded-full shadow-[0_4px_20px_rgba(212,175,55,0.3)] hover:shadow-[0_4px_30px_rgba(212,175,55,0.5)] active:scale-90 hover:scale-[1.05] hover:-translate-y-1 transition-all group flex items-center justify-center relative z-20 border border-black/10 ${className}`}
    >
      <Plus size={28} strokeWidth={3} className="transition-transform group-hover:rotate-90 duration-300" />
      <span className="absolute left-full ml-4 luxury-card text-zinc-900 dark:text-[#EAEAEA] text-sm font-bold px-4 py-2 rounded-2xl opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all whitespace-nowrap pointer-events-none shadow-xl">
        {tooltip}
      </span>
    </button>
  );
}
