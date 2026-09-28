import { Link } from "react-router-dom";
import Icon from "./Icon.jsx";
import { useAuth } from "../hooks/useAuth.js";

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, status } = useAuth();

  if (status === "loading") return null;

  if (!user || (requireAdmin && user.role !== "admin")) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-card bg-surface p-8 text-center shadow-card">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Icon name="lock" size={22} />
          </span>
          <h1 className="font-display text-lg font-bold text-ink-900">
            Please log in to view this page
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            This page is only available while you are signed in.
          </p>
          <Link
            to="/login"
            className="mt-5 inline-block rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"
          >
            Go to log in
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
