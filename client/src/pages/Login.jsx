import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import GoogleG from "../components/GoogleG.jsx";
import Icon from "../components/Icon.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { useAuth } from "../hooks/useAuth.js";

const FEATURES = [
  { icon: "chart-column", title: "Track Spending", description: "See where your money goes" },
  { icon: "lightbulb", title: "Get Smart Tips", description: "Save more with personalized insights" },
  { icon: "bot", title: "AI Assistant", description: "Auto-categorize and simplify your finances" },
];

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-surface py-2.5 pl-11 text-sm text-ink-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");

  const handleLogin = (emailAddress, passwordValue) =>
    login({ email: emailAddress, password: passwordValue });

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await handleLogin(email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex min-h-svh bg-slate-50 md:h-svh md:overflow-hidden">
      <aside className="relative hidden w-1/2 flex-col overflow-hidden bg-gradient-to-br from-emerald-100/80 via-emerald-50 to-teal-50 p-8 md:flex lg:p-10">
        <div
          className="absolute -right-12 top-14 h-44 w-44 rounded-full bg-surface/60 blur-2xl"
          aria-hidden="true"
        />
        <div
          className="absolute -left-10 bottom-28 h-52 w-52 rounded-full bg-emerald-100/70 blur-2xl"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-1 flex-col">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink-900 lg:text-5xl xl:text-6xl">
            Take Control of
            <br />
            <span className="text-brand-500">Your Money</span>
          </h1>

          <p className="mt-4 max-w-lg text-base leading-relaxed text-ink-500">
            Track your income, manage your expenses, and build a brighter financial future &mdash;
            made for students, by students.
          </p>

          <ul className="mt-7 flex max-w-md flex-col gap-3.5 pl-4 lg:pl-6">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex items-center gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <Icon name={feature.icon} size={18} />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink-900">{feature.title}</p>
                  <p className="text-sm text-ink-500">{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center gap-2 pl-4 lg:pl-6">
            <p className="-rotate-2 font-['Segoe_Script','Comic_Sans_MS',cursive] text-2xl font-bold text-brand-500">
              Small Steps
              <br />
              Big Goals
            </p>
            <Icon name="arrow-right" size={40} className="rotate-12 text-brand-500" />
          </div>

          <div
            id="hero-illustration-slot"
            className="min-h-0 w-full max-w-xl flex-1"
            aria-hidden="true"
          />
        </div>
      </aside>

      <main className="flex w-full items-center justify-center px-4 py-8 md:w-1/2 md:overflow-y-auto md:p-8">
        <div className="relative w-full max-w-md rounded-card bg-surface p-7 shadow-card lg:p-8">
          <ThemeToggle className="absolute right-3.5 top-3.5" />
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="" className="h-9 w-9 object-contain" />
              <div className="text-left">
                <p className="font-display text-lg font-extrabold text-forest-900 dark:text-sage-100">Campus Coin</p>
                <p className="text-xs text-ink-500">Smart Spending. Student Style.</p>
              </div>
            </div>
            <h2 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-ink-900">
              Welcome Back!
            </h2>
            <p className="mt-2 text-sm text-ink-500">
              Log in to your account and continue your journey.
            </p>
          </div>

          <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-ink-900">
                Email Address
              </label>
              <div className="relative">
                <Icon
                  name="mail"
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500"
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className={`${inputClass} pr-4`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-ink-900">
                Password
              </label>
              <div className="relative">
                <Icon
                  name="lock"
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500"
                />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className={`${inputClass} pr-11`}
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

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-500">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 accent-emerald-600"
                />
                Remember me
              </label>
              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-brand-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {error && (
              <p className="text-sm font-semibold text-red-500" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!email.trim() || !password}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Log In
              <Icon name="arrow-right" size={16} />
            </button>

            <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              OR
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              type="button"
              className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-surface py-2.5 text-sm font-semibold text-ink-900 transition hover:bg-slate-50"
            >
              <GoogleG />
              Continue with Google
            </button>

            <p className="text-center text-sm text-ink-500">
              Don&apos;t have an account?{" "}
              <Link to="/signup" className="font-semibold text-brand-600 hover:underline">
                Sign Up
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
