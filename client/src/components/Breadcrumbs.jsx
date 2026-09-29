import { Link, useLocation } from "react-router-dom";
import Icon from "./Icon.jsx";

const LABELS = {
  "/assistant": "AI Assistant",
  "/bookmarks": "Bookmarks",
  "/budgets": "Budgets",
  "/dashboard": "Dashboard",
  "/insights": "Insights",
  "/more": "More",
  "/notifications": "Notifications",
  "/reports": "Reports",
  "/settings": "Settings",
  "/transactions": "Transactions",
};

// Home first, the current page last - the same shape the admin bar uses, so
// both halves of the app read the same way. An unknown path shows Home alone
// rather than inventing a label for itself.
export default function Breadcrumbs({ className = "" }) {
  const { pathname } = useLocation();
  const label = LABELS[pathname];
  const isHome = pathname === "/dashboard";

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-1.5 text-sm">
        <li>
          {isHome ? (
            <span aria-current="page" className="font-semibold text-ink-900">
              Home
            </span>
          ) : (
            <Link
              to="/dashboard"
              className="font-medium text-ink-500 transition hover:text-brand-600"
            >
              Home
            </Link>
          )}
        </li>
        {!isHome && label && (
          <>
            <li aria-hidden="true">
              <Icon name="chevron-right" size={14} className="text-ink-500 opacity-60" />
            </li>
            <li>
              <span aria-current="page" className="font-semibold text-ink-900">
                {label}
              </span>
            </li>
          </>
        )}
      </ol>
    </nav>
  );
}
