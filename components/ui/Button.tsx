import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    
    const variants = {
      primary: "bg-gradient-to-b from-[#0A0A0A] to-[#121212] backdrop-blur-md text-[#D4AF37] hover:bg-[#D4AF37]/10 border border-[#D4AF37]/50 shadow-[0_0_10px_rgba(201,166,70,0.1)] hover:border-[#D4AF37]",
      secondary: "bg-zinc-800 text-[#EAEAEA] hover:bg-zinc-700 border border-zinc-700",
      danger: "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-[#EAEAEA] border border-red-500/20",
      ghost: "bg-transparent text-[#A0A0A0] hover:text-[#EAEAEA] hover:bg-zinc-800",
      outline: "bg-transparent border border-zinc-800 text-[#EAEAEA] hover:text-[#EAEAEA] hover:border-zinc-700"
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs rounded-lg",
      md: "px-5 py-2.5 text-sm rounded-2xl",
      lg: "px-8 py-4 text-base rounded-2xl"
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "font-bold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
