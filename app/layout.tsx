import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import AuthWrapper from "@/components/AuthWrapper";
import { AuthProvider } from "@/lib/AuthContext";
import { ModalProvider } from "@/lib/ModalContext";

const inter = Inter({ subsets: ["latin"] });
const outfit = Outfit({ subsets: ["latin"], weight: ["400", "700", "800", "900"], variable: "--font-outfit" });

import CookieBanner from "@/components/CookieBanner";
import SupportWidget from "@/components/SupportWidget";
import GlobalLoader from "@/components/ui/GlobalLoader";

export const metadata: Metadata = {
  title: "JournalBud — Your AI Trading Buddy",
  description: "JournalBud reads your trades, tracks your behavior, and helps you improve — automatically. The AI-powered trading journal that watches what you miss.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body className={`${inter.className} ${outfit.variable} bg-[#1F2937] text-zinc-50 min-h-screen selection:bg-emerald-500/30`}>
        <ModalProvider>
          <AuthProvider>
            <AuthWrapper>
              {children}
            </AuthWrapper>
            <CookieBanner />
            <SupportWidget />
            <GlobalLoader />
          </AuthProvider>
        </ModalProvider>
      </body>
      <Script id="theme-detect" strategy="beforeInteractive">{`
        try {
          if (localStorage.getItem('theme') === 'light' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: light)').matches)) {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
          } else {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
          }
        } catch (e) {}
      `}</Script>
    </html>
  );
}
