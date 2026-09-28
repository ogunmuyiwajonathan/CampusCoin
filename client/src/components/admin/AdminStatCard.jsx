import Icon from "../Icon.jsx";

const TONES = {
  mint: "bg-emerald-100 text-emerald-600",
  gold: "bg-amber-100 text-amber-700",
};

export default function AdminStatCard({ label, value, icon, tone = "mint", hint }) {
  return (
    <div className="flex items-center gap-3 rounded-card bg-surface p-4 shadow-card sm:gap-3.5">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-11 sm:w-11 ${TONES[tone]}`}
      >
        <Icon name={icon} size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-500">{label}</p>
        <p className="truncate text-base font-bold tabular-nums text-ink-900 sm:text-lg">{value}</p>
        {hint && <p className="mt-0.5 truncate text-[11px] text-ink-500">{hint}</p>}
      </div>
    </div>
  );
}
