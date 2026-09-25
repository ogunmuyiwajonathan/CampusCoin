import { useCallback, useMemo, useState } from "react";
import { AuthContext, STORAGE_KEY } from "./authContext.js";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  });
  const [status] = useState("ready");

  const persist = useCallback((next) => {
    setUser(next);
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const login = useCallback(
    async ({ email, password }) => {
      if (!email || !password) throw new Error("Enter your email and password.");
      if (password.length < 6) throw new Error("Password must be at least 6 characters.");
      persist({
        user_id: "demo-student",
        name: email.split("@")[0] || "Student",
        email,
        role: "student",
        monthly_savings_goal: 15000,
      });
    },
    [persist],
  );

  const register = useCallback(
    async ({ name, email, password }) => {
      if (!name || !email || !password) throw new Error("Fill in every field.");
      if (password.length < 6) throw new Error("Password must be at least 6 characters.");
      persist({
        user_id: "demo-student",
        name,
        email,
        role: "student",
        monthly_savings_goal: 15000,
      });
    },
    [persist],
  );

  const logout = useCallback(() => {
    persist(null);
  }, [persist]);

  const value = useMemo(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
