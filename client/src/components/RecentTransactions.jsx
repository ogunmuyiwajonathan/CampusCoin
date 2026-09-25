import { Link } from "react-router-dom";
import Icon from "./Icon.jsx";
import { formatCurrency } from "../lib/formatCurrency.js";

function relativeDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  const days = Math.round((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

export default function RecentTransactions({ items }) {
  return (
    <div className="rounded-card bg-surface p-5 shadow-card">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="font-display text-base font-bold tracking-tight text-ink-900">Recent Transactions</h2>
        <Link to="/transactions" className="text-sm font-semibold text-brand-600 hover:underline">
          View All
        </Link>
      </div>

      <ul className="flex flex-col divide-y divide-slate-100">
        {items.map((t) => (
          <li key={t.transaction_id} className="flex items-center gap-3 py-2.5">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${
                t.type === "income" ? "bg-brand-500" : ""
              }`}
              style={t.type === "expense" ? { backgroundColor: t.color } : undefined}
            >
              <Icon name={t.icon} size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-900">{t.description}</p>
              <p className="truncate text-xs text-ink-500">
                {relativeDate(t.date)} · {t.category_name}
              </p>
            </div>
            <span
              className={`shrink-0 text-sm font-bold tabular-nums ${
                t.type === "income" ? "text-brand-600" : "text-red-500"
              }`}
            >
              {t.type === "income" ? "+" : "-"}
              {formatCurrency(t.amount)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
