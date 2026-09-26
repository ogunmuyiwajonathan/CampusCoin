import { useState } from "react";
import BudgetCard from "../components/BudgetCard.jsx";
import BudgetForm from "../components/BudgetForm.jsx";
import Icon from "../components/Icon.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Sidebar from "../components/Sidebar.jsx";
import StatCard from "../components/StatCard.jsx";
import { useBudgets } from "../hooks/useBudgets.js";
import { useTransactions } from "../hooks/useTransactions.js";
import { categoryLookup } from "../data/mockData.js";
import { formatCurrency } from "../lib/formatCurrency.js";
import { currentMonthKey, monthKey, monthLabel, monthRange } from "../lib/formatMonth.js";

const SEVERITY = { exceeded: 0, near: 1, "on-track": 2 };

function shiftMonth(key, delta) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function BudgetSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading budgets…</span>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="animate-pulse rounded-card border border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-100" />
            <div className="flex-1">
              <div className="h-3.5 w-24 rounded bg-slate-100" />
              <div className="mt-2 h-3 w-16 rounded bg-slate-100" />
            </div>
          </div>
          <div className="mt-4 h-5 w-32 rounded bg-slate-100" />
          <div className="mt-3 h-2.5 w-full rounded-full bg-slate-100" />
          <div className="mt-2 h-3 w-24 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export default function Budgets() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [month, setMonth] = useState(currentMonthKey());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { status, items, error, add, update, remove } = useBudgets();
  const { items: transactions } = useTransactions();

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
      const statusFor = pct >= 100 ? "exceeded" : pct >= 80 ? "near" : "on-track";
      return { item, name, spent, pct, status: statusFor };
    })
    .sort((a, b) => SEVERITY[a.status] - SEVERITY[b.status] || a.name.localeCompare(b.name));

  const totalLimit = rows.reduce((sum, row) => sum + row.item.limit_amount, 0);
  const totalSpent = rows.reduce((sum, row) => sum + row.spent, 0);
  const remaining = totalLimit - totalSpent;
  const usagePct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
  const alerts = rows.filter((row) => row.status !== "on-track");
  const overCount = rows.filter((row) => row.status === "exceeded").length;

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row.item);
    setFormOpen(true);
  };

  const handleSave = (payload) => {
    if (editing) {
      update(editing.budget_id, payload);
    } else {
      add(payload);
    }
    if (payload.month !== month) setMonth(payload.month);
    closeForm();
  };

  const handleDelete = (budgetId) => {
    remove(budgetId);
    closeForm();
  };

  const statCards = (
    <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <StatCard
        label="Total Budgeted"
        value={formatCurrency(totalLimit)}
        icon="target"
        tone="blue"
        hint={monthLabel(month)}
        tint
      />
      <StatCard
        label="Spent So Far"
        value={formatCurrency(totalSpent)}
        icon="arrow-down"
        tone="coral"
        hint={`${usagePct}% of your budget`}
        tint
      />
      <StatCard
        label="Remaining"
        value={formatCurrency(remaining)}
        icon="wallet"
        tone="mint"
        hint={`${rows.length} ${rows.length === 1 ? "category" : "categories"} budgeted`}
        tint
      />
      <StatCard
        label="Over Limit"
        value={String(overCount)}
        icon="triangle-alert"
        tone="purple"
        hint={overCount > 0 ? "Needs your attention" : "All within limits"}
        tint
      />
    </section>
  );

  const alertBanner = alerts.length > 0 && (
    <section
      role="alert"
      className={`rounded-card border p-4 ${
        overCount > 0 ? "border-red-100 bg-red-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            overCount > 0 ? "bg-red-100 text-red-500" : "bg-amber-100 text-amber-600"
          }`}
        >
          <Icon name="triangle-alert" size={17} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink-900">
            {alerts.length} {alerts.length === 1 ? "budget needs" : "budgets need"} attention
          </p>
          <ul className="mt-1 space-y-0.5 text-sm text-ink-500">
            {alerts.map((row) => (
              <li key={row.item.budget_id} className="truncate">
                {row.status === "exceeded" ? (
                  <>
                    <span className="font-semibold text-ink-900">{row.name}</span> is{" "}
                    {formatCurrency(row.spent - row.item.limit_amount)} over its{" "}
                    {formatCurrency(row.item.limit_amount)} limit.
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-ink-900">{row.name}</span> is at{" "}
                    {row.pct}% of its {formatCurrency(row.item.limit_amount)} limit —{" "}
                    {formatCurrency(row.item.limit_amount - row.spent)} left.
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );

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
        className="mt-1 flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-600"
      >
        <Icon name="plus" size={16} />
        Add Budget
      </button>
    </div>
  );

  return (
    <div className="min-h-svh">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-60">
        <main className="mx-auto max-w-7xl space-y-5 px-4 py-5">
          <PageHeader onMenu={() => setSidebarOpen(true)} />

          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-900">
              Budgets
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              Set monthly limits per category and catch overspending early.
            </p>
          </div>

          {statCards}

          {alertBanner}

          <section className="rounded-card bg-surface shadow-card">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-5">
              <h2 className="font-display text-base font-bold tracking-tight text-ink-900">
                Monthly Budgets
              </h2>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-lg border border-slate-200 bg-surface">
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() => setMonth((key) => shiftMonth(key, -1))}
                    className="p-2 text-ink-500 transition hover:text-ink-900"
                  >
                    <Icon name="chevron-left" size={16} />
                  </button>
                  <span className="min-w-[130px] px-1 text-center text-sm font-bold tabular-nums text-ink-900">
                    {monthLabel(month)}
                  </span>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() => setMonth((key) => shiftMonth(key, 1))}
                    className="p-2 text-ink-500 transition hover:text-ink-900"
                  >
                    <Icon name="chevron-right" size={16} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={openAdd}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-600"
                >
                  <Icon name="plus" size={16} />
                  Add Budget
                </button>
              </div>
            </div>

            <p className="px-5 pt-3.5 text-xs text-ink-500">
              {rows.length} {rows.length === 1 ? "budget" : "budgets"} · {monthRange(month)}
            </p>

            {error && (
              <p
                className="mx-5 mt-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-500"
                role="alert"
              >
                {error}
              </p>
            )}

            {status === "loading" ? (
              <BudgetSkeleton />
            ) : rows.length === 0 ? (
              emptyState
            ) : (
              <div className="grid min-w-0 grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map((row) => (
                  <BudgetCard
                    key={row.item.budget_id}
                    name={row.name}
                    categoryId={row.item.category_id}
                    spent={row.spent}
                    limitAmount={row.item.limit_amount}
                    status={row.status}
                    pct={row.pct}
                    onEdit={() => openEdit(row)}
                  />
                ))}
              </div>
            )}
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
