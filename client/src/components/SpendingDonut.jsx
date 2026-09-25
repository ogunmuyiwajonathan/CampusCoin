import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "../lib/formatCurrency.js";

export default function SpendingDonut({ breakdown, totalExpense }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative h-44 w-44 shrink-0 self-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={breakdown}
              dataKey="amount"
              nameKey="name"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={2}
              stroke="none"
            >
              {breakdown.map((entry) => (
                <Cell key={entry.category_id} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(value)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-ink-900">{formatCurrency(totalExpense)}</span>
          <span className="text-[11px] text-ink-500">Total Expenses</span>
        </div>
      </div>

      <ul className="flex flex-1 flex-col gap-1.5">
        {breakdown.map((entry) => (
          <li key={entry.category_id} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="flex-1 truncate text-ink-900">{entry.name}</span>
            <span className="text-ink-500">{entry.percentage}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
