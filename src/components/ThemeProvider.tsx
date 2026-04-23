"use client";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    // Read initial theme from localStorage or system preference
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored === "dark" || stored === "light") {
      setThemeState(stored);
      document.documentElement.setAttribute("data-theme", stored);
    } else {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initial: Theme = systemDark ? "dark" : "light";
      setThemeState(initial);
      document.documentElement.setAttribute("data-theme", initial);
    }
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
