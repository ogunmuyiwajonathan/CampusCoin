import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon.jsx";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#insights", label: "Insights" },
  { href: "#about", label: "About" },
];

const linkClass =
  "rounded-lg px-3 py-2 text-sm font-semibold text-ink-500 transition hover:bg-slate-50 hover:text-forest-900";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
          <span className="font-display text-lg font-extrabold tracking-tight text-forest-900">
            Campus Coin
          </span>
        </Link>

        <nav className="mx-auto hidden items-center gap-7 md:flex" aria-label="Landing">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-ink-500 transition hover:text-forest-900"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3 md:ml-0">
          <Link
            to="/login"
            className="hidden text-sm font-semibold text-ink-900 transition hover:text-brand-600 sm:block"
          >
            Login
          </Link>
          <Link
            to="/login"
            className="rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            Get Started
          </Link>
          <button
            type="button"
            onClick={() => setOpen((visible) => !visible)}
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
            className="rounded-lg p-2 text-ink-900 transition hover:bg-slate-100 md:hidden"
          >
            <Icon name={open ? "x" : "menu"} size={20} />
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-slate-100 bg-white py-2 md:hidden" aria-label="Landing mobile">
          <div className="flex flex-col px-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={linkClass}
              >
                {link.label}
              </a>
            ))}
            <Link to="/login" onClick={() => setOpen(false)} className={linkClass}>
              Login
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
