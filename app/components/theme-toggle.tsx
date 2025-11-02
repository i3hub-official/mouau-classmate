"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // useEffect only runs on the client, so now we can safely show the UI
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading state while mounting
  if (!mounted) {
    return (
      <button
        className="p-2.5 rounded-lg bg-card border border-border hover:bg-muted transition-all duration-300"
        aria-label="Toggle theme"
      >
        <div className="h-5 w-5" />
      </button>
    );
  }

  // Determine current theme (handles 'system' theme)
  const currentTheme = theme === "system" ? systemTheme : theme;

  return (
    <button
      onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
      className="p-2.5 rounded-lg bg-card border border-border hover:bg-muted hover:shadow-lg transition-all duration-300 group"
      aria-label="Toggle theme"
    >
      {currentTheme === "dark" ? (
        <Sun className="h-5 w-5 text-yellow group-hover:rotate-90 transition-transform duration-300" />
      ) : (
        <Moon className="h-5 w-5 text-navy group-hover:-rotate-12 transition-transform duration-300" />
      )}
    </button>
  );
}
