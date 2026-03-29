"use client";

export default function JBLogo({
  size = 24,
  className = "",
  color = "#D4AF37",
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 64 64" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="64" height="64" rx="16" fill="#11161D" />
      <rect width="64" height="64" rx="16" fill="none" stroke={color} strokeWidth="2" opacity="0.3" />
      <text 
        x="32" 
        y="42" 
        fontFamily="sans-serif" 
        fontWeight="900" 
        fontSize="28" 
        fill={color} 
        textAnchor="middle" 
        letterSpacing="-1"
      >
        JB
      </text>
      {/* Subtle indicator bar */}
      <path d="M 16 50 H 48" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <circle cx="48" cy="50" r="3" fill="#11161D" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}
