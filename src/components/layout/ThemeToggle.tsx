"use client";

import { useAppTheme } from "./AppThemeProvider";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { mode, setMode } = useAppTheme();

  return (
    <button
      onClick={() => setMode(mode === "dark" ? "light" : "dark")}
      aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="size-9 rounded-xl bg-surface border border-border grid place-items-center text-muted-foreground hover:text-foreground transition-colors"
    >
      {mode === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
