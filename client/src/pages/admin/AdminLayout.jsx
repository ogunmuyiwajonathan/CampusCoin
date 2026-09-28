import { Suspense, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import Icon from "../../components/Icon.jsx";
import UserAvatar from "../../components/UserAvatar.jsx";
import ThemeToggle from "../../components/ThemeToggle.jsx";
import { useAuth } from "../../hooks/useAuth.js";

const ADMIN_NAV = [
  { to: "/admin", label: "Dashboard", icon: "layout-dashboard", end: true },
  { to: "/admin/users", label: "Users", icon: "users" },
  { to: "/admin/categories", label: "Categories", icon: "tags" },
  { to: "/admin/tips", label: "Tips", icon: "lightbulb" },
  { to: "/admin/announcements", label: "Announcements", icon: "megaphone" },
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const currentNav = ADMIN_NAV.find((n) =>
    n.end ? location.pathname === n.to : location.pathname.startsWith(n.to),
  );

  const signOut = async () => {
    await logout();
    window.location.assign("/admin/login");
  };

  return (
    <div className="flex h-svh overflow-hidden">
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-forest-900 px-4 py-5 text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link
          to="/admin"
          onClick={() => setOpen(false)}
          className="mb-6 flex items-center gap-2 rounded-lg px-2 py-1 transition hover:opacity-90"
        >
          <Icon name="shield" size={24} className="text-brand-500" />
          <span className="font-display text-xl font-bold tracking-wide">Admin Panel</span>
        </Link>

        <nav className="min-h-0 flex-1 overflow-y-auto">
          <ul className="flex flex-col gap-1">
            {ADMIN_NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-forest-700 text-white"
                        : "text-sage-400 hover:bg-forest-800 hover:text-white"
                    }`
                  }
                >
                  <Icon name={item.icon} size={18} />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-4 flex shrink-0 flex-col gap-1 border-t border-forest-800 pt-4">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sage-400 transition hover:bg-forest-800 hover:text-white"
          >
            <Icon name="house" size={18} />
            Exit to App
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sage-400 transition hover:bg-forest-800 hover:text-white"
          >
            <Icon name="log-out" size={18} />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-sage-100 bg-surface px-4 lg:px-8">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open admin menu"
            className="rounded-lg p-2 text-ink-500 transition hover:bg-mint-50 lg:hidden"
          >
            <Icon name="menu" size={20} />
          </button>

          <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex items-center gap-1.5 text-sm">
              <li>
                <Link to="/admin" className="font-medium text-ink-500 transition hover:text-brand-600">
                  Admin
                </Link>
              </li>
              {currentNav && currentNav.to !== "/admin" && (
                <>
                  <li aria-hidden="true">
                    <Icon name="chevron-right" size={14} className="text-ink-500 opacity-60" />
                  </li>
                  <li>
                    <span aria-current="page" className="font-semibold text-ink-900">
                      {currentNav.label}
                    </span>
                  </li>
                </>
              )}
            </ol>
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            <ThemeToggle />
            <UserAvatar name={user?.name} src={user?.profile_image_url} className="h-9 w-9" textClassName="text-sm" />
            <span className="hidden max-w-[9rem] truncate text-sm font-semibold text-ink-900 sm:block">
              {user?.name}
            </span>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-mint-50/40 p-4 lg:p-8">
          <Suspense
            fallback={
              <div className="flex h-64 items-center justify-center">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
