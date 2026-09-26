import Icon from "./Icon.jsx";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "../data/mockData.js";
import { formatCurrency } from "../lib/formatCurrency.js";

const STATUS = {
  exceeded: {
    label: "Over limit",
    bar: "bg-red-500",
    pill: "bg-red-100 text-red-500",
  },
  near: {
    label: "Near limit",
    bar: "bg-amber-500",
    pill: "bg-amber-100 text-amber-600",
  },
  "on-track": {
    label: "On track",
    bar: "bg-brand-500",
    pill: "bg-emerald-100 text-emerald-700",
  },
};

export default function BudgetCard({
  name,
  categoryId,
  spent,
  limitAmount,
  status,
  pct,
  onEdit,
}) {
  const info = STATUS[status] ?? STATUS["on-track"];
  const icon = CATEGORY_ICONS[name] ?? "ellipsis";
  const color = CATEGORY_COLORS[categoryId] ?? "#64748b";
  const remaining = limitAmount - spent;

  return (
    <article className="min-w-0 rounded-card bg-surface p-5 shadow-card">
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: color }}
        >
          <Icon name={icon} size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold text-ink-900">{name}</p>
          <p className="truncate text-xs text-ink-500">{formatCurrency(limitAmount)} limit</p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${name} budget`}
          className="shrink-0 rounded-lg p-2 text-ink-500 transition hover:bg-slate-50 hover:text-ink-900"
        >
          <Icon name="pencil" size={15} />
        </button>
      </div>

      <div className="mt-4 flex items-end justify-between gap-2">
        <p className="min-w-0">
          <span className="text-lg font-extrabold tabular-nums text-ink-900">
            {formatCurrency(spent)}
          </span>
          <span className="ml-1.5 text-xs text-ink-500">spent</span>
        </p>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${info.pill}`}
        >
          {info.label}
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={Math.min(pct, 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${name} budget usage`}
        className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className={`h-full rounded-full ${info.bar}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <p
          className={`truncate font-semibold ${remaining < 0 ? "text-red-500" : "text-ink-500"}`}
        >
          {remaining < 0
            ? `${formatCurrency(Math.abs(remaining))} over`
            : `${formatCurrency(remaining)} left`}
        </p>
        <p className="shrink-0 font-bold tabular-nums text-ink-500">{pct}%</p>
      </div>
    </article>
  );
}
