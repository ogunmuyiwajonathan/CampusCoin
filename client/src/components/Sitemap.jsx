import { Link } from "react-router-dom";

// The whole sitemap in one place: every entry is a real <Route> in App.jsx, in
// the order a visitor actually meets it. Add a route there, add it here — a
// link that is not routed would send people straight to the 404 page.
const SITEMAP_GROUPS = [
  {
    id: "public",
    title: "Public",
    note: "Open to everyone",
    hint: "Home → Sign up → Login → Forgot password → Reset password",
    links: [
      { label: "Home", to: "/" },
      { label: "Login", to: "/login" },
      { label: "Sign up", to: "/signup" },
      { label: "Forgot password", to: "/forgot-password" },
      { label: "Reset password", to: "/reset-password" },
    ],
  },
  {
    id: "student",
    title: "Student",
    note: "Sign in required",
    hint: "Register → Login → Dashboard → Transactions → Budgets → Insights → Assistant → More → Settings",
    links: [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Transactions", to: "/transactions" },
      { label: "Budgets", to: "/budgets" },
      { label: "Insights", to: "/insights" },
      { label: "Assistant", to: "/assistant" },
      { label: "Settings", to: "/settings" },
      { label: "Reports", to: "/reports" },
      { label: "Bookmarks", to: "/bookmarks" },
      { label: "Notifications", to: "/notifications" },
      { label: "More", to: "/more" },
    ],
  },
  {
    id: "admin",
    title: "Admin",
    note: "Sign in required",
    hint: "Admin login → Dashboard → Users → Categories → Tips → Announcements",
    links: [
      { label: "Admin login", to: "/admin/login" },
      { label: "Dashboard", to: "/admin" },
      { label: "Users", to: "/admin/users" },
      { label: "Categories", to: "/admin/categories" },
      { label: "Tips", to: "/admin/tips" },
      { label: "Announcements", to: "/admin/announcements" },
    ],
  },
];

export default function Sitemap() {
  return (
    <nav aria-label="Sitemap">
      <div className="text-center">
        <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          Sitemap
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-ink-500">
          Every page in Campus Coin, grouped by who can open it.
        </p>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SITEMAP_GROUPS.map((group) => (
          <section
            key={group.id}
            aria-labelledby={`sitemap-${group.id}`}
            className="flex flex-col rounded-card border border-slate-200 bg-surface p-5 shadow-card"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-4 w-1.5 rounded-full bg-brand-600" aria-hidden="true" />
                <h3
                  id={`sitemap-${group.id}`}
                  className="font-display text-base font-bold text-ink-900"
                >
                  {group.title}
                </h3>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-500">
                {group.note}
              </span>
            </div>
            <ul className="mt-3 flex-1 space-y-1">
              {group.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="block rounded-lg px-2 py-1.5 text-sm font-semibold text-ink-900 transition hover:bg-slate-50 hover:text-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-slate-200 pt-3 text-xs leading-relaxed text-ink-500">
              {group.hint}
            </p>
          </section>
        ))}
      </div>
    </nav>
  );
}
