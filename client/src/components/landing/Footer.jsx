import { Link } from "react-router-dom";

const QUICK_LINKS = [
  { label: "Home", href: "/" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Insights", href: "#insights" },
  { label: "About", href: "#about" },
];

const RESOURCE_LINKS = [
  { label: "FAQ", to: "/faq" },
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Terms of Service", to: "/terms" },
];

const SOCIAL_LINKS = [
  {
    label: "Instagram",
    path: "M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.8.1-1.1.1-1.5.2-1.8.3-.5.2-.8.4-1.1.7-.3.3-.5.6-.7 1.1-.1.3-.3.8-.3 1.8-.1 1.2-.1 1.6-.1 4.8s0 3.5.1 4.8c.1 1.1.2 1.5.3 1.8.2.5.4.8.7 1.1.3.3.6.5 1.1.7.3.1.8.3 1.8.3 1.2.1 1.6.1 4.8.1s3.5 0 4.8-.1c1.1-.1 1.5-.2 1.8-.3.5-.2.8-.4 1.1-.7.3-.3.5-.6.7-1.1.1-.3.3-.8.3-1.8.1-1.2.1-1.6.1-4.8s0-3.5-.1-4.8c-.1-1.1-.2-1.5-.3-1.8-.2-.5-.4-.8-.7-1.1-.3-.3-.6-.5-1.1-.7-.3-.1-.8-.3-1.8-.3C15.5 4 15.1 4 12 4zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8zm0 1.8a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2zm5.1-2.9a1.1 1.1 0 1 1 0 2.3 1.1 1.1 0 0 1 0-2.3z",
  },
  {
    label: "LinkedIn",
    path: "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3V9.5zm6 0h3.8v1.6h.1c.5-.95 1.8-1.95 3.7-1.95 4 0 4.7 2.6 4.7 6V21h-4v-5.3c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8V21H9V9.5z",
  },
  {
    label: "X",
    path: "M17.5 3h3l-6.5 7.4L21.8 21h-6l-4.7-6.1L5.7 21H2.7l7-8L2.3 3h6.2l4.2 5.6L17.5 3zm-1 16.2h1.7L7.6 4.7H5.8l10.7 14.5z",
  },
  {
    label: "YouTube",
    path: "M23 12s0-3.4-.4-5c-.3-1-1-1.8-2-2C18.9 4.5 12 4.5 12 4.5s-6.9 0-8.6.5c-1 .3-1.8 1-2 2C1 8.6 1 12 1 12s0 3.4.4 5c.3 1 1 1.8 2 2 1.7.5 8.6.5 8.6.5s6.9 0 8.6-.5c1-.3 1.7-1 2-2 .4-1.6.4-5 .4-5zM9.8 15V9l5.5 3-5.5 3z",
  },
];

const headingClass = "text-sm font-bold text-white";
const linkClass = "text-sm text-slate-400 transition hover:text-white";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink-900 text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1.2fr]">
          <div>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="" className="h-9 w-9 object-contain" />
              <span className="font-display text-lg font-extrabold text-white">Campus Coin</span>
            </div>
            <p className="mt-3 text-sm text-slate-400">Smart Spending · Student Style.</p>
          </div>

          <nav aria-label="Quick links">
            <h2 className={headingClass}>Quick Links</h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              {QUICK_LINKS.map((item) => (
                <li key={item.label}>
                  <a href={item.href} className={linkClass}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Account">
            <h2 className={headingClass}>Account</h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              <li>
                <Link to="/login" className={linkClass}>
                  Login
                </Link>
              </li>
              <li>
                <Link to="/login" className={linkClass}>
                  Register
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Resources">
            <h2 className={headingClass}>Resources</h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              {RESOURCE_LINKS.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className={headingClass}>Connect With Us</h2>
            <ul className="mt-4 flex gap-3">
              {SOCIAL_LINKS.map((item) => (
                <li key={item.label}>
                  <a
                    href="#"
                    aria-label={item.label}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-slate-300 transition hover:bg-white/20 hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                      <path d={item.path} />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <p className="text-center text-xs text-slate-400 sm:text-right">
            © {year} Campus Coin. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
