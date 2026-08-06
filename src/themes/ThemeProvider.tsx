import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_THEME, themes } from "./definitions";
import type { ThemeId } from "./types";

const STORAGE_KEY = "ts_theme_v2";

interface ThemeContextValue {
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeVars(id: ThemeId) {
  const root = document.documentElement;
  const vars = themes[id].vars;
  root.dataset.theme = id;
  Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", vars["--ts-bg"] ?? "#050505");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
      return saved && themes[saved] ? saved : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  const setThemeId = (id: ThemeId) => {
    setThemeIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  };

  const toggleTheme = () => setThemeId(themeId === "porsche" ? "ferrari" : "porsche");

  useEffect(() => {
    applyThemeVars(themeId);
  }, [themeId]);

  const value = useMemo(
    () => ({ themeId, setThemeId, toggleTheme }),
    [themeId]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export { themes };
