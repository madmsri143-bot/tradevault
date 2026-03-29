"use client";
import Image from "next/image";

export default function JBLogo({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <Image 
        src="/logo.png" 
        alt="JournalBud Logo" 
        width={size} 
        height={size} 
        className="object-contain"
        priority
      />
    </div>
  );
}
