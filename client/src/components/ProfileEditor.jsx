import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import { ACADEMIC_YEARS } from "../data/mockData.js";
import { useSubmitLock } from "../hooks/useSubmitLock.js";
import SubmitSpinner from "./SubmitSpinner.jsx";

const AMOUNT_FIELDS = [
  {
    key: "allowance_baseline",
    id: "profile-allowance",
    label: "Monthly Allowance",
    hint: "What you usually receive each month",
  },
  {
    key: "monthly_savings_goal",
    id: "profile-goal",
    label: "Monthly Savings Goal",
    hint: "Target for what you set aside each month",
  },
];

function parseAmount(value) {
  const text = value.trim();
  if (text === "") return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < 0) return NaN;
  return parsed;
}

export default function ProfileEditor({ initial, onClose, onSave }) {
  const [name, setName] = useState(initial.name ?? "");
  const [academicYear, setAcademicYear] = useState(initial.academic_year ?? "");
  const [amounts, setAmounts] = useState({
    allowance_baseline: initial.allowance_baseline ?? "",
    monthly_savings_goal: initial.monthly_savings_goal ?? "",
  });
  const [error, setError] = useState("");
  const { locked, done, run, minWidth, measure } = useSubmitLock();
  const saving = locked;

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const submit = async (event) => {
    event.preventDefault();
    if (locked) return;
    setError("");

    if (!name.trim()) {
      setError("Enter your name.");
      return;
    }

    const patch = { name: name.trim() };
    for (const field of AMOUNT_FIELDS) {
      const value = parseAmount(amounts[field.key]);
      if (Number.isNaN(value)) {
        setError(`${field.label} must be zero or more.`);
        return;
      }
      patch[field.key] = value;
    }
    patch.academic_year = academicYear || null;

    try {
      await run(async () => {
        const result = await onSave(patch);
        if (!result?.ok) throw new Error(result?.error ?? "Couldn't save your profile.");
      });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Edit profile"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={saving ? undefined : onClose}
        aria-hidden="true"
      />
      <form
        onSubmit={submit}
        noValidate
        className="relative max-h-[90svh] w-full max-w-md overflow-y-auto rounded-card bg-surface p-6 shadow-card"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-extrabold tracking-tight text-ink-900">
            Edit Profile
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close editor"
            className="rounded-lg p-1.5 text-ink-500 transition hover:bg-slate-50 hover:text-ink-900 disabled:opacity-50"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <label htmlFor="profile-name" className="mb-1.5 block text-sm font-semibold text-ink-900">
              Full Name
            </label>
            <div className="relative">
              <Icon
                name="user"
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500"
              />
              <input
                id="profile-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                className="w-full rounded-lg border border-slate-200 bg-surface py-2.5 pl-11 pr-4 text-sm text-ink-900 placeholder:text-ink-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

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
                value={initial.email ?? ""}
                readOnly
                disabled
                className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 py-2.5 pl-11 pr-4 text-sm text-ink-500"
              />
            </div>
            <p className="mt-1.5 text-xs text-ink-500">
              Your login email can&apos;t be changed here.
            </p>
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

          {AMOUNT_FIELDS.map((field) => (
            <div key={field.key}>
              <label htmlFor={field.id} className="mb-1.5 block text-sm font-semibold text-ink-900">
                {field.label}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-500">
                  &#8358;
                </span>
                <input
                  id={field.id}
                  type="number"
                  min="0"
                  step="500"
                  inputMode="numeric"
                  value={amounts[field.key]}
                  onChange={(event) =>
                    setAmounts((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-200 bg-surface py-2.5 pl-9 pr-4 text-sm tabular-nums text-ink-900 placeholder:text-ink-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <p className="mt-1.5 text-xs text-ink-500">{field.hint}</p>
            </div>
          ))}
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
            disabled={saving}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-ink-500 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            ref={measure}
            disabled={saving}
            aria-busy={saving}
            style={minWidth ? { minWidth } : undefined}
            className="flex items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving && <SubmitSpinner />}
            {saving ? "Saving..." : done ? "Saved" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
