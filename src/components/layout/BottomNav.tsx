"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Home, Dumbbell, TrendingUp, FileText, Plus, X, ClipboardList } from "lucide-react";

const items = [
  { to: "/dashboard",  label: "Home",     icon: Home,       exact: true  },
  { to: "/workouts",   label: "Workouts", icon: Dumbbell,   exact: false },
  { to: "/progress",   label: "Progress", icon: TrendingUp, exact: false },
  { to: "/reports",    label: "Reports",  icon: FileText,   exact: false },
];

export function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname.startsWith(to);

  return (
    <>
      {/* FAB backdrop + actions */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
            <Link href="/workouts/new" onClick={() => setOpen(false)}
              className="flex items-center gap-3 bg-surface text-foreground pl-4 pr-5 py-3 rounded-2xl shadow-xl border border-border font-semibold text-sm">
              <Dumbbell className="size-4 text-primary" /> Log Workout
            </Link>
            <Link href="/checkin" onClick={() => setOpen(false)}
              className="flex items-center gap-3 bg-surface text-foreground pl-4 pr-5 py-3 rounded-2xl shadow-xl border border-border font-semibold text-sm">
              <ClipboardList className="size-4 text-primary" /> Daily Check-in
            </Link>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface/85 backdrop-blur-md border-t border-border" aria-label="Primary">
        <div className="max-w-md mx-auto flex justify-between items-center px-4 h-16" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {items.slice(0, 2).map(item => (
            <NavBtn key={item.to} {...item} active={isActive(item.to, item.exact)} />
          ))}

          {/* Centre FAB */}
          <div className="relative flex-1 flex justify-center">
            <button
              onClick={() => setOpen(o => !o)}
              aria-label={open ? "Close" : "Log"}
              className="absolute -top-7 size-14 rounded-full bg-primary text-primary-foreground shadow-lg border-4 border-background flex items-center justify-center active:scale-90 transition-transform">
              {open ? <X className="size-6" /> : <Plus className="size-6" />}
            </button>
          </div>

          {items.slice(2).map(item => (
            <NavBtn key={item.to} {...item} active={isActive(item.to, item.exact)} />
          ))}
        </div>
      </nav>
    </>
  );
}

function NavBtn({ to, label, icon: Icon, active }: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; active: boolean }) {
  return (
    <Link href={to} className={`flex flex-col items-center gap-1 flex-1 py-2 min-h-11 min-w-11 ${active ? "text-primary" : "text-muted-foreground"}`}>
      <Icon className="size-5" aria-hidden />
      <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
    </Link>
  );
}
