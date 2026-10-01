import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import SubmitSpinner from "../components/SubmitSpinner.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useSubmitLock } from "../hooks/useSubmitLock.js";
import { adminLogin } from "../lib/apiClient.js";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-surface py-2.5 pl-11 text-sm text-ink-900 placeholder:text-ink-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60";

const POINTS = [
  { icon: "users", title: "Manage Users", description: "Review and support every account" },
  { icon: "tag", title: "Control Categories", description: "Keep spending limits tidy" },
  { icon: "megaphone", title: "Post Announcements", description: "Reach the whole campus" },
];

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const { locked, run, minWidth, measure } = useSubmitLock();
  const { refresh } = useAuth();
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    if (locked) return;
    setError("");
    try {
      await run(
        async () => {
          const res = await adminLogin({ password, rememberMe });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            if (res.status === 429) {
              throw new Error(
                data.error?.message || "Too many attempts. Please wait a few minutes.",
              );
            }
            if (res.status === 401 || res.status === 400) {
              throw new Error(data.error?.message || "That password does not match.");
            }
            throw new Error("The server couldn't be reached. Please try again.");
          }
          await refresh();
          navigate("/admin", { replace: true });
        },
        { oneShot: true },
      );
    } catch (err) {
      setError(
        err instanceof SyntaxError || err instanceof TypeError
          ? "Can't reach the server. Please try again."
          : err.message || "Can't reach the server. Please try again.",
      );
    }
  };

  return (
    <div className="flex min-h-svh bg-slate-50 lg:h-svh lg:overflow-hidden">
      <aside className="animate-auth-left relative hidden w-1/2 flex-col overflow-hidden bg-gradient-to-br from-emerald-100/80 via-emerald-50 to-teal-50 p-8 lg:flex lg:p-10 dark:from-emerald-500/10 dark:via-emerald-500/5 dark:to-teal-500/5">
        <div
          className="absolute -right-12 top-14 h-44 w-44 rounded-full bg-surface/60 blur-2xl"
          aria-hidden="true"
        />
        <div
          className="absolute -left-10 bottom-28 h-52 w-52 rounded-full bg-emerald-100/70 blur-2xl dark:bg-emerald-500/10"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-1 flex-col">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-forest-900 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            <Icon name="shield" size={13} />
            Admin only
          </span>

          <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight text-ink-900 xl:text-5xl">
            Admin Panel
            <br />
            <span className="text-brand-500">Access Only</span>
          </h1>

          <p className="mt-4 max-w-lg text-base leading-relaxed text-ink-500">
            Manage users, categories, announcements and keep Campus Coin running smoothly.
          </p>

          <ul className="mt-7 flex max-w-md flex-col gap-3.5 pl-4">
            {POINTS.map((point) => (
              <li key={point.title} className="flex items-center gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                  <Icon name={point.icon} size={18} />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink-900">{point.title}</p>
                  <p className="text-sm text-ink-500">{point.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="flex w-full items-center justify-center px-4 py-8 lg:w-1/2 lg:overflow-y-auto lg:p-8">
        <div className="animate-auth-right relative w-full max-w-md">
          <ThemeToggle className="absolute right-3.5 top-3.5 z-10" />

          <div className="rounded-card bg-surface p-7 shadow-card lg:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="" className="h-9 w-9 object-contain" />
                <div className="text-left">
                  <p className="font-display text-lg font-extrabold text-forest-900 dark:text-sage-100">
                    Campus Coin
                  </p>
                  <p className="text-xs text-ink-500">Admin Panel</p>
                </div>
              </div>
              <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-ink-900">
                Welcome Back
              </h1>
              <p className="mt-1 text-sm text-ink-500">Log in to your admin account</p>
            </div>

            <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
              {/* One field on purpose. The admin account is resolved server side
                  from ADMIN_EMAIL, so there is nothing here to mistype and no
                  other admin to be named. */}
              <div className="animate-auth-rise">
                <label
                  htmlFor="admin-password"
                  className="mb-1.5 block text-sm font-semibold text-ink-900"
                >
                  Password
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
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className={`${inputClass} pr-11`}
                    disabled={locked}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 transition hover:text-ink-900"
                  >
                    <Icon name={showPassword ? "eye-off" : "eye"} size={17} />
                  </button>
                </div>
              </div>

              <div
                className="animate-auth-rise flex items-center justify-between"
                style={{ animationDelay: "180ms" }}
              >
                <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-500">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  Remember me
                </label>
              </div>

              {error && (
                <p className="animate-auth-error text-sm font-semibold text-red-500" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                ref={measure}
                disabled={!password || locked}
                aria-busy={locked}
                className="animate-auth-rise flex w-full items-center justify-center gap-2 rounded-lg bg-forest-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-forest-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                style={{ animationDelay: "240ms", ...(minWidth ? { minWidth } : {}) }}
              >
                {locked ? (
                  <>
                    <SubmitSpinner />
                    Signing in...
                  </>
                ) : (
                  <>
                    Log In
                    <Icon name="arrow-right" size={16} />
                  </>
                )}
              </button>

              <p className="mt-5 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-xs leading-relaxed text-ink-500 dark:bg-emerald-500/10">
                <Icon
                  name="shield"
                  size={15}
                  className="mt-px shrink-0 text-emerald-600 dark:text-emerald-400"
                />
                Admins only. This area is restricted to Campus Coin administrators.
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
