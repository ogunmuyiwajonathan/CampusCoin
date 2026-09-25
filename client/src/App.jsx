import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./hooks/AuthProvider.jsx";
import { ThemeProvider } from "./hooks/ThemeProvider.jsx";
import Placeholder from "./components/Placeholder.jsx";
import Assistant from "./pages/Assistant.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";
import Settings from "./pages/Settings.jsx";
import Signup from "./pages/Signup.jsx";
import Transactions from "./pages/Transactions.jsx";

const STUDENT_ROUTES = [
  { path: "/budgets", title: "Budgets", note: "Per-category monthly limits with progress bars and alerts - coming next." },
  { path: "/insights", title: "Insights", note: "Monthly narrative, history and reports - coming next." },
];

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/transactions" element={<Transactions />} />
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
    </ThemeProvider>
  );
}
