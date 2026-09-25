import Icon from "./Icon.jsx";

const TONES = {
  mint: "bg-emerald-100 text-emerald-600",
  blue: "bg-blue-100 text-blue-600",
  coral: "bg-red-100 text-red-500",
  purple: "bg-purple-100 text-purple-600",
};

export default function StatCard({ label, value, icon, tone }) {
  return (
    <div className="flex items-center gap-3.5 rounded-card bg-white p-4 shadow-card">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${TONES[tone]}`}>
        <Icon name={icon} size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-ink-500">{label}</p>
        <p className="truncate text-lg font-bold tabular-nums text-ink-900">{value}</p>
      </div>
    </div>
  );
}
