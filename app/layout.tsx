import type { Metadata, Viewport } from "next";
import { Funnel_Display, Funnel_Sans } from "next/font/google";

import { AuthProvider } from "@/hooks/use-auth";

import "./globals.css";

const funnelDisplay = Funnel_Display({
  variable: "--font-funnel-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const funnelSans = Funnel_Sans({
  variable: "--font-funnel-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cocon",
  description: "L'organisation du cocon, à deux.",
  manifest: "/manifest.json",
  applicationName: "Cocon",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cocon",
  },
  icons: {
    // app/favicon.ico est servi automatiquement par Next.js — on déclare
    // simplement les icônes Apple/PWA additionnelles.
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    other: [
      { rel: "mask-icon", url: "/icons/logo-mark.png", color: "#FF6B24" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#100604",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`dark ${funnelDisplay.variable} ${funnelSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
