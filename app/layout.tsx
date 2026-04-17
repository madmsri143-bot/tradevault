import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import AuthWrapper from "@/components/AuthWrapper";
import { AuthProvider } from "@/lib/AuthContext";
import { ModalProvider } from "@/lib/ModalContext";
import { ThemeProvider } from "@/lib/ThemeContext";

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
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <link rel="icon" type="image/png" href="/logo_cropped.png?v=2" />
        <script dangerouslySetInnerHTML={{
          __html: `
            try {
              if (localStorage.getItem('theme') === 'light' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: light)').matches)) {
                document.documentElement.classList.add('light');
                document.documentElement.classList.remove('dark');
              } else {
                document.documentElement.classList.add('dark');
                document.documentElement.classList.remove('light');
              }
            } catch (e) {}
          `
        }} />
      </head>
      <body className={`${inter.className} ${outfit.variable} dark:bg-black bg-zinc-50 dark:text-zinc-50 text-zinc-900 min-h-screen selection:bg-[rgba(212,175,55,0.3)]`}>
        <ThemeProvider>
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
        </ThemeProvider>
      </body>
    </html>
  );
}
