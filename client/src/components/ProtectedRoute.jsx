import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === "loading") return null;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (requireAdmin && user.role !== "admin") return <Navigate to="/dashboard" replace />;

  return children;
}
