import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import { resetPassword } from "../lib/apiClient.js";
import { useSubmitLock } from "../hooks/useSubmitLock.js";
import SubmitSpinner from "../components/SubmitSpinner.jsx";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const { locked, run, minWidth, measure } = useSubmitLock();

  const submit = async (event) => {
    event.preventDefault();
    if (locked) return;
    if (!email.trim()) {
      setError("Enter the email address you used to sign up.");
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6 digit code from your email.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setStatus("saving");
    try {
      await run(async () => {
        await resetPassword({ email: email.trim(), code: code.trim(), password });
        setStatus("done");
      }, { oneShot: true });
    } catch (err) {
      setError(err.message);
      setStatus("idle");
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-50 px-4">
      <main className="w-full max-w-sm">
        <Link
          to="/"
          className="mb-6 flex items-center justify-center gap-2"
          aria-label="Campus Coin home"
        >
          <img src="/logo.png" alt="" className="h-9 w-9 object-contain" />
          <span className="text-xs font-semibold text-ink-500">Smart Spending. Student Style.</span>
        </Link>

        <div className="rounded-card bg-surface p-6 shadow-card">
          {status === "done" ? (
            <div role="status">
              <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Icon name="check" size={20} />
              </span>
              <h1 className="text-center font-display text-lg font-bold text-ink-900">
                Password changed
              </h1>
              <p className="mt-2 text-center text-sm leading-relaxed text-ink-500">
                You can now log in with your new password.
              </p>
              <Link
                to="/login"
                className="mt-6 block rounded-lg bg-brand-500 py-2.5 text-center text-sm font-bold text-white transition hover:bg-brand-600"
              >
                Go to log in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-lg font-bold text-ink-900">Choose a new password</h1>
              <p className="mt-1.5 text-sm text-ink-500">
                Enter the 6 digit code we emailed you, then pick a new password.
              </p>

              <form onSubmit={submit} className="mt-5" noValidate>
                <label htmlFor="rp-email" className="block text-sm font-semibold text-ink-900">
                  Email address
                </label>
                <input
                  id="rp-email"
                  type="email"
                  value={email}
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={Boolean(error)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />

                <label htmlFor="rp-code" className="mt-4 block text-sm font-semibold text-ink-900">
                  6 digit code
                </label>
                <input
                  id="rp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  aria-invalid={Boolean(error)}
                  placeholder="000000"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-center font-display text-lg tracking-[0.4em] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />

                <label htmlFor="rp-password" className="mt-4 block text-sm font-semibold text-ink-900">
                  New password
                </label>
                <input
                  id="rp-password"
                  type="password"
                  value={password}
                  autoComplete="new-password"
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(error)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />

                <label
                  htmlFor="rp-confirm"
                  className="mt-4 block text-sm font-semibold text-ink-900"
                >
                  Confirm new password
                </label>
                <input
                  id="rp-confirm"
                  type="password"
                  value={confirm}
                  autoComplete="new-password"
                  onChange={(event) => setConfirm(event.target.value)}
                  aria-invalid={Boolean(error)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />

                {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

                <button
                  type="submit"
                  ref={measure}
                  disabled={locked}
                  aria-busy={locked}
                  style={minWidth ? { minWidth } : undefined}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {locked && <SubmitSpinner />}
                  {locked ? "Saving..." : "Save new password"}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
