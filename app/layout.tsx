import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthWrapper from "@/components/AuthWrapper";
import { AuthProvider } from "@/lib/AuthContext";
import { ModalProvider } from "@/lib/ModalContext";

const inter = Inter({ subsets: ["latin"] });

import CookieBanner from "@/components/CookieBanner";
import SupportWidget from "@/components/SupportWidget";

export const metadata: Metadata = {
  title: "Trading Journal Pro",
  description: "Advanced trading journal and analytics dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
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
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-zinc-950 text-zinc-50 min-h-screen selection:bg-emerald-500/30`}>
        <ModalProvider>
          <AuthProvider>
            <AuthWrapper>
              {children}
            </AuthWrapper>
            <CookieBanner />
            <SupportWidget />
          </AuthProvider>
        </ModalProvider>
      </body>
    </html>
  );
}
