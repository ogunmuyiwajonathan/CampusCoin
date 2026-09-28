import { Link } from "react-router-dom";
import Icon from "../components/Icon.jsx";

export default function NotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-card bg-surface p-8 text-center shadow-card">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-ink-500">
          <Icon name="search" size={22} />
        </span>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
          Page not found
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          We could not find that page. It may have moved, or the link may be wrong.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <Link
            to="/"
            className="rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"
          >
            Back to home
          </Link>
          <Link
            to="/dashboard"
            className="rounded-lg border border-slate-200 bg-surface px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:bg-slate-50"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
