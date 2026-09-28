import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from "recharts";
import ChartTooltip from "./ChartTooltip.jsx";
import CategoryIcon from "./CategoryIcon.jsx";
import { formatCurrency } from "../lib/formatCurrency.js";

const CHART_SIZE = 176;

export default function SpendingDonut({
  breakdown,
  totalExpense,
  showAmount = false,
  stacked = false,
  emptyAction,
}) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const hasExpenses = breakdown.length > 0;

  return (
    <div className={`flex gap-4 ${stacked ? "flex-col items-center" : "flex-col sm:flex-row sm:items-center"}`}>
      <div className="relative h-44 w-44 shrink-0 self-center">
        {hasExpenses ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Pie
                data={breakdown}
                dataKey="amount"
                nameKey="name"
                innerRadius={58}
                outerRadius={82}
                paddingAngle={2}
                stroke="none"
                activeIndex={activeIndex}
                activeShape={(props) => (
                  <Sector {...props} outerRadius={(props.outerRadius ?? 82) + 6} />
                )}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(-1)}
              >
                {breakdown.map((entry) => (
                  <Cell key={entry.category_id} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                offset={0}
                cursor={false}
                wrapperStyle={{ left: 0, top: 0, zIndex: 20, pointerEvents: "none" }}
                content={<ChartTooltip bounds={{ width: CHART_SIZE, height: CHART_SIZE }} />}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <svg width="100%" height="100%" viewBox="0 0 176 176" role="presentation" aria-hidden="true">
            <circle cx="88" cy="88" r="70" fill="none" stroke="var(--color-slate-200)" strokeWidth="24" />
          </svg>
        )}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold tabular-nums text-ink-900">
            {formatCurrency(totalExpense)}
          </span>
          <span className="text-[11px] text-ink-500">Total Expenses</span>
        </div>
      </div>

      {hasExpenses ? (
        <ul className="flex w-full flex-1 flex-col gap-1.5">
          {breakdown.map((entry) => (
            <li key={entry.category_id} className="flex items-center gap-2 text-sm">
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: entry.color }}
                aria-hidden="true"
              >
                <CategoryIcon category={entry} size={12} />
              </span>
              <span className="min-w-0 flex-1 truncate text-ink-900">{entry.name}</span>
              {showAmount && (
                <span className="shrink-0 tabular-nums text-ink-500">
                  {formatCurrency(entry.amount)}
                </span>
              )}
              <span className="w-9 shrink-0 text-right tabular-nums text-ink-500">
                {entry.percentage}%
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm text-ink-500">Nothing spent yet.</p>
          {emptyAction}
        </div>
      )}
    </div>
  );
}
