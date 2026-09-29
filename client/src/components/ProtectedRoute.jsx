import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, status } = useAuth();

  // The session is still being restored: show the page spinner instead of an
  // empty screen, which is what this rendered while the first request of the
  // visit was in flight.
  if (status === "loading") {
    return (
      <div
        className="flex min-h-svh items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500" />
        <span className="sr-only">Loading page</span>
      </div>
    );
  }

  // Signed-out visitors are sent straight to the login page, so a protected
  // link (from the sitemap or a typed URL) can never show a blank or stalled
  // screen. A signed-in non-admin who ends up here belongs on the admin login
  // page instead.
  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && user.role !== "admin") {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
