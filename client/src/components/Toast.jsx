import Icon from "./Icon.jsx";

// Small confirmation for things that have no page of their own (profile save,
// avatar upload). Settings owns the timer; this is the presentation only.
export default function Toast({ toast, onClose }) {
  if (!toast) return null;
  const isError = toast.kind === "error";

  return (
    <div className="fixed bottom-20 right-4 z-[60] w-[min(320px,calc(100vw-2rem))] md:bottom-5">
      <div
        role="status"
        aria-live="polite"
        className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-card ${
          isError
            ? "border-red-100 bg-red-50 text-red-500"
            : "border-emerald-100 bg-emerald-50 text-emerald-700"
        }`}
      >
        <Icon name={isError ? "triangle-alert" : "check"} size={17} className="mt-0.5 shrink-0" />
        <p className="min-w-0 flex-1 text-sm font-semibold">{toast.message}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="shrink-0 rounded p-0.5 transition hover:opacity-70"
        >
          <Icon name="x" size={15} />
        </button>
      </div>
    </div>
  );
}
