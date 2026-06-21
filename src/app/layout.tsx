import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FitJournal — Track. Improve. Transform.",
  description: "Track workouts, weight, and weekly progress. Get coaching insights that turn logged data into real gains.",
  manifest: "/manifest.webmanifest",
  themeColor: "#0066FF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
