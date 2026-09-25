import { NavLink, useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import { useAuth } from "../hooks/useAuth.js";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Home", icon: "house", end: true },
  { to: "/transactions", label: "Transactions", icon: "arrow-left-right" },
  { to: "/budgets", label: "Budgets", icon: "target" },
  { to: "/insights", label: "Insights", icon: "chart-column" },
  { to: "/assistant", label: "AI Assistant", icon: "bot" },
  { to: "/profile", label: "Profile", icon: "user" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-forest-900 px-4 py-5 text-white transition-transform duration-200 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-7 flex items-center gap-1 px-2">
          <img src="/logo.png" alt="" className="h-10 w-10 shrink-0 object-contain" />
          <span className="font-display text-xl font-bold tracking-wide">Campus Coin</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1" aria-label="App">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-forest-700 text-white"
                    : "text-sage-400 hover:bg-forest-800 hover:text-white"
                }`
              }
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {user ? (
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sage-400 transition hover:bg-forest-800 hover:text-white"
          >
            <Icon name="log-out" size={18} />
            Log out
            <span className="sr-only">, {user.name}</span>
          </button>
        ) : (
          <NavLink
            to="/login"
            onClick={onClose}
            className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sage-400 transition hover:bg-forest-800 hover:text-white"
          >
            <Icon name="log-in" size={18} />
            Log in
          </NavLink>
        )}
      </aside>
    </>
  );
}
