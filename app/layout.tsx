import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { BottomNav } from "@/app/components/bottom-nav";
import "./globals.css";

// Sætter "dark"-klassen på <html>, før siden overhovedet males (derfor
// strategy="beforeInteractive", som Next.js injicerer i selve den
// indledende HTML). Uden det ville en bruger med mørkt tema kort se den
// lyse udgave blinke, før React når at overtage. Gemt valg i localStorage
// vinder, ellers følges telefonens/browserens systemindstilling.
const themeInitScript = `(function(){var t;try{t=localStorage.getItem("zet-theme");}catch(e){}if(!["light","dark","warm","electric","blush"].includes(t))t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t;document.documentElement.classList.toggle("dark",t==="dark"||t==="electric");})();`;

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
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <main className="flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))]">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
