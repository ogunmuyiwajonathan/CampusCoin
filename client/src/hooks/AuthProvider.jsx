import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./authContext.js";
import {
  getMe,
  loginAccount,
  logoutAccount,
  registerAccount,
  saveProfile,
  uploadAvatar,
} from "../lib/apiClient.js";
import { formatName } from "../lib/formatName.js";

const DATE_LOCALE = "en-GB";

function joinedFrom(createdAt) {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(DATE_LOCALE, { month: "short", year: "numeric" });
}

function decorate(user) {
  if (!user) return null;
  return {
    ...user,
    name: typeof user.name === "string" ? formatName(user.name) : user.name,
    joined: joinedFrom(user.created_at),
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((data) => {
        if (cancelled) return;
        setUser(decorate(data?.user ?? null));
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) setStatus("ready");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const data = await loginAccount({ email, password });
    setUser(decorate(data.user));
    return data.user;
  }, []);

  const register = useCallback(async ({ name, email, password }) => {
    const data = await registerAccount({ name, email, password });
    setUser(decorate(data.user));
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutAccount();
    } finally {
      setUser(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await getMe();
      setUser(decorate(data?.user ?? null));
      return data?.user ?? null;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  const updateProfile = useCallback(async (patch) => {
    try {
      const data = await saveProfile(patch);
      const next = decorate(data.user);
      setUser(next);
      return { ok: true, user: next };
    } catch (error) {
      return { ok: false, error: error.message, details: error.details ?? null };
    }
  }, []);

  const uploadProfileAvatar = useCallback(async (file) => {
    try {
      const data = await uploadAvatar(file);
      const next = decorate(data.user);
      setUser(next);
      return { ok: true, user: next };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      login,
      register,
      logout,
      refresh,
      updateProfile,
      uploadProfileAvatar,
    }),
    [user, status, login, register, logout, refresh, updateProfile, uploadProfileAvatar],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
