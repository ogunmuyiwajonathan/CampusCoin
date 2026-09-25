import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./hooks/AuthProvider.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Placeholder from "./components/Placeholder.jsx";
import Dashboard from "./pages/Dashboard.jsx";

const STUDENT_ROUTES = [
  { path: "/transactions", title: "Transactions", note: "Quick-add, recurring entries and CSV import - next in the build order." },
  { path: "/budgets", title: "Budgets", note: "Per-category monthly limits with progress bars and alerts - coming next." },
  { path: "/insights", title: "Insights", note: "Monthly narrative, history and reports - coming next." },
  { path: "/assistant", title: "AI Assistant", note: "Suggest-as-you-type categorization - optional module, built after core." },
  { path: "/profile", title: "Profile", note: "Academic year, allowance baseline and savings goal - coming next." },
  { path: "/settings", title: "Settings", note: "Dark mode, font size and breadcrumbs - coming next." },
];

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={<Placeholder title="Landing page" note="Public home with sitemap - next build step." />}
          />
          <Route path="/login" element={<Placeholder title="Log in" note="Auth screens - next build step." />} />
          <Route path="/register" element={<Placeholder title="Create account" note="Auth screens - next build step." />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          {STUDENT_ROUTES.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={
                <ProtectedRoute>
                  <Placeholder title={route.title} note={route.note} />
                </ProtectedRoute>
              }
            />
          ))}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
