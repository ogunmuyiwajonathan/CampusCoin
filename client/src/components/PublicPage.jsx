import { Link } from "react-router-dom";
import Icon from "./Icon.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { CONTACT_EMAIL, LAST_UPDATED } from "../data/legal.js";

const PAGE_LINKS = [
  { to: "/faq", label: "FAQ" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms of Service" },
];

const linkClass =
  "rounded-lg text-sm font-semibold text-brand-600 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";

function Breadcrumb({ current }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 text-sm">
        <li>
          <Link to="/" className="font-medium text-ink-500 transition hover:text-brand-600">
            Home
          </Link>
        </li>
        <li aria-hidden="true">
          <Icon name="chevron-right" size={14} className="text-ink-500 opacity-60" />
        </li>
        <li>
          <span aria-current="page" className="font-semibold text-ink-900">
            {current}
          </span>
        </li>
      </ol>
    </nav>
  );
}

/**
 * Shared shell for the public text pages: header, breadcrumb, one h1,
 * the last updated date, a way back to the landing page, and a footer.
 */
export default function PublicPage({ title, description, current, children }) {
  useDocumentMeta(title, description);

  return (
    <div className="flex min-h-svh flex-col bg-mint-50 text-ink-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-4 px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
            <span className="font-display text-lg font-bold tracking-wide text-forest-900 dark:text-sage-100">
              Campus Coin
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-6">
        <Breadcrumb current={current} />

        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-ink-500">Last updated: {LAST_UPDATED}</p>

        <div className="mt-8">{children}</div>

        <p className="mt-10">
          <Link to="/" className={`inline-flex items-center gap-1.5 ${linkClass}`}>
            <Icon name="chevron-left" size={15} />
            Back to home
          </Link>
        </p>
      </main>

      <footer className="border-t border-slate-200/70 bg-surface">
        <div className="mx-auto w-full max-w-3xl px-4 py-8">
          <p className="text-sm text-ink-500">
            CampusCoin is a budget tracker for students. It does not move money.
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            {PAGE_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
                Email us
              </a>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
