import { Link, useLocation } from "react-router-dom";
import Icon from "./Icon.jsx";
import { isNavActive } from "../lib/navRoutes.js";

const TABS = [
  { to: "/dashboard", label: "Home", icon: "house", end: true },
  { to: "/transactions", label: "Transactions", icon: "arrow-left-right" },
  { to: "/budgets", label: "Budgets", icon: "target" },
  { to: "/insights", label: "Insights", icon: "chart-column" },
  { to: "/more", label: "More", icon: "ellipsis" },
];

export default function MobileNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80 md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => {
          const active = isNavActive(pathname, tab);
          return (
            <li key={tab.to} className="flex-1">
              <Link
                to={tab.to}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  active ? "text-brand-600" : "text-ink-500 hover:text-ink-900"
                }`}
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition ${
                    active ? "bg-emerald-100" : ""
                  }`}
                >
                  <Icon name={tab.icon} size={18} />
                </span>
                <span className="w-full truncate text-center">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
