import { Link } from "react-router-dom";
import Icon from "./Icon.jsx";
import NotificationBell from "./NotificationBell.jsx";
import UserAvatar from "./UserAvatar.jsx";
import { useAuth } from "../hooks/useAuth.js";

export default function PageHeader({ onMenu }) {
  const { user } = useAuth();
  const userName = user?.name?.trim();
  const displayName = userName ?? "";
  const greeting = userName ? `Hi, ${userName}!` : "Hi there!";

  return (
    <header className="flex items-center gap-3">
      <button
        type="button"
        className="hidden rounded-lg p-2 hover:bg-surface md:inline-flex lg:hidden"
        onClick={onMenu}
        aria-label="Open navigation menu"
      >
        <Icon name="menu" size={20} />
      </button>
      <Link
        to="/"
        aria-label="Campus Coin home"
        className="flex items-center gap-1.5 md:hidden"
      >
        <img src="/logo.png" alt="" className="h-8 w-8 shrink-0 object-contain" />
        <span className="font-display text-lg font-bold tracking-wide text-forest-900 dark:text-sage-100">
          Campus Coin
        </span>
      </Link>
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
          <UserAvatar name={displayName} src={user?.profile_image_url} />
          <span className="hidden leading-tight sm:block">
            <span className="block max-w-[140px] truncate text-sm font-semibold text-ink-900">
              {greeting}
            </span>
          </span>
          <Icon name="chevron-down" size={15} className="text-ink-500" />
        </Link>
      </div>
    </header>
  );
}
