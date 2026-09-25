import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./hooks/AuthProvider.jsx";
import Placeholder from "./components/Placeholder.jsx";
import Assistant from "./pages/Assistant.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";
import Settings from "./pages/Settings.jsx";
import Signup from "./pages/Signup.jsx";

const STUDENT_ROUTES = [
  { path: "/transactions", title: "Transactions", note: "Quick-add, recurring entries and CSV import - next in the build order." },
  { path: "/budgets", title: "Budgets", note: "Per-category monthly limits with progress bars and alerts - coming next." },
  { path: "/insights", title: "Insights", note: "Monthly narrative, history and reports - coming next." },
];

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/settings" element={<Settings />} />
          {STUDENT_ROUTES.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={<Placeholder title={route.title} note={route.note} />}
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
