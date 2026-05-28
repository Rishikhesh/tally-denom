import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";

const THEME_KEY = "tally:theme";

function readStored(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const v = localStorage.getItem(THEME_KEY);
  return v === "light" || v === "dark" ? v : "light";
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(readStored);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    localStorage.setItem(THEME_KEY, t);
  }, []);

  const toggleTheme = useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [theme, setTheme],
  );

  return { theme, setTheme, toggleTheme };
}
