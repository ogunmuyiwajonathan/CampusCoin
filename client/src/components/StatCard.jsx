import Icon from "./Icon.jsx";

const TONES = {
  mint: "bg-emerald-100 text-emerald-600",
  blue: "bg-blue-100 text-blue-600",
  coral: "bg-red-100 text-red-500",
  purple: "bg-purple-100 text-purple-600",
  amber: "bg-amber-100 text-amber-600",
};

const TINTS = {
  mint: "bg-emerald-50",
  blue: "bg-sky-50",
  coral: "bg-red-50",
  purple: "bg-purple-50",
  amber: "bg-amber-50",
};

export default function StatCard({ label, value, icon, tone, hint, tint = false, progress }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-card p-4 shadow-card sm:gap-3.5 ${tint ? TINTS[tone] : "bg-surface"}`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-11 sm:w-11 ${TONES[tone]}`}
      >
        <Icon name={icon} size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-500">{label}</p>
        <p className="truncate text-base font-bold tabular-nums text-ink-900 sm:text-lg">{value}</p>
        {hint && <p className="mt-0.5 truncate text-[11px] text-ink-500">{hint}</p>}
        {typeof progress === "number" && (
          <div
            className="mt-2 h-2 w-full min-w-[72px] overflow-hidden rounded-full bg-slate-200/70"
            role="progressbar"
            aria-valuenow={Math.min(Math.max(Math.round(progress), 0), 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${label} progress`}
          >
            <div
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
