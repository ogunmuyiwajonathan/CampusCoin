import { useState } from "react";
import { Link } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import BudgetForm from "../../components/BudgetForm.jsx";
import Icon from "../../components/Icon.jsx";
import AssistantFab from "../../components/AssistantFab.jsx";
import MobileNav from "../../components/MobileNav.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import Sidebar from "../../components/Sidebar.jsx";
import StatCard from "../../components/StatCard.jsx";
import CategoryIcon from "../../components/CategoryIcon.jsx";
import { useBudgets } from "../../hooks/useBudgets.js";
import { useSubmitLock } from "../../hooks/useSubmitLock.js";
import SubmitSpinner from "../../components/SubmitSpinner.jsx";
import { useTransactions } from "../../hooks/useTransactions.js";
import {
  categories,
  categoryColor,
  categoryLookup,
} from "../../data/mockData.js";
import { formatCurrency } from "../../lib/formatCurrency.js";
import { currentMonthKey, monthKey, monthLabel, monthRange } from "../../lib/formatMonth.js";

function statusFor(pct) {
  if (pct >= 100) return "exceeded";
  if (pct >= 95) return "near";
  return "on-track";
}

const STATUS_META = {
  "on-track": { label: "On Track", pill: "bg-emerald-100 text-brand-600", bar: "bg-brand-500" },
  near: { label: "Near Limit", pill: "bg-amber-100 text-amber-700", bar: "bg-amber-400" },
  exceeded: { label: "Over", pill: "bg-red-100 text-red-500", bar: "bg-red-500" },
};

const CATEGORY_ORDER = new Map(categories.map((category, index) => [category.category_id, index]));

function BudgetDonut({ spent, limit }) {
  const safeLimit = Math.max(limit, 0);
  const clampedSpent = Math.min(Math.max(spent, 0), safeLimit);
  const remaining = Math.max(safeLimit - clampedSpent, 0);
  const pct = safeLimit > 0 ? Math.round((clampedSpent / safeLimit) * 100) : 0;

  return (
    <div className="relative h-40 w-40 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pie
            data={[
              { name: "Spent", amount: clampedSpent },
              { name: "Remaining", amount: remaining },
            ]}
            dataKey="amount"
            nameKey="name"
            innerRadius={56}
            outerRadius={74}
            paddingAngle={2}
            stroke="none"
            isAnimationActive={false}
          >
            <Cell fill="#10b981" />
            <Cell fill="#e2e8f0" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold tabular-nums text-ink-900">{pct}%</span>
        <span className="text-[11px] text-ink-500">Used</span>
      </div>
    </div>
  );
}

function RowSkeleton() {
  return (
    <ul className="divide-y divide-slate-100" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading budgets…</span>
      {Array.from({ length: 4 }, (_, index) => (
        <li key={index} className="flex animate-pulse items-center gap-4 px-5 py-4">
          <div className="h-11 w-11 shrink-0 rounded-full bg-slate-100" />
          <div className="min-w-0 flex-1">
            <div className="h-3.5 w-24 rounded bg-slate-100" />
            <div className="mt-2 h-3 w-32 rounded bg-slate-100" />
          </div>
          <div className="hidden h-2.5 min-w-[180px] flex-[2] rounded-full bg-slate-100 sm:block" />
          <div className="h-6 w-16 rounded-full bg-slate-100" />
        </li>
      ))}
    </ul>
  );
}

const QUICK_ACTIONS = [
  {
    to: "/insights",
    icon: "file-text",
    title: "View Reports",
    subtitle: "See detailed spending reports",
  },
  {
    to: "/transactions",
    icon: "plus",
    title: "Add Transaction",
    subtitle: "Log income or expense",
  },
  {
    to: "/transactions",
    icon: "settings",
    title: "Manage Categories",
    subtitle: "Edit your spending categories",
  },
];

function MenuDeleteButton({ onConfirm, onCancel }) {
  const { locked, done, run, minWidth, measure } = useSubmitLock();
  const [error, setError] = useState("");

  return (
    <>
      <button
        type="button"
        role="menuitem"
        ref={measure}
        disabled={locked}
        aria-busy={locked}
        style={minWidth ? { minWidth } : undefined}
        onClick={async () => {
          if (locked) return;
          setError("");
          try {
            await run(onConfirm, { oneShot: true });
          } catch (err) {
            setError(err.message);
          }
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {locked ? <SubmitSpinner className="h-3.5 w-3.5" /> : <Icon name="trash-2" size={15} />}
        {locked ? "Deleting..." : done ? "Deleted" : "Confirm delete"}
      </button>
      {error && (
        <p className="px-3 py-1 text-xs font-semibold text-red-500" role="alert">
          {error}
        </p>
      )}
      {!locked && (
        <button
          type="button"
          role="menuitem"
          onClick={onCancel}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-500 transition hover:bg-slate-50"
        >
          <Icon name="x" size={15} />
          Cancel
        </button>
      )}
    </>
  );
}

export default function Budgets() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const { status, items, error, add, update, remove } = useBudgets();
  const { items: transactions } = useTransactions();

  const availableMonths = [...new Set(items.map((item) => item.month))].sort().reverse();
  const [month, setMonth] = useState(() => {
    const now = currentMonthKey();
    return availableMonths.includes(now) ? now : (availableMonths[0] ?? now);
  });

  const lookup = categoryLookup();
  const spentByCategory = transactions.reduce((acc, item) => {
    if (item.type === "expense" && monthKey(item.date) === month) {
      acc[item.category_id] = (acc[item.category_id] ?? 0) + item.amount;
    }
    return acc;
  }, {});

  const rows = items
    .filter((item) => item.month === month)
    .map((item) => {
      const name = lookup[item.category_id]?.name ?? "Others";
      const spent = spentByCategory[item.category_id] ?? 0;
      const pct = item.limit_amount > 0 ? Math.round((spent / item.limit_amount) * 100) : 0;
      return {
        item,
        name,
        spent,
        pct,
        status: statusFor(pct),
        color: categoryColor(item.category_id),
      };
    })
    .sort(
      (a, b) =>
        (CATEGORY_ORDER.get(a.item.category_id) ?? Number.MAX_SAFE_INTEGER) -
          (CATEGORY_ORDER.get(b.item.category_id) ?? Number.MAX_SAFE_INTEGER) ||
        a.name.localeCompare(b.name),
    );

  const totalLimit = rows.reduce((sum, row) => sum + row.item.limit_amount, 0);
  const totalSpent = rows.reduce((sum, row) => sum + row.spent, 0);
  const remaining = totalLimit - totalSpent;
  const usagePct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  const alerts = [];
  for (const row of rows.filter((row) => row.status === "exceeded")) {
    alerts.push({ row, kind: "exceeded" });
  }
  for (const row of rows.filter((row) => row.status === "near")) {
    alerts.push({ row, kind: "near" });
  }
  if (alerts.length < 3) {
    const calm = rows
      .filter((row) => row.status === "on-track")
      .sort((a, b) => b.pct - a.pct);
    for (const row of calm) {
      if (alerts.length >= 3) break;
      alerts.push({ row, kind: row.pct >= 90 ? "watch" : "ok" });
    }
  }
  const visibleAlerts = alerts.slice(0, 3);

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const openAdd = () => {
    setEditing(null);
    setMenuId(null);
    setConfirmDeleteId(null);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row.item);
    setMenuId(null);
    setConfirmDeleteId(null);
    setFormOpen(true);
  };

  const handleSave = async (payload) => {
    const result = editing
      ? await update(editing.budget_id, payload)
      : await add(payload);
    if (!result?.ok) throw new Error(result?.error ?? "Couldn't save that budget.");
    if (payload.month !== month) setMonth(payload.month);
    closeForm();
  };

  const handleDelete = async (budgetId) => {
    const result = await remove(budgetId);
    if (!result?.ok) throw new Error(result?.error ?? "Couldn't delete that budget.");
    setMenuId(null);
    setConfirmDeleteId(null);
    closeForm();
  };

  const closeMenu = () => {
    setMenuId(null);
    setConfirmDeleteId(null);
  };

  const emptyState = (
    <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <Icon name="target" size={24} />
      </span>
      <div>
        <p className="font-display text-base font-bold text-ink-900">
          {items.length === 0 ? "No budgets yet" : `No budgets for ${monthLabel(month)}`}
        </p>
        <p className="mt-1 text-sm text-ink-500">
          {items.length === 0
            ? "Set spending limits for your categories and track them here."
            : "Add a limit for a category to start tracking this month."}
        </p>
      </div>
      <button
        type="button"
        onClick={openAdd}
        className="mt-1 flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-800"
      >
        <Icon name="plus" size={16} />
        Set New Budget
      </button>
    </div>
  );

  return (
    <div className="min-h-svh">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <MobileNav />
      <AssistantFab />

      <div className="lg:pl-60">
        <main className="mx-auto max-w-7xl space-y-4 px-4 pb-24 pt-5 md:pb-5">
          <PageHeader onMenu={() => setSidebarOpen(true)} />

          <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
                <div className="flex w-full min-w-0 items-center gap-3.5 sm:w-auto sm:flex-1">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Icon name="wallet" size={26} />
                  </span>
                  <div className="min-w-0">
                    <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
                      Budgets
                    </h1>
                    <p className="mt-1 text-sm text-ink-500">
                      Set limits, track your progress, and stay in control.
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
                    aria-label="Select budget month"
                    className="appearance-none rounded-xl border border-slate-200 bg-surface py-2.5 pl-10 pr-9 text-sm font-semibold text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    {(availableMonths.length > 0 ? availableMonths : [month]).map((key) => (
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
                <button
                  type="button"
                  onClick={openAdd}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white shadow-card transition hover:bg-brand-800 sm:w-auto"
                >
                  <Icon name="plus" size={17} />
                  Set New Budget
                </button>
              </div>

              <section className="flex items-start gap-2.5 rounded-card bg-emerald-50 p-4 dark:bg-emerald-500/10">
                <Icon name="lightbulb" size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                <p className="text-sm text-ink-900">
                  <span className="font-bold">Tip:</span> You&apos;re doing great! Keep
                  tracking your spending to stay within your goals.
                </p>
              </section>

              <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <StatCard label="Total Budget" value={formatCurrency(totalLimit)} icon="wallet" tone="mint" tint />
                <StatCard label="Total Spent" value={formatCurrency(totalSpent)} icon="arrow-down" tone="blue" tint />
                <StatCard label="Remaining" value={formatCurrency(remaining)} icon="piggy-bank" tone="mint" tint />
                <StatCard label="Overall Progress" value={`${usagePct}%`} icon="chart-column" tone="purple" tint />
              </section>

              {error && (
                <p
                  className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-500"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <section>
                <h2 className="font-display text-lg font-extrabold tracking-tight text-ink-900">
                  Category Budgets
                </h2>
                <p className="mt-0.5 text-sm text-ink-500">
                  Manage your monthly limits for each category.{" "}
                  <span className="tabular-nums">{monthRange(month)}</span>
                </p>

                <div className="mt-3 rounded-card bg-surface shadow-card">
                  {status === "loading" ? (
                    <RowSkeleton />
                  ) : rows.length === 0 ? (
                    emptyState
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {rows.map((row) => {
                        const meta = STATUS_META[row.status];
                        const menuOpen = menuId === row.item.budget_id;
                        const confirming = confirmDeleteId === row.item.budget_id;
                        return (
                          <li
                            key={row.item.budget_id}
                            className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4"
                          >
                            <span
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                              style={{ backgroundColor: `${row.color}1A`, color: row.color }}
                              aria-hidden="true"
                            >
                              <CategoryIcon category={row} size={20} />
                            </span>
                            <div className="min-w-0 flex-1 basis-44">
                              <p className="truncate text-sm font-bold text-ink-900">{row.name}</p>
                              <p className="mt-0.5 truncate text-xs tabular-nums text-ink-500">
                                {formatCurrency(row.item.limit_amount)}{" "}
                                <span className="mx-0.5">/</span> {formatCurrency(row.spent)}{" "}
                                spent
                              </p>
                            </div>
                            <div className="flex min-w-[180px] flex-[2] items-center gap-3">
                              <div
                                className="h-2.5 min-w-0 flex-1 rounded-full bg-slate-200/70"
                                role="progressbar"
                                aria-valuenow={Math.min(row.pct, 100)}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`${row.name} budget usage`}
                              >
                                <div
                                  className={`h-full rounded-full ${meta.bar}`}
                                  style={{ width: `${Math.min(row.pct, 100)}%` }}
                                />
                              </div>
                              <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-ink-500">
                                {row.pct}%
                              </span>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${meta.pill}`}
                            >
                              {meta.label}
                            </span>
                            <div className="relative shrink-0">
                              <button
                                type="button"
                                aria-label={`Actions for ${row.name} budget`}
                                aria-haspopup="menu"
                                aria-expanded={menuOpen}
                                onClick={() => (menuOpen ? closeMenu() : (setMenuId(row.item.budget_id), setConfirmDeleteId(null)))}
                                className="rounded-lg p-1.5 text-ink-500 transition hover:bg-slate-100 hover:text-ink-900"
                              >
                                <Icon name="ellipsis" size={18} />
                              </button>
                              {menuOpen && (
                                <div
                                  role="menu"
                                  className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-lg border border-slate-200 bg-surface py-1 shadow-card"
                                >
                                  {confirming ? (
                                    <MenuDeleteButton
                                      onConfirm={() => handleDelete(row.item.budget_id)}
                                      onCancel={closeMenu}
                                    />
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => openEdit(row)}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-900 transition hover:bg-slate-50"
                                      >
                                        <Icon name="pencil" size={15} />
                                        Edit budget
                                      </button>
                                      <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => setConfirmDeleteId(row.item.budget_id)}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-500 transition hover:bg-red-50"
                                      >
                                        <Icon name="trash-2" size={15} />
                                        Delete budget
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <section className="rounded-card bg-surface p-5 shadow-card">
                <h2 className="font-display text-base font-bold tracking-tight text-ink-900">
                  Monthly Budget Summary
                </h2>
                <div className="mt-3 flex items-center gap-4">
                  <BudgetDonut spent={totalSpent} limit={totalLimit} />
                  <dl className="min-w-0 flex-1 space-y-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                      <dt className="min-w-0 flex-1 truncate text-ink-500">Spent</dt>
                      <dd className="font-bold tabular-nums text-ink-900">
                        {formatCurrency(totalSpent)}
                      </dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-200" aria-hidden="true" />
                      <dt className="min-w-0 flex-1 truncate text-ink-500">Remaining</dt>
                      <dd className="font-bold tabular-nums text-ink-900">
                        {formatCurrency(Math.max(remaining, 0))}
                      </dd>
                    </div>
                    <div className="flex items-center gap-2 border-t border-slate-100 pt-2.5">
                      <dt className="min-w-0 flex-1 truncate font-semibold text-ink-900">Total</dt>
                      <dd className="font-bold tabular-nums text-ink-900">
                        {formatCurrency(totalLimit)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </section>

              <section className="rounded-card bg-surface p-5 shadow-card">
                <div className="mb-2 flex items-center gap-2">
                  <Icon name="bell" size={17} className="text-ink-900" />
                  <h2 className="flex-1 font-display text-base font-bold tracking-tight text-ink-900">
                    Budget Alerts
                  </h2>
                  <Link to="/transactions" className="text-xs font-semibold text-brand-600 hover:underline">
                    View All
                  </Link>
                </div>
                {visibleAlerts.length === 0 ? (
                  <p className="py-2 text-sm text-ink-500">
                    No budgets for {monthLabel(month)} yet — set one to get alerts here.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {visibleAlerts.map(({ row, kind }) => {
                      const chip =
                        kind === "exceeded"
                          ? "bg-red-100 text-red-500"
                          : kind === "near"
                            ? "bg-amber-100 text-amber-600"
                            : kind === "watch"
                              ? "bg-sky-100 text-blue-600"
                              : "bg-emerald-100 text-brand-600";
                      const icon =
                        kind === "exceeded" || kind === "near"
                          ? "triangle-alert"
                          : kind === "watch"
                            ? "info"
                            : "check";
                      const highlight = kind === "ok" ? "" : "text-red-500";
                      const sub =
                        kind === "exceeded"
                          ? `${formatCurrency(row.spent - row.item.limit_amount)} over your ${formatCurrency(row.item.limit_amount)} limit.`
                          : kind === "near"
                            ? "You're almost at your monthly limit."
                            : kind === "watch"
                              ? "Consider reducing non-essential spending."
                              : "You're within your budget for this category.";
                      return (
                        <li key={row.item.budget_id}>
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="flex w-full items-center gap-3 py-3 text-left"
                          >
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${chip}`}>
                              <Icon name={icon} size={17} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm text-ink-900">
                                <span className="font-bold">{row.name}</span>{" "}
                                {kind === "ok" ? (
                                  <span>is on track</span>
                                ) : (
                                  <span>
                                    is <span className={`font-bold tabular-nums ${highlight}`}>{row.pct}%</span>
                                  </span>
                                )}
                              </span>
                              <span className="block truncate text-xs text-ink-500">{sub}</span>
                            </span>
                            <Icon name="chevron-right" size={16} className="shrink-0 text-ink-500" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="rounded-card bg-surface p-5 shadow-card">
                <div className="mb-1 flex items-center gap-2">
                  <Icon name="chart-column" size={17} className="text-ink-900" />
                  <h2 className="font-display text-base font-bold tracking-tight text-ink-900">
                    Quick Actions
                  </h2>
                </div>
                <ul className="divide-y divide-slate-100">
                  {QUICK_ACTIONS.map((action) => (
                    <li key={`${action.to}-${action.title}`}>
                      <Link
                        to={action.to}
                        className="flex items-center gap-3 rounded-lg py-3 transition hover:bg-slate-50"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                          <Icon name={action.icon} size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-ink-900">
                            {action.title}
                          </span>
                          <span className="block truncate text-xs text-ink-500">
                            {action.subtitle}
                          </span>
                        </span>
                        <Icon name="chevron-right" size={16} className="shrink-0 text-ink-500" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="flex items-center gap-3 rounded-card bg-emerald-50 p-4 dark:bg-emerald-500/10">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Icon name="piggy-bank" size={22} />
                </span>
                <p className="font-['Segoe_Script','Comic_Sans_MS',cursive] text-lg font-bold leading-snug text-emerald-700">
                  Small steps
                  <br />
                  lead to big goals
                </p>
                <Icon name="arrow-down-right" size={28} className="ml-auto shrink-0 rotate-12 text-emerald-600" />
              </section>
        </main>
      </div>

      {formOpen && (
        <BudgetForm
          initial={editing}
          month={month}
          budgets={items}
          onClose={closeForm}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
