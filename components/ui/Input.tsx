import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, id, ...props }, ref) => {
    const inputId = id || `input-${label.replace(/\s+/g, '-').toLowerCase()}`;

    return (
      <div className="relative group w-full">
        <input
          id={inputId}
          ref={ref}
          placeholder=" "
          className={cn(
            "peer w-full bg-[#1F2937]/50 border rounded-xl px-4 pt-6 pb-2 text-sm text-[#E5E7EB] focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-transparent",
            error 
              ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20" 
              : "border-[#111827] focus:border-emerald-500 focus:bg-[#1F2937]",
            className
          )}
          {...props}
        />
        <label
          htmlFor={inputId}
          className="absolute left-4 top-4 text-xs font-bold uppercase tracking-widest text-[#9CA3AF] transition-all duration-200 peer-focus:-translate-y-2.5 peer-focus:text-[10px] peer-focus:text-emerald-500 peer-[:not(:placeholder-shown)]:-translate-y-2.5 peer-[:not(:placeholder-shown)]:text-[10px] pointer-events-none"
        >
          {label}
        </label>
        {error && <p className="text-[10px] text-red-500 font-bold pl-4 mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
