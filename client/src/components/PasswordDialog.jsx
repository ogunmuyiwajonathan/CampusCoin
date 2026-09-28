import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import SubmitSpinner from "./SubmitSpinner.jsx";
import { useSubmitLock } from "../hooks/useSubmitLock.js";
import { changePassword } from "../lib/apiClient.js";

// The same rule the server enforces, so the student is told what is wrong
// before a round trip. The server still has the final say.
function describeWeakness(value) {
  if (value.length < 8) return "Use at least 8 characters.";
  if (!/[a-z]/.test(value)) return "Add a lowercase letter.";
  if (!/[A-Z]/.test(value)) return "Add an uppercase letter.";
  if (!/\d/.test(value)) return "Add a number.";
  return "";
}

function Field({ id, label, value, onChange, placeholder, type, autoComplete, onToggle, toggleLabel }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink-900">
        {label}
      </label>
      <div className="relative">
        <Icon
          name={type === "password" && id.includes("current") ? "lock" : "shield"}
          size={17}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500"
        />
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-slate-200 bg-surface py-2.5 pl-11 text-sm text-ink-900 placeholder:text-ink-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
            onToggle ? "pr-11" : "pr-4"
          }`}
        />
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={toggleLabel}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 transition hover:text-ink-900"
          >
            <Icon name={toggleLabel === "Hide password" ? "eye-off" : "eye"} size={17} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function PasswordDialog({ onClose, onSaved }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
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

    if (!currentPassword) {
      setError("Enter your current password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Those two new passwords don't match.");
      return;
    }
    const weakness = describeWeakness(newPassword);
    if (weakness) {
      setError(weakness);
      return;
    }

    try {
      await run(async () => {
        await changePassword({ currentPassword, newPassword });
      });
      onSaved();
    } catch (err) {
      setError(err.message || "Couldn't change your password.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Change password"
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
            Change Password
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-ink-500 transition hover:bg-slate-50 hover:text-ink-900 disabled:opacity-50"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <p className="mt-1.5 text-sm text-ink-500">
          Every other signed-in device is signed out once your password changes.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          <Field
            id="current-password"
            label="Current Password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            value={currentPassword}
            onChange={setCurrentPassword}
            placeholder="Enter your current password"
            onToggle={() => setShow((visible) => !visible)}
            toggleLabel={show ? "Hide password" : "Show password"}
          />

          <Field
            id="new-password"
            label="New Password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="At least 8 characters"
          />

          <Field
            id="confirm-password"
            label="Confirm New Password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Repeat your new password"
          />

          <p className="text-xs leading-relaxed text-ink-500">
            Use 8 or more characters with a lowercase letter, an uppercase letter and a number.
          </p>
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
            {saving ? "Saving..." : done ? "Saved" : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}
