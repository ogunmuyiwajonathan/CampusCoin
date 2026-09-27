import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./hooks/AuthProvider.jsx";
import { ThemeProvider } from "./hooks/ThemeProvider.jsx";
import { useAuth } from "./hooks/useAuth.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

const Assistant = lazy(() => import("./pages/Assistant.jsx"));
const Budgets = lazy(() => import("./pages/Budgets.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Insights = lazy(() => import("./pages/Insights.jsx"));
const LandingPage = lazy(() => import("./pages/LandingPage.jsx"));
const Login = lazy(() => import("./pages/LoginPage.jsx"));
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

function RootRoute() {
  const { user, status } = useAuth();
  if (status === "loading") return null;
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
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/assistant" element={<Assistant />} />
                <Route path="/budgets" element={<Budgets />} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
