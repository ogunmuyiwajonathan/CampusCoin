import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

function Loading() {
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

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <Loading />;

  const loginPath = requireAdmin ? "/admin/login" : "/login";

  if (!user) {
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  // The admin panel has its own password-only login, so a signed-in student
  // who asks for /admin is sent there rather than bounced back to the
  // dashboard with no explanation. /admin/login is not itself guarded, so this
  // cannot loop.
  if (requireAdmin && user.role !== "admin") return <Navigate to="/admin/login" replace />;
  if (!requireAdmin && user.role === "admin") return <Navigate to="/admin" replace />;

  return children;
}
