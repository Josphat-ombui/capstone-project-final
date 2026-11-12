import { useEffect, useState } from "react";

export type ThemeName = "light" | "dark";
const storageKey = "bqd-theme";

/** Reads the saved theme. Storage can be blocked, so every access is guarded. */
function readSavedTheme(): ThemeName | null {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved === "light" || saved === "dark" ? saved : null;
  } catch {
    return null;
  }
}

/** Keeps the page theme in sync with the operating system and the user's choice. */
export function useTheme(): [ThemeName, () => void] {
  const [theme, setTheme] = useState<ThemeName>(() => {
    if (readSavedTheme()) return readSavedTheme() as ThemeName;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(storageKey, theme);
    } catch {
      /* Saving the choice is a convenience; the theme still applies without it. */
    }
  }, [theme]);

  const toggle = () => setTheme((current) => (current === "light" ? "dark" : "light"));
  return [theme, toggle];
}
