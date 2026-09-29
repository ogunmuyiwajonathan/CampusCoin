import { useEffect, useMemo, useState } from "react";
import { ThemeContext } from "./themeContext.js";

const STORAGE_KEY = "campuscoin.theme";
const FONT_SIZE_KEY = "campuscoin.fontSize";

// Root font sizes as percentages of the browser default, so every rem-based
// size in the app scales together and the reader's own browser setting still
// counts on top of it.
const FONT_SIZES = {
  normal: "100%",
  large: "112.5%",
  xlarge: "125%",
};

function readTheme() {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readFontSize() {
  const saved = window.localStorage.getItem(FONT_SIZE_KEY);
  return saved && Object.hasOwn(FONT_SIZES, saved) ? saved : "normal";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const initial = readTheme();
    document.documentElement.classList.toggle("dark", initial === "dark");
    return initial;
  });

  const [fontSize, setFontSize] = useState(() => {
    const initial = readFontSize();
    document.documentElement.style.fontSize = FONT_SIZES[initial];
    return initial;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SIZES[fontSize];
    window.localStorage.setItem(FONT_SIZE_KEY, fontSize);
  }, [fontSize]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggle: () => setTheme((current) => (current === "dark" ? "light" : "dark")),
      fontSize,
      setFontSize,
      fontSizes: Object.keys(FONT_SIZES),
    }),
    [theme, fontSize],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
