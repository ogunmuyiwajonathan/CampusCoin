import { useState } from "react";
import { Link } from "react-router-dom";
import Breadcrumbs from "./Breadcrumbs.jsx";
import Icon from "./Icon.jsx";
import NotificationBell from "./NotificationBell.jsx";
import SearchBox from "./SearchBox.jsx";
import UserAvatar from "./UserAvatar.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { STUDENT_TARGETS } from "../lib/searchTargets.js";

export default function PageHeader({ onMenu }) {
  const { user } = useAuth();
  const [mobileSearch, setMobileSearch] = useState(false);
  const userName = user?.name?.trim();
  const displayName = userName ?? "";
  const greeting = userName ? `Hi, ${userName}!` : "Hi there!";

  // On a phone the dropdown has nowhere to sit, so the search becomes a
  // full-width screen of its own with a Back button to leave it.
  if (mobileSearch) {
    return (
      <SearchBox
        scope="student"
        targets={STUDENT_TARGETS}
        variant="page"
        autoFocus
        label="Search your account"
        onClose={() => setMobileSearch(false)}
      />
    );
  }

  return (
    <header>
      <div className="flex items-center gap-3">
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

        {/* The inline box is hidden until there is room for a dropdown. */}
        <div className="hidden flex-1 sm:block">
          <SearchBox scope="student" targets={STUDENT_TARGETS} label="Search your account" />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            className="rounded-lg p-2 transition hover:bg-surface sm:hidden"
            onClick={() => setMobileSearch(true)}
            aria-label="Open search"
          >
            <Icon name="search" size={19} />
          </button>
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
      </div>
      <Breadcrumbs className="mt-1.5" />
    </header>
  );
}