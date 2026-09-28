import { useState, useEffect } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Icon from "../../components/Icon.jsx";
import AdminStatCard from "../../components/admin/AdminStatCard.jsx";
import { categoryColor } from "../../data/mockData.js";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function lastSixMonths() {
  const now = new Date();
  const out = [];
  for (let back = 5; back >= 0; back -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    out.push({ key, label: MONTH_LABELS[d.getUTCMonth()] });
  }
  return out;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const requestStats = async () => {
    const res = await fetch("/api/admin/stats");
    if (!res.ok) throw new Error("Failed to load stats");
    return res.json();
  };

  const load = async () => {
    try {
      setLoading(true);
      setStats(await requestStats());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    requestStats()
      .then((data) => {
        if (cancelled) return;
        setStats(data);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-card bg-surface shadow-card" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-72 animate-pulse rounded-card bg-surface shadow-card lg:col-span-2" />
          <div className="h-72 animate-pulse rounded-card bg-surface shadow-card" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-card border border-red-200 bg-red-50 p-6 text-center text-red-900">
        <Icon name="alert-circle" size={32} className="mx-auto mb-2 text-red-500" />
        <p className="font-semibold">{error}</p>
        <button
          onClick={() => load()}
          className="mt-4 rounded-lg bg-red-100 px-4 py-2 font-medium hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  const months = lastSixMonths();
  const byMonth = new Map(
    (stats.transactionsPerMonth || []).map((m) => [m._id, m.count]),
  );
  const chartData = months.map((m) => ({
    label: m.label,
    count: byMonth.get(m.key) ?? 0,
  }));
  const thisMonth = byMonth.get(months[months.length - 1].key) ?? 0;
  const hasAny = chartData.some((m) => m.count > 0);
  const topCount = (stats.mostUsedCategories || []).reduce(
    (max, c) => Math.max(max, c.count),
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-ink-500">System-wide overview</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AdminStatCard label="Total Students" value={stats.totalUsers ?? 0} icon="users" tone="mint" />
        <AdminStatCard label="Active Students" value={stats.activeUsers ?? 0} icon="user-check" tone="mint" />
        <AdminStatCard label="Total Transactions" value={stats.totalTransactions ?? 0} icon="arrow-left-right" tone="gold" />
        <AdminStatCard label="Transactions this month" value={thisMonth} icon="calendar-days" tone="gold" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-card bg-surface p-5 shadow-card lg:col-span-2">
          <h2 className="mb-4 font-display text-base font-bold tracking-tight text-ink-900">
            Transactions per Month
          </h2>
          {!hasAny ? (
            <div className="flex h-48 items-center justify-center text-sm text-ink-500">
              No transaction data in the last 6 months.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-200)" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--color-ink-500)" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--color-ink-500)" }} />
                <Tooltip
                  cursor={{ fill: "var(--color-mint-50)" }}
                  contentStyle={{
                    borderRadius: "0.5rem",
                    border: "1px solid var(--color-slate-200)",
                    fontSize: 13,
                    backgroundColor: "var(--color-surface)",
                  }}
                  formatter={(v) => [v, "Transactions"]}
                />
                <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-card bg-surface p-5 shadow-card">
          <h2 className="mb-4 font-display text-base font-bold tracking-tight text-ink-900">
            Top Categories
          </h2>
          {!stats.mostUsedCategories?.length ? (
            <p className="text-sm text-ink-500">No data yet.</p>
          ) : (
            <ol className="space-y-3">
              {stats.mostUsedCategories.map((cat) => (
                <li key={cat._id} className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: categoryColor(cat._id) }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">
                      {cat.name}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-ink-500">
                      {cat.count}
                    </span>
                  </div>
                  <div className="mt-1.5 ml-[18px] h-1.5 w-[calc(100%-18px)] overflow-hidden rounded-full bg-slate-200/70">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${topCount ? (cat.count / topCount) * 100 : 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
