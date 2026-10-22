import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { AdminNavLink } from "@/app/components/admin-nav-link";
import { BottomNav } from "@/app/components/bottom-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zet",
  description: "Personlig workout-logging",
  // Får "Føj til hjemmeskærm" på iPhone/iPad til at åbne ZET i fuldskærm
  // (uden Safaris adresselinje), i stedet for bare at genveje til siden.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ZET",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="da"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <main className="flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))]">{children}</main>
        <BottomNav adminLink={<Suspense fallback={null}><AdminNavLink /></Suspense>} />
      </body>
    </html>
  );
}
