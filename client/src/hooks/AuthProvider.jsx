import { useCallback, useMemo, useState } from "react";
import { AuthContext, STORAGE_KEY } from "./authContext.js";
import { mockUser } from "../data/mockData.js";
import { updateUserProfile } from "../lib/apiClient.js";
import { joinedLabel } from "../lib/formatMonth.js";
import { formatName } from "../lib/formatName.js";

function withNormalizedName(next) {
  if (!next || typeof next.name !== "string") return next;
  return { ...next, name: formatName(next.name) };
}

function joinDate(previous) {
  return (previous && previous.joined) || joinedLabel();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? withNormalizedName(JSON.parse(stored)) : null;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  });
  const [status] = useState("ready");

  const persist = useCallback((next) => {
    const value = withNormalizedName(next);
    setUser(value);
    if (!value) {
      localStorage.removeItem(STORAGE_KEY);
      return { ok: true };
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: "Couldn't save your profile. Browser storage may be full or blocked.",
      };
    }
  }, []);

  const login = useCallback(
    async ({ email, password }) => {
      if (!email || !password) throw new Error("Enter your email and password.");
      if (password.length < 6) throw new Error("Password must be at least 6 characters.");
      let previous = null;
      try {
        previous = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      } catch {
        previous = null;
      }
      persist({
        user_id: "demo-student",
        name: email.split("@")[0] || "Student",
        email,
        role: "student",
        monthly_savings_goal: 15000,
        joined: joinDate(previous),
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
        joined: joinDate(null),
      });
    },
    [persist],
  );

  const logout = useCallback(() => {
    persist(null);
  }, [persist]);

  const updateProfile = useCallback(
    async (patch) => {
      const base = user ?? {
        user_id: mockUser.user_id,
        name: mockUser.name,
        email: mockUser.email,
        academic_year: mockUser.academic_year,
        monthly_savings_goal: mockUser.monthly_savings_goal,
        allowance_baseline: mockUser.allowance_baseline,
        role: mockUser.role,
        joined: mockUser.joined,
      };
      try {
        const saved = await updateUserProfile({ ...base, ...patch });
        return { ...persist(saved), user: saved };
      } catch (error) {
        return { ok: false, error: error.message };
      }
    },
    [user, persist],
  );

  const value = useMemo(
    () => ({ user, status, login, register, updateProfile, logout }),
    [user, status, login, register, updateProfile, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
