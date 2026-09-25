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
      className={`rounded-lg p-2 text-ink-500 transition hover:bg-slate-50 hover:text-ink-900 ${className}`}
    >
      <Icon name={isDark ? "sun" : "moon"} size={18} />
    </button>
  );
}
