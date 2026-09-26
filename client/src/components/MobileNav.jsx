import { NavLink } from "react-router-dom";
import Icon from "./Icon.jsx";

// Bottom tab bar for phones only (below md) — tablets and up fall back to the
// sidebar. AI Assistant is not a tab here; it gets its own FAB (AssistantFab).
const TABS = [
  { to: "/dashboard", label: "Home", icon: "house", end: true },
  { to: "/transactions", label: "Transactions", icon: "arrow-left-right" },
  { to: "/budgets", label: "Budgets", icon: "target" },
  { to: "/insights", label: "Insights", icon: "chart-column" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

export default function MobileNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80 md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex min-w-0 flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-semibold transition ${
                  isActive ? "text-brand-600" : "text-ink-500 hover:text-ink-900"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-7 w-12 items-center justify-center rounded-full transition ${
                      isActive ? "bg-emerald-100" : ""
                    }`}
                  >
                    <Icon name={tab.icon} size={18} />
                  </span>
                  <span className="w-full truncate text-center">{tab.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
