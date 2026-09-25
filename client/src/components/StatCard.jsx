import Icon from "./Icon.jsx";

const TONES = {
  mint: "bg-emerald-100 text-emerald-600",
  blue: "bg-blue-100 text-blue-600",
  coral: "bg-red-100 text-red-500",
  purple: "bg-purple-100 text-purple-600",
};

const TINTS = {
  mint: "bg-emerald-50",
  blue: "bg-sky-50",
  coral: "bg-red-50",
  purple: "bg-purple-50",
};

export default function StatCard({ label, value, icon, tone, hint, tint = false }) {
  return (
    <div
      className={`flex items-center gap-3.5 rounded-card p-4 shadow-card ${tint ? TINTS[tone] : "bg-surface"}`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${TONES[tone]}`}
      >
        <Icon name={icon} size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-ink-500">{label}</p>
        <p className="truncate text-lg font-bold tabular-nums text-ink-900">{value}</p>
        {hint && <p className="mt-0.5 truncate text-[11px] text-ink-500">{hint}</p>}
      </div>
    </div>
  );
}
