import React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn("bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] rounded-2xl shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)] overflow-hidden", className)} 
      {...props} 
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 py-5 border-b border-zinc-200 dark:border-[#111827] bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md flex flex-col space-y-1.5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold tracking-tight text-zinc-900 dark:text-[#EAEAEA]", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-zinc-600 dark:text-[#A0A0A0]", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 py-4 border-t border-zinc-200 dark:border-[#111827] bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md flex items-center", className)} {...props} />;
}
