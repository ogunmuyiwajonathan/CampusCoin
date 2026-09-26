import { Link } from "react-router-dom";
import Icon from "./Icon.jsx";
import NotificationBell from "./NotificationBell.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { mockUser } from "../data/mockData.js";

export default function PageHeader({ onMenu }) {
  const { user } = useAuth();
  const userName = user?.name?.trim();
  const displayName = userName || mockUser.name;
  const greeting = userName ? `Hi, ${userName}!` : "Hi there!";

  return (
    <header className="flex items-center gap-3">
      <button
        type="button"
        className="rounded-lg p-2 hover:bg-surface lg:hidden"
        onClick={onMenu}
        aria-label="Open navigation menu"
      >
        <Icon name="menu" size={20} />
      </button>
      <div className="relative hidden flex-1 sm:block">
        <Icon
          name="search"
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500"
        />
        <input
          type="search"
          placeholder="Search anything..."
          aria-label="Search transactions"
          className="w-full max-w-md rounded-full bg-surface py-2.5 pl-10 pr-4 text-sm ring-1 ring-slate-200/70 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <NotificationBell />
        <Link
          to="/settings"
          aria-label="Open profile settings"
          className="flex items-center gap-2 rounded-lg p-1 transition hover:bg-surface"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-700 text-sm font-bold text-white">
            {displayName.charAt(0)}
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block max-w-[140px] truncate text-sm font-semibold text-ink-900">
              {greeting}
            </span>
            <span className="block max-w-[140px] truncate text-[11px] text-ink-500">Level 1</span>
          </span>
          <Icon name="chevron-down" size={15} className="text-ink-500" />
        </Link>
      </div>
    </header>
  );
}
