import Icon from "./Icon.jsx";
import { useTheme } from "../hooks/useTheme.js";

export default function ThemeToggle({ className = "" }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`flex h-11 w-11 items-center justify-center rounded-lg text-ink-500 transition hover:bg-slate-50 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 md:h-9 md:w-9 ${className}`}
    >
      <Icon name={isDark ? "sun" : "moon"} size={18} />
    </button>
  );
}
