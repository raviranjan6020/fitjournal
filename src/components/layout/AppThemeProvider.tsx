"use client";

import { createContext, useContext, useEffect, useState } from "react";

export const THEMES = [
  { id: "theme-lime",   label: "Lime",   color: "#a3e635" },
  { id: "theme-blue",   label: "Blue",   color: "#3b82f6" },
  { id: "theme-purple", label: "Purple", color: "#a78bfa" },
  { id: "theme-orange", label: "Orange", color: "#fb923c" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export type Mode = "dark" | "light";

interface ThemeContextValue {
  theme: ThemeId;
  mode: Mode;
  setTheme: (t: ThemeId) => void;
  setMode:  (m: Mode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "theme-lime", mode: "dark",
  setTheme: () => {}, setMode: () => {},
});

export function useAppTheme() { return useContext(ThemeContext); }

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("theme-lime");
  const [mode,  setModeState]  = useState<Mode>("dark");
  const [mounted, setMounted]  = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("fj-theme") as ThemeId | null;
    const savedMode  = localStorage.getItem("fj-mode") as Mode | null;
    if (savedTheme && THEMES.some(t => t.id === savedTheme)) setThemeState(savedTheme);
    if (savedMode === "light" || savedMode === "dark") setModeState(savedMode);
    setMounted(true);
  }, []);

  // Apply to <html>
  useEffect(() => {
    if (!mounted) return;
    const html = document.documentElement;
    // Remove old theme classes
    THEMES.forEach(t => html.classList.remove(t.id));
    html.classList.remove("light", "dark");
    // Apply current
    html.classList.add(theme);
    html.classList.add(mode);
  }, [theme, mode, mounted]);

  function setTheme(t: ThemeId) {
    setThemeState(t);
    localStorage.setItem("fj-theme", t);
  }

  function setMode(m: Mode) {
    setModeState(m);
    localStorage.setItem("fj-mode", m);
  }

  // Prevent flash of wrong theme
  if (!mounted) return <>{children}</>;

  return (
    <ThemeContext.Provider value={{ theme, mode, setTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
