import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppThemeProvider } from "@/components/layout/AppThemeProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FitJournal — Track. Improve. Transform.",
  description: "Track workouts, weight, and weekly progress.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="theme-lime dark" suppressHydrationWarning>
      <body className={inter.className}>
        <AppThemeProvider>{children}</AppThemeProvider>
      </body>
    </html>
  );
}
