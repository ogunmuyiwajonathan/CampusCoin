import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import { ACADEMIC_YEARS } from "../data/mockData.js";

export default function ProfileEditor({ initial, onClose, onSave }) {
  const [email, setEmail] = useState(initial.email);
  const [academicYear, setAcademicYear] = useState(initial.academic_year);
  const [goal, setGoal] = useState(initial.monthly_savings_goal);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (event) => {
    event.preventDefault();
    setError("");
    if (!email.includes("@") || !email.includes(".")) {
      setError("Enter a valid email address.");
      return;
    }
    const goalValue = goal.trim() === "" ? null : Number(goal);
    if (goalValue !== null && (!Number.isFinite(goalValue) || goalValue < 0)) {
      setError("Enter a valid savings goal.");
      return;
    }
    onSave({ email: email.trim(), academic_year: academicYear || null, monthly_savings_goal: goalValue });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Edit profile"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <form
        onSubmit={submit}
        className="relative w-full max-w-md rounded-card bg-surface p-6 shadow-card"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-extrabold tracking-tight text-ink-900">
            Edit Profile
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close editor"
            className="rounded-lg p-1.5 text-ink-500 transition hover:bg-slate-50 hover:text-ink-900"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <label htmlFor="profile-email" className="mb-1.5 block text-sm font-semibold text-ink-900">
              Email Address
            </label>
            <div className="relative">
              <Icon
                name="mail"
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500"
              />
              <input
                id="profile-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-200 bg-surface py-2.5 pl-11 pr-4 text-sm text-ink-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <div>
            <label htmlFor="profile-year" className="mb-1.5 block text-sm font-semibold text-ink-900">
              Academic Year
            </label>
            <div className="relative">
              <Icon
                name="graduation-cap"
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500"
              />
              <select
                id="profile-year"
                value={academicYear}
                onChange={(event) => setAcademicYear(event.target.value)}
                className={`w-full appearance-none rounded-lg border border-slate-200 bg-surface py-2.5 pl-11 pr-9 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                  academicYear ? "text-ink-900" : "text-slate-400"
                }`}
              >
                <option value="">Not set</option>
                {ACADEMIC_YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <Icon
                name="chevron-down"
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="profile-goal" className="mb-1.5 block text-sm font-semibold text-ink-900">
              Monthly Savings Goal
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-500">
                &#8358;
              </span>
              <input
                id="profile-goal"
                type="number"
                min="0"
                step="500"
                inputMode="numeric"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-slate-200 bg-surface py-2.5 pl-9 pr-4 text-sm tabular-nums text-ink-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm font-semibold text-red-500" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-ink-500 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
