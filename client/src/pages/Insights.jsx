import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BotAvatar from "../components/BotAvatar.jsx";
import Icon from "../components/Icon.jsx";
import AssistantFab from "../components/AssistantFab.jsx";
import MobileNav from "../components/MobileNav.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Sidebar from "../components/Sidebar.jsx";
import SpendingDonut from "../components/SpendingDonut.jsx";
import StatCard from "../components/StatCard.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useBudgets } from "../hooks/useBudgets.js";
import { useTransactions } from "../hooks/useTransactions.js";
import { mockUser } from "../data/mockData.js";
import {
  buildInsights,
  HISTORY_MONTHS,
  percentChange,
  WINDOW_MONTHS,
} from "../lib/insights.js";
import { formatCurrency } from "../lib/formatCurrency.js";
import {
  currentMonthKey,
  monthKey,
  monthLabel,
  monthRangeShort,
  shiftMonthKey,
} from "../lib/formatMonth.js";

const TONE_TEXT = {
  warn: "text-red-500",
  good: "text-brand-600",
  neutral: "",
};

const SERIES = [
  { key: "income", label: "Income", color: "#10b981" },
  { key: "expenses", label: "Expenses", color: "#3b82f6" },
];

// Long enough to read as real work, short enough not to feel laggy. The
// backend swap replaces this with the actual range request.
const RANGE_LOAD_MS = 320;

// Highlights the percentage inside a title/description without splitting the
// copy into fields, e.g. "Food spending increased by 28%".
function withAccent(text, accent, tone) {
  if (!accent || !text.includes(accent)) return text;
  const [before, ...rest] = text.split(accent);
  return (
    <>
      {before}
      <span className={`tabular-nums ${TONE_TEXT[tone] ?? ""}`}>{accent}</span>
      {rest.join(accent)}
    </>
  );
}

// Months with no activity get a 3px stub instead of vanishing, so a gap in the
// data reads as "nothing logged" rather than a missing bar.
function BarShape({ x, y, width, height, fill, fillOpacity }) {
  if (!height || height < 1) {
    return (
      <rect
        x={x}
        y={y - 3}
        width={width}
        height={3}
        rx={1.5}
        fill={fill}
        fillOpacity={(fillOpacity ?? 1) * 0.5}
      />
    );
  }
  return (
    <rect x={x} y={y} width={width} height={height} rx={6} ry={6} fill={fill} fillOpacity={fillOpacity} />
  );
}

function SeriesTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-surface px-3 py-2 shadow-card">
      <p className="text-xs font-bold text-ink-900">{label}</p>
      <ul className="mt-1 space-y-0.5">
        {payload.map((entry) => (
          <li
            key={entry.dataKey}
            className="flex items-center gap-1.5 text-xs tabular-nums text-ink-500"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="flex-1">{entry.name}</span>
            <span className="font-bold text-ink-900">{formatCurrency(entry.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InsightRow({ item }) {
  return (
    <li>
      <Link
        to={item.to}
        className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition hover:bg-slate-50"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${item.color}1A`, color: item.color }}
        >
          <Icon name={item.icon} size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-ink-900">
            {withAccent(item.title, item.accent, item.tone)}
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
            {withAccent(item.description, item.accent, item.tone)}
          </span>
        </span>
        <Icon name="chevron-right" size={16} className="shrink-0 text-ink-500" />
      </Link>
    </li>
  );
}

function InsightsSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading insights…</span>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="h-24 animate-pulse rounded-card bg-surface shadow-card" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="h-80 animate-pulse rounded-card bg-surface shadow-card lg:col-span-3" />
        <div className="h-80 animate-pulse rounded-card bg-surface shadow-card lg:col-span-2" />
        <div className="h-72 animate-pulse rounded-card bg-surface shadow-card lg:col-span-3" />
        <div className="h-72 animate-pulse rounded-card bg-surface shadow-card lg:col-span-2" />
      </div>
    </div>
  );
}

export default function Insights() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [focus, setFocus] = useState("expenses");

  const { user } = useAuth();
  const { status, items, error: txError } = useTransactions();
  const { items: budgetItems, error: budgetError } = useBudgets();

  const availableMonths = useMemo(
    () => [...new Set(items.map((item) => monthKey(item.date)))].sort().reverse(),
    [items],
  );
  const [month, setMonth] = useState(() => {
    const now = currentMonthKey();
    return availableMonths.includes(now) ? now : (availableMonths[0] ?? now);
  });
  const [rangeStatus, setRangeStatus] = useState("ready");

  // The window travels through real history and stops at the current month.
  const now = currentMonthKey();
  const canGoBack = month > shiftMonthKey(now, -HISTORY_MONTHS);
  const canGoForward = month < now;

  const goToMonth = (next) => {
    if (next === month) return;
    setRangeStatus("loading");
    setMonth(next);
  };

  const stepWindow = (delta) => goToMonth(shiftMonthKey(month, delta));

  // Stands in for the range request the backend will make; it drives the same
  // status field the transactions hook uses, so the skeleton is already wired.
  useEffect(() => {
    if (rangeStatus !== "loading") return undefined;
    const timer = setTimeout(() => setRangeStatus("ready"), RANGE_LOAD_MS);
    return () => clearTimeout(timer);
  }, [rangeStatus, month]);

  // Months with transactions, plus wherever the arrows have moved the window.
  const monthOptions = useMemo(() => {
    const keys = new Set(availableMonths);
    keys.add(month);
    return [...keys].sort().reverse();
  }, [availableMonths, month]);

  const goal = user?.monthly_savings_goal ?? mockUser.monthly_savings_goal ?? 0;
  const error = [txError, budgetError].filter(Boolean).join(" ") || null;

  const view = useMemo(
    () => buildInsights({ items, month, budgets: budgetItems, goal }),
    [items, month, budgetItems, goal],
  );

  const { totals, prevTotals, prev, hasPrev, saved, prevSaved, breakdown, series } = view;
  const rangeLabel = monthRangeShort(series[0].key, series[series.length - 1].key);
  const savedChange = hasPrev ? percentChange(saved, prevSaved) : null;
  const expenseChange = percentChange(totals.expense, prevTotals.expense);
  const goalPct = goal > 0 ? Math.round((saved / goal) * 100) : null;

  const savedHint = !hasPrev ? (
    `No activity in ${monthLabel(prev)}`
  ) : savedChange === null ? (
    `vs ${formatCurrency(prevSaved)} last month`
  ) : (
    <>
      <Icon
        name={savedChange >= 0 ? "trending-up" : "trending-down"}
        size={12}
        className={`mr-1 inline -translate-y-px ${savedChange >= 0 ? "text-brand-600" : "text-red-500"}`}
      />
      <span className={`font-semibold ${savedChange >= 0 ? "text-brand-600" : "text-red-500"}`}>
        {savedChange > 0 ? "+" : ""}
        {savedChange}%
      </span>{" "}
      compared to last month
    </>
  );

  const spendingHint = !hasPrev ? (
    `No activity in ${monthLabel(prev)}`
  ) : expenseChange === null ? (
    `vs ${formatCurrency(prevTotals.expense)} last month`
  ) : (
    <>
      <Icon
        name={expenseChange <= 0 ? "trending-down" : "trending-up"}
        size={12}
        className={`mr-1 inline -translate-y-px ${expenseChange <= 0 ? "text-brand-600" : "text-red-500"}`}
      />
      <span className={`font-semibold ${expenseChange <= 0 ? "text-brand-600" : "text-red-500"}`}>
        {expenseChange > 0 ? "+" : ""}
        {expenseChange}%
      </span>{" "}
      compared to last month
    </>
  );

  return (
    <div className="min-h-svh">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <MobileNav />
      <AssistantFab />

      <div className="lg:pl-60">
        <main className="mx-auto max-w-7xl space-y-4 px-4 pb-24 pt-5 md:pb-5">
          <PageHeader onMenu={() => setSidebarOpen(true)} />

          <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
            <div className="flex w-full min-w-0 items-center gap-3.5 sm:w-auto sm:flex-1">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Icon name="lightbulb" size={26} />
              </span>
              <div className="min-w-0">
                <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
                  Insights
                </h1>
                <p className="mt-1 text-sm text-ink-500">
                  Smart insights to help you spend better, save more, and reach your goals.
                </p>
              </div>
            </div>
            <div className="relative w-full sm:w-auto">
              <Icon
                name="calendar"
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500"
              />
              <select
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                aria-label="Select insights month"
                className="appearance-none rounded-xl border border-slate-200 bg-surface py-2.5 pl-10 pr-9 text-sm font-semibold text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {monthOptions.map((key) => (
                  <option key={key} value={key}>
                    {monthLabel(key)}
                  </option>
                ))}
              </select>
              <Icon
                name="chevron-down"
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-500"
              />
            </div>
          </div>

          {error && (
            <p
              className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-500"
              role="alert"
            >
              {error}
            </p>
          )}

          {status === "loading" ? (
            <InsightsSkeleton />
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-card bg-surface px-5 py-14 text-center shadow-card">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Icon name="chart-column" size={24} />
              </span>
              <div>
                <p className="font-display text-base font-bold text-ink-900">No insights yet</p>
                <p className="mt-1 text-sm text-ink-500">
                  Log your first transaction to unlock monthly insights.
                </p>
              </div>
              <Link
                to="/transactions"
                className="mt-1 flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-600"
              >
                <Icon name="plus" size={16} />
                Add Transaction
              </Link>
            </div>
          ) : (
            <>
              <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <StatCard
                  label="Total Saved This Month"
                  value={formatCurrency(saved)}
                  icon="wallet"
                  tone="mint"
                  hint={savedHint}
                  tint
                />
                <StatCard
                  label="Total Spending"
                  value={formatCurrency(totals.expense)}
                  icon="database"
                  tone="blue"
                  hint={spendingHint}
                  tint
                />
                <StatCard
                  label="Monthly Spending Trend"
                  value={expenseChange === null ? "—" : `${expenseChange > 0 ? "+" : ""}${expenseChange}%`}
                  icon="trending-up"
                  tone="purple"
                  hint={
                    expenseChange === null
                      ? `No spending in ${monthLabel(prev)}`
                      : `${expenseChange >= 0 ? "higher" : "lower"} than last month`
                  }
                  tint
                />
                <StatCard
                  label="Savings Goal Progress"
                  value={goalPct === null ? "—" : `${goalPct}%`}
                  icon="target"
                  tone="amber"
                  hint={
                    goalPct === null
                      ? "No savings goal set"
                      : `${formatCurrency(saved)} / ${formatCurrency(goal)}`
                  }
                  progress={goalPct ?? undefined}
                  tint
                />
              </section>

              <div className="grid gap-4 lg:grid-cols-5">
                <section className="min-w-0 rounded-card bg-surface p-5 shadow-card lg:col-span-3">
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Icon name="chart-column" size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-base font-bold tracking-tight text-ink-900">
                        Spending Overview
                      </h2>
                      <p className="text-xs text-ink-500">
                        {rangeLabel} · income and expenses, last {WINDOW_MONTHS} months.
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <div
                        className="flex items-center gap-1"
                        role="group"
                        aria-label="Move the chart window"
                      >
                        {[
                          { delta: -1, label: "Earlier months", icon: "chevron-left", enabled: canGoBack },
                          { delta: 1, label: "Later months", icon: "chevron-right", enabled: canGoForward },
                        ].map((step) => (
                          <button
                            key={step.delta}
                            type="button"
                            onClick={() => stepWindow(step.delta)}
                            disabled={!step.enabled || rangeStatus === "loading"}
                            aria-label={step.label}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-surface text-ink-900 transition hover:border-brand-500 hover:text-brand-600 disabled:cursor-not-allowed disabled:border-slate-200/70 disabled:text-ink-500/40 disabled:hover:border-slate-200/70"
                          >
                            <Icon name={step.icon} size={16} />
                          </button>
                        ))}
                      </div>
                      <div
                        className="flex rounded-xl bg-slate-100 p-1"
                        role="group"
                        aria-label="Highlight chart series"
                      >
                        {SERIES.map((entry) => (
                          <button
                            key={entry.key}
                            type="button"
                            onClick={() => setFocus(entry.key)}
                            aria-pressed={focus === entry.key}
                            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                              focus === entry.key
                                ? "bg-brand-500 text-white"
                                : "text-ink-500 hover:text-ink-900"
                            }`}
                          >
                            {entry.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {rangeStatus === "loading" ? (
                    <div
                      className="flex h-64 w-full items-center justify-center rounded-xl bg-slate-100/60"
                      role="status"
                      aria-busy="true"
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-ink-500">
                        <Icon name="clock" size={16} className="animate-pulse" />
                        Loading {monthLabel(shiftMonthKey(month, -WINDOW_MONTHS + 1))} –{" "}
                        {monthLabel(month)}…
                      </span>
                    </div>
                  ) : (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={series} margin={{ top: 5, right: 8, bottom: 0, left: -12 }} barGap={6}>
                          <CartesianGrid
                            vertical={false}
                            strokeDasharray="3 3"
                            stroke="var(--color-slate-200)"
                          />
                          <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 12, fill: "var(--color-ink-500)" }}
                          />
                          <YAxis
                            width={44}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11, fill: "var(--color-ink-500)" }}
                            tickFormatter={(value) => (value >= 1000 ? `${value / 1000}k` : value)}
                          />
                          <Tooltip
                            cursor={{ fill: "var(--color-slate-100)" }}
                            content={<SeriesTooltip />}
                          />
                          {SERIES.map((entry) => (
                            <Bar
                              key={entry.key}
                              dataKey={entry.key}
                              name={entry.label}
                              fill={entry.color}
                              fillOpacity={focus === entry.key ? 1 : 0.3}
                              radius={[6, 6, 0, 0]}
                              maxBarSize={26}
                              isAnimationActive={false}
                              shape={BarShape}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-5 text-xs text-ink-500">
                    {SERIES.map((entry) => (
                      <span key={entry.key} className="flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: entry.color }}
                          aria-hidden="true"
                        />
                        {entry.label}
                      </span>
                    ))}
                  </div>
                </section>

                <section className="rounded-card bg-surface p-5 shadow-card lg:col-span-2">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                      <Icon name="lightbulb" size={17} />
                    </span>
                    <h2 className="min-w-0 flex-1 font-display text-base font-bold tracking-tight text-ink-900">
                      Key Insights
                    </h2>
                    <Link
                      to="/assistant"
                      className="shrink-0 text-xs font-semibold text-brand-600 hover:underline"
                    >
                      View All
                    </Link>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {view.keyInsights.map((item) => (
                      <InsightRow key={item.id} item={item} />
                    ))}
                  </ul>
                </section>

                <div className="grid gap-4 md:grid-cols-2 lg:col-span-3">
                  <section className="rounded-card bg-surface p-5 shadow-card">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-emerald-600">
                        <Icon name="chart-pie" size={17} />
                      </span>
                      <h2 className="min-w-0 flex-1 font-display text-base font-bold tracking-tight text-ink-900">
                        Spending by Category
                      </h2>
                    </div>
                    <p className="mb-3 text-xs text-ink-500">
                      How your expenses are distributed this month.
                    </p>
                    {breakdown.length === 0 ? (
                      <p className="py-10 text-center text-sm text-ink-500">
                        No expenses logged for {monthLabel(month)} yet.
                      </p>
                    ) : (
                      <SpendingDonut
                        breakdown={breakdown}
                        totalExpense={totals.expense}
                        showAmount
                        stacked
                      />
                    )}
                  </section>

                  <section className="rounded-card bg-surface p-5 shadow-card">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <Icon name="sparkles" size={17} />
                      </span>
                      <h2 className="min-w-0 flex-1 font-display text-base font-bold tracking-tight text-ink-900">
                        Recent Insights
                      </h2>
                      <Link
                        to="/transactions"
                        className="shrink-0 text-xs font-semibold text-brand-600 hover:underline"
                      >
                        View All
                      </Link>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {view.recentInsights.map((item) => (
                        <InsightRow key={item.id} item={item} />
                      ))}
                    </ul>
                  </section>
                </div>

                <section className="relative overflow-hidden rounded-card bg-emerald-50 p-5 shadow-card dark:bg-emerald-500/10 lg:col-span-2">
                  <div className="flex items-center gap-2.5">
                    <BotAvatar className="h-9 w-9" animate={false} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-base font-bold tracking-tight text-ink-900">
                          AI Assistant
                        </h2>
                        <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">
                          Beta
                        </span>
                      </div>
                      <p className="text-xs text-ink-500">
                        Get personalized tips based on your spending.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-end gap-3">
                    <p className="min-w-0 flex-1 rounded-xl bg-surface p-4 text-sm leading-relaxed text-ink-900 shadow-card">
                      {view.tipText}
                    </p>
                    <BotAvatar className="hidden h-24 w-24 shrink-0 sm:block" />
                  </div>

                  <Link
                    to="/assistant"
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-600"
                  >
                    <Icon name="message-square" size={17} />
                    Chat with Rix
                  </Link>
                </section>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
