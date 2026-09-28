import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AssistantFab from "../../components/AssistantFab.jsx";
import Icon from "../../components/Icon.jsx";
import MobileNav from "../../components/MobileNav.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import Sidebar from "../../components/Sidebar.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { isNavActive } from "../../lib/navRoutes.js";

const LINKS = [
  {
    to: "/reports",
    label: "Reports",
    subtitle: "Statements you can download and share",
    icon: "file-chart",
  },
  {
    to: "/bookmarks",
    label: "Bookmarks",
    subtitle: "Months and insights you saved",
    icon: "bookmark",
  },
  {
    to: "/assistant",
    label: "AI Assistant",
    subtitle: "Ask about your spending",
    icon: "bot",
  },
  {
    to: "/notifications",
    label: "Notifications",
    subtitle: "Budget alerts and campus posts",
    icon: "bell",
  },
  {
    to: "/settings",
    label: "Settings",
    subtitle: "Profile, preferences and security",
    icon: "settings",
  },
];

export default function More() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className="min-h-svh">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <MobileNav />
      <AssistantFab />

      <div className="lg:pl-60">
        <main className="mx-auto max-w-2xl space-y-5 px-4 pb-24 pt-5 md:pb-5">
          <PageHeader onMenu={() => setSidebarOpen(true)} />

          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Icon name="ellipsis" size={22} />
            </span>
            <div>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-900">
                More
              </h1>
              <p className="mt-0.5 text-sm text-ink-500">
                Everything else — reports, saved months, alerts and preferences.
              </p>
            </div>
          </div>

          <section className="overflow-hidden rounded-card bg-surface shadow-card">
            <div className="flex items-center gap-2.5 border-b border-emerald-100 bg-linear-to-r from-emerald-100/80 via-emerald-50 to-surface px-5 py-3.5">
              <Icon name="menu" size={16} className="text-emerald-600" />
              <h2 className="font-display text-base font-bold text-ink-900">Jump to</h2>
              <span className="ml-auto text-xs font-semibold text-ink-500">
                {LINKS.length} places
              </span>
            </div>

            <ul className="divide-y divide-slate-100">
              {LINKS.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    aria-current={isNavActive(pathname, item) ? "page" : undefined}
                    className="flex w-full items-center gap-3.5 px-5 py-4 text-left transition hover:bg-slate-50"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Icon name={item.icon} size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink-900">{item.label}</span>
                      <span className="mt-0.5 block text-xs text-ink-500">{item.subtitle}</span>
                    </span>
                    <Icon name="chevron-right" size={16} className="shrink-0 text-ink-500" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="overflow-hidden rounded-card bg-surface shadow-card">
            <button
              type="button"
              onClick={() => logout()}
              className="flex w-full items-center gap-3.5 px-5 py-4 text-left transition hover:bg-red-50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
                <Icon name="log-out" size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink-900">Log out</span>
                <span className="mt-0.5 block text-xs text-ink-500">
                  Sign out of Campus Coin on this device
                </span>
              </span>
              <Icon name="chevron-right" size={16} className="shrink-0 text-ink-500" />
            </button>
          </section>
        </main>
      </div>
    </div>
  );
}
