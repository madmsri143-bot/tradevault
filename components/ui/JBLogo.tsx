"use client";
import Image from "next/image";

export default function JBLogo({
  size = 48,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Subtle gold glow using drop-shadow behind the logo block */}
      <div 
        className="absolute inset-0 rounded-2xl"
        style={{
          boxShadow: '0 0 25px rgba(212, 175, 55, 0.4)',
          zIndex: 0
        }}
      />
      {/* The actual image retains its own black box and proportions */}
      <Image 
        src="/logo.png" 
        alt="JournalBud Logo" 
        width={size} 
        height={size} 
        className="relative z-10 rounded-2xl object-contain drop-shadow-[0_0_15px_rgba(212,175,55,0.2)]"
        priority
      />
    </div>
  );
}
