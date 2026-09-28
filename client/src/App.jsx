import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./hooks/AuthProvider.jsx";
import { ThemeProvider } from "./hooks/ThemeProvider.jsx";
import { useAuth } from "./hooks/useAuth.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

const Assistant = lazy(() => import("./pages/Assistant.jsx"));
const Budgets = lazy(() => import("./pages/Budgets.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Insights = lazy(() => import("./pages/Insights.jsx"));
const LandingPage = lazy(() => import("./pages/LandingPage.jsx"));
const Login = lazy(() => import("./pages/LoginPage.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));
const Signup = lazy(() => import("./pages/Signup.jsx"));
const Transactions = lazy(() => import("./pages/Transactions.jsx"));

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

// A student who is already signed in should never see the sign-in form, and one
// who is not should never see the app. Both are decided here rather than in
// each page.
function GuestOnly({ children }) {
  const { user, status } = useAuth();
  if (status === "loading") return <PageLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function RootRoute() {
  const { user, status } = useAuth();
  if (status === "loading") return <PageLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<RootRoute />} />

                <Route
                  path="/login"
                  element={
                    <GuestOnly>
                      <Login />
                    </GuestOnly>
                  }
                />
                <Route
                  path="/signup"
                  element={
                    <GuestOnly>
                      <Signup />
                    </GuestOnly>
                  }
                />
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

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
