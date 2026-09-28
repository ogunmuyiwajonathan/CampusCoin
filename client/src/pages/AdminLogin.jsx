import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import { useAuth } from "../hooks/useAuth.js";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-surface py-2.5 pl-11 text-sm text-ink-900 placeholder:text-ink-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { refresh } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          setError(data.error?.message || "Too many attempts. Please try again in 15 minutes.");
        } else {
          setError(data.error?.message || "Incorrect password.");
        }
        return;
      }
      await refresh();
      navigate("/admin", { replace: true });
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-mint-50 px-4">
      <div className="w-full max-w-sm rounded-card bg-surface p-8 shadow-card">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-forest-900">
            <Icon name="shield" size={24} className="text-white" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-ink-900">
            Admin Panel
          </h1>
          <p className="mt-1 text-sm text-ink-500">Campus Coin administration</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="admin-password" className="mb-1.5 block text-sm font-semibold text-ink-900">
              Admin password
            </label>
            <div className="relative">
              <Icon
                name="lock"
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500"
              />
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className={`${inputClass} pr-11`}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 transition hover:text-ink-900"
              >
                <Icon name={showPassword ? "eye-off" : "eye"} size={17} />
              </button>
            </div>
          </div>

          {error && (
            <p className="animate-auth-error text-sm font-semibold text-red-500" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!password || loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-forest-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-forest-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>
                Enter admin panel
                <Icon name="arrow-right" size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
