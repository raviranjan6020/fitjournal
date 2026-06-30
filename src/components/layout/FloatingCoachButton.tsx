"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";

/** Floating coach button — visible on all pages except /coach itself and /workouts/new */
export function FloatingCoachButton() {
  const pathname = usePathname();

  // Hide on coach page (already there) and workout logger (full-screen flow)
  if (pathname === "/coach" || pathname === "/workouts/new" || pathname.startsWith("/login") || pathname.startsWith("/onboarding")) {
    return null;
  }

  return (
    <Link
      href="/coach"
      aria-label="Ask Coach"
      className="fixed bottom-20 right-4 z-40 size-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 grid place-items-center active:scale-90 transition-transform hover:shadow-xl"
    >
      <MessageSquare className="size-5" />
    </Link>
  );
}
