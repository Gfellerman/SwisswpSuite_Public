/**
 * Authored by: Frontend Specialist (fix: TDZ chunk collision)
 * Skills: frontend-design, tailwind-patterns, react-patterns
 * Date: 2026-02-19 — fix: removed atoms/Button import (caused TDZ in ui chunk)
 *
 * ThemeToggle Component
 * Allows users to switch between light and dark modes.
 * Persists preference to localStorage and applies to document root.
 */

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

const STORAGE_KEY = "swisswpsuite-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
      applyTheme(saved);
    } else {
      applyTheme("light");
    }
  }, []);

  function applyTheme(newTheme: Theme) {
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  function toggleTheme() {
    const newTheme: Theme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      className="hover:bg-secondary dark:hover:bg-card/10 hover:text-neutral-900foreground dark:hover:text-foreground flex h-11 w-11 items-center justify-center rounded-full text-neutral-700 transition-colors duration-200 dark:bg-transparent"
    >
      {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
}
