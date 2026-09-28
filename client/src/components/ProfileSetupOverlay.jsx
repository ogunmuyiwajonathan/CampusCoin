import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import SubmitSpinner from "./SubmitSpinner.jsx";
import { ACADEMIC_YEARS } from "../data/mockData.js";

const AMOUNT_FIELDS = [
  {
    key: "allowance_baseline",
    id: "setup-allowance",
    label: "Monthly allowance",
    icon: "wallet",
  },
  {
    key: "monthly_savings_goal",
    id: "setup-savings",
    label: "Savings goal",
    icon: "target",
  },
];

// How long the confirmation stays up before the card gets out of the way. Long
// enough to read, short enough that nobody thinks it has frozen.
const CONFIRM_MS = 1600;

function parseAmount(raw) {
  const text = String(raw).trim();
  if (text === "") return { ok: true, value: null };
  const value = Number(text);
  if (!Number.isFinite(value)) return { ok: false };
  if (value < 0) return { ok: false };
  return { ok: true, value };
}

export default function ProfileSetupOverlay({ onSave, onSkip, onDismiss }) {
  const [academicYear, setAcademicYear] = useState("");
  const [amounts, setAmounts] = useState({ allowance_baseline: "", monthly_savings_goal: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState("");
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  // "saved" and "skipped" read differently on purpose: skipping stored no
  // profile details, so claiming a profile was saved would be untrue.
  const confirmThenLeave = (kind, leave) => {
    setConfirmed(kind);
    timer.current = setTimeout(leave, CONFIRM_MS);
  };

  // Escape and a click on the dimmed background both mean skip, so there is no
  // way to be trapped on this card and no way to dismiss it without the flag
  // being set, which is what would bring it straight back on the next login.
  const skip = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await onSkip();
      if (result?.ok) confirmThenLeave("skipped", onDismiss);
      else {
        setBusy(false);
        setError(result?.error || "Couldn't finish setting up. Try again.");
      }
    } catch (err) {
      setBusy(false);
      setError(err.message || "Couldn't finish setting up. Try again.");
    }
  }, [busy, onSkip, onDismiss]);

  // Escape works at any point the card is open, not only after a button has
  // been pressed. Once the confirmation is up it just closes, because the flag
  // has been written by then and skipping again would be a second write.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      if (confirmed) onDismiss();
      else skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmed, onDismiss, skip]);

  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError("");

    const patch = {};
    for (const field of AMOUNT_FIELDS) {
      const parsed = parseAmount(amounts[field.key]);
      if (!parsed.ok) {
        setError("Amounts must be a number of naira, and cannot be negative.");
        return;
      }
      patch[field.key] = parsed.value;
    }
    if (academicYear) patch.academic_year = academicYear;

    setBusy(true);
    try {
      const result = await onSave(patch);
      if (result?.ok) confirmThenLeave("saved", onDismiss);
      else {
        setBusy(false);
        setError(result?.error || "Couldn't save your profile. Try again.");
      }
    } catch (err) {
      setBusy(false);
      setError(err.message || "Couldn't save your profile. Try again.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-setup-title"
    >
      <div
        className="absolute inset-0"
        onClick={skip}
        aria-hidden="true"
        data-testid="profile-setup-backdrop"
      />

      <form
        onSubmit={save}
        className="relative w-full max-w-md rounded-card bg-surface p-7 shadow-card"
      >
        {confirmed ? (
          <div className="flex flex-col items-center py-4 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Icon name="check" size={26} />
            </span>
            <p className="mt-4 font-display text-lg font-extrabold tracking-tight text-ink-900">
              {confirmed === "saved" ? "Profile saved" : "All set for now"}
            </p>
            <p className="mt-1.5 text-sm text-ink-500">
              You can update this anytime in Settings.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <Icon name="sparkles" size={26} />
              </span>
              <h1
                id="profile-setup-title"
                className="mt-4 font-display text-2xl font-extrabold tracking-tight text-ink-900"
              >
                Welcome to Campus Coin!
              </h1>
              <p className="mt-1.5 text-sm text-ink-500">
                Let&apos;s set up your profile so we can personalize your dashboard.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="setup-year"
                  className="mb-1.5 block text-sm font-semibold text-ink-900"
                >
                  Academic year
                </label>
                <div className="relative">
                  <Icon
                    name="graduation-cap"
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500"
                  />
                  <select
                    id="setup-year"
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
                  <label
                    htmlFor={field.id}
                    className="mb-1.5 block text-sm font-semibold text-ink-900"
                  >
                    {field.label}
                  </label>
                  <div className="relative">
                    <Icon
                      name={field.icon}
                      size={17}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500"
                    />
                    <span className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-500">
                      &#8358;
                    </span>
                    <input
                      id={field.id}
                      type="number"
                      min="0"
                      step="500"
                      inputMode="numeric"
                      placeholder="0"
                      value={amounts[field.key]}
                      onChange={(event) =>
                        setAmounts((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-surface py-2.5 pl-[4.75rem] pr-4 text-sm text-ink-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      disabled={busy}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-ink-500">
              All of this is optional. You can leave it blank and fill it in later.
            </p>

            {error && (
              <p className="mt-2 text-xs font-semibold text-red-500" role="alert">
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={skip}
                disabled={busy}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-ink-500 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Skip for now
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-800 disabled:opacity-60"
              >
                {busy && <SubmitSpinner />}
                Save and continue
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
