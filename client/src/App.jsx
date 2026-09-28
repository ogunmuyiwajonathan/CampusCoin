import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./hooks/AuthProvider.jsx";
import { ThemeProvider } from "./hooks/ThemeProvider.jsx";
import { useAuth } from "./hooks/useAuth.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { useCategories } from "./hooks/useCategories.js";
import NotFound from "./pages/NotFound.jsx";

const Assistant = lazy(() => import("./pages/student/Assistant.jsx"));
const Bookmarks = lazy(() => import("./pages/student/Bookmarks.jsx"));
const Budgets = lazy(() => import("./pages/student/Budgets.jsx"));
const Dashboard = lazy(() => import("./pages/student/Dashboard.jsx"));
const Insights = lazy(() => import("./pages/student/Insights.jsx"));
const Reports = lazy(() => import("./pages/student/Reports.jsx"));
const LandingPage = lazy(() => import("./pages/LandingPage.jsx"));
const Login = lazy(() => import("./pages/LoginPage.jsx"));
const More = lazy(() => import("./pages/student/More.jsx"));
const Notifications = lazy(() => import("./pages/student/Notifications.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const Settings = lazy(() => import("./pages/student/Settings.jsx"));
const Signup = lazy(() => import("./pages/Signup.jsx"));
const Transactions = lazy(() => import("./pages/student/Transactions.jsx"));
const AdminLogin = lazy(() => import("./pages/AdminLogin.jsx"));

const AdminLayout = lazy(() => import("./pages/admin/AdminLayout.jsx"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard.jsx"));
const AdminUsers = lazy(() => import("./pages/admin/Users.jsx"));
const AdminCategories = lazy(() => import("./pages/admin/Categories.jsx"));
const AdminTips = lazy(() => import("./pages/admin/Tips.jsx"));
const AdminAnnouncements = lazy(() => import("./pages/admin/Announcements.jsx"));

function PageLoader() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500" />
      <span className="sr-only">Loading page</span>
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="min-h-svh bg-slate-50 px-4 py-6 lg:px-8" role="status" aria-live="polite">
      <span className="sr-only">Loading admin area</span>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="h-8 w-56 animate-pulse rounded-xl bg-slate-200" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-xl bg-slate-200" />
      </div>
    </div>
  );
}

function AdminRoutes() {
  const { user, status } = useAuth();

  if (status === "loading") return <AdminSkeleton />;
  if (user?.role !== "admin") return <Navigate to="/admin/login" replace />;

  return (
    <ProtectedRoute requireAdmin>
      <AdminLayout />
    </ProtectedRoute>
  );
}

function AdminSuspenseHost() {
  return (
    <ErrorBoundary showReload>
      <Outlet />
    </ErrorBoundary>
  );
}

// The route tree lives in its own component so the categories fetch can sit
// inside AuthProvider and read the signed-in user before it asks the server for
// anything. A signed-out visit never triggers a request the server would only
// refuse. Pages read categories through the registry helpers rather than
// through context, and they pick up the result because this component
// re-creates the tree below it when the status changes.
function AppRoutes() {
  useCategories();

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assistant"
            element={
              <ProtectedRoute>
                <Assistant />
              </ProtectedRoute>
            }
          />
          <Route
            path="/budgets"
            element={
              <ProtectedRoute>
                <Budgets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/insights"
            element={
              <ProtectedRoute>
                <Insights />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookmarks"
            element={
              <ProtectedRoute>
                <Bookmarks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/more"
            element={
              <ProtectedRoute>
                <More />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                <Transactions />
              </ProtectedRoute>
            }
          />

          <Route
            element={
              <Suspense fallback={<AdminSkeleton />}>
                <AdminSuspenseHost />
              </Suspense>
            }
          >
            <Route path="/admin" element={<AdminRoutes />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="tips" element={<AdminTips />} />
              <Route path="announcements" element={<AdminAnnouncements />} />
            </Route>
            <Route path="/admin/login" element={<AdminLogin />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
