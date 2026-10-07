import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import { requestPasswordReset } from "../lib/apiClient.js";
import { useSubmitLock } from "../hooks/useSubmitLock.js";
import SubmitSpinner from "../components/SubmitSpinner.jsx";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const { locked, run, minWidth, measure } = useSubmitLock();

  const submit = async (event) => {
    event.preventDefault();
    if (locked) return;
    if (!email.trim()) {
      setError("Enter the email you signed up with.");
      return;
    }
    setError("");
    setStatus("sending");
    try {
      await run(async () => {
        await requestPasswordReset(email.trim());
        setStatus("sent");
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
          {status === "sent" ? (
            <div role="status">
              <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Icon name="check" size={20} />
              </span>
              <h1 className="text-center font-display text-lg font-bold text-ink-900">
                Check your email
              </h1>
              <p className="mt-2 text-center text-sm leading-relaxed text-ink-500">
                If that address is registered, a 6 digit code is on its way. It works
                once and expires in 10 minutes.
              </p>
              <Link
                to={`/reset-password?email=${encodeURIComponent(email.trim())}`}
                className="mt-6 block rounded-lg bg-brand-700 py-2.5 text-center text-sm font-bold text-white transition hover:bg-brand-800"
              >
                Enter the code
              </Link>
              <Link
                to="/login"
                className="mt-3 block text-center text-sm font-semibold text-brand-600 hover:underline"
              >
                Back to log in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-lg font-bold text-ink-900">Reset your password</h1>
              <p className="mt-1.5 text-sm text-ink-500">
                Enter your email and we will send you a 6 digit code to reset with.
              </p>

              <form onSubmit={submit} className="mt-5" noValidate>
                <label htmlFor="fp-email" className="block text-sm font-semibold text-ink-900">
                  Email
                </label>
                <input
                  id="fp-email"
                  type="email"
                  value={email}
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
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
                  className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-700 py-2.5 text-sm font-bold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 md:min-h-0"
                >
                  {locked && <SubmitSpinner />}
                  {locked ? "Sending..." : "Send reset code"}
                </button>
              </form>

              <Link
                to="/login"
                className="mt-4 block text-center text-sm font-semibold text-brand-600 hover:underline"
              >
                Back to log in
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
