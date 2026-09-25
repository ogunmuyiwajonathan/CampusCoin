import { useEffect, useState } from "react";
import Icon from "../components/Icon.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Sidebar from "../components/Sidebar.jsx";
import StatCard from "../components/StatCard.jsx";
import TransactionForm from "../components/TransactionForm.jsx";
import { useTransactions } from "../hooks/useTransactions.js";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  categoryLookup,
  computeTotals,
  expenseBreakdown,
} from "../data/mockData.js";
import { formatCurrency } from "../lib/formatCurrency.js";
import {
  currentMonthKey,
  formatDate,
  monthKey,
  monthLabel,
  monthRange,
} from "../lib/formatMonth.js";

const ALL = "all";

function TableSkeleton() {
  return (
    <div
      className="flex flex-col gap-3.5 px-5 py-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading transactions…</span>
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex animate-pulse items-center gap-4">
          <div className="h-4 w-24 rounded bg-slate-100" />
          <div className="hidden h-4 w-16 rounded bg-slate-100 sm:block" />
          <div className="h-4 flex-1 rounded bg-slate-100" />
          <div className="h-4 w-20 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export default function Transactions() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [monthFilter, setMonthFilter] = useState(currentMonthKey());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const { status, items, error, add, update, remove } = useTransactions();

  useEffect(() => {
    if (menuId === null && confirmId === null) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") {
        setMenuId(null);
        setConfirmId(null);
      }
    };
    const onClick = (event) => {
      if (!event.target.closest("[data-row-actions]")) {
        setMenuId(null);
        setConfirmId(null);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [menuId, confirmId]);

  const uniqueMonths = [
    ...new Set([...items.map((item) => monthKey(item.date)), currentMonthKey()]),
  ]
    .sort()
    .reverse();

  const periodItems =
    monthFilter === ALL ? items : items.filter((item) => monthKey(item.date) === monthFilter);

  const rows = periodItems
    .filter((item) => typeFilter === ALL || item.type === typeFilter)
    .sort((a, b) => b.date.localeCompare(a.date));

  const totals = computeTotals(periodItems);
  const balance = totals.income - totals.expense;
  const top = expenseBreakdown(periodItems)[0] ?? null;
  const lookup = categoryLookup();
  const periodHint = monthFilter === ALL ? "All time" : monthLabel(monthFilter);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleSave = (payload) => {
    if (editing) {
      update(editing.transaction_id, payload);
    } else {
      add(payload);
      if (monthFilter !== ALL && monthFilter !== monthKey(payload.date)) {
        setMonthFilter(monthKey(payload.date));
      }
    }
    if (typeFilter !== ALL && typeFilter !== payload.type) setTypeFilter(ALL);
    setMenuId(null);
    setConfirmId(null);
    setFormOpen(false);
    setEditing(null);
  };

  const clearFilters = () => {
    setTypeFilter(ALL);
    setMonthFilter(ALL);
  };

  const statCards = (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Total Income"
        value={formatCurrency(totals.income)}
        icon="arrow-up"
        tone="mint"
        hint={periodHint}
        tint
      />
      <StatCard
        label="Total Spending"
        value={formatCurrency(totals.expense)}
        icon="arrow-down"
        tone="coral"
        hint={periodHint}
        tint
      />
      <StatCard
        label="Remaining Balance"
        value={formatCurrency(balance)}
        icon="wallet"
        tone="blue"
        hint={periodHint}
        tint
      />
      <StatCard
        label="Top Spending Category"
        value={top ? top.name : "—"}
        icon="chart-column"
        tone="purple"
        hint={top ? `${top.percentage}% of total spending` : "No spending yet"}
        tint
      />
    </section>
  );

  const emptyState =
    items.length === 0 ? (
      <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Icon name="arrow-left-right" size={24} />
        </span>
        <div>
          <p className="font-display text-base font-bold text-ink-900">No transactions yet</p>
          <p className="mt-1 text-sm text-ink-500">
            Add your first income or expense to see it here.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="mt-1 flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-600"
        >
          <Icon name="plus" size={16} />
          Add Transaction
        </button>
      </div>
    ) : (
      <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Icon name="filter" size={24} />
        </span>
        <div>
          <p className="font-display text-base font-bold text-ink-900">
            No transactions match these filters
          </p>
          <p className="mt-1 text-sm text-ink-500">Try a different month or transaction type.</p>
        </div>
        <button
          type="button"
          onClick={clearFilters}
          className="mt-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-ink-500 transition hover:bg-slate-50"
        >
          Clear filters
        </button>
      </div>
    );

  return (
    <div className="min-h-svh">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="md:pl-60">
        <main className="mx-auto max-w-7xl space-y-5 px-4 py-5">
          <PageHeader onMenu={() => setSidebarOpen(true)} />

          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-900">
              Transactions
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              Track your income and expenses. Stay in control of your money!
            </p>
          </div>

          {statCards}

          <section className="rounded-card bg-surface shadow-card">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-5">
              <h2 className="font-display text-base font-bold tracking-tight text-ink-900">
                Recent Transactions
              </h2>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Icon
                    name="filter"
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
                  />
                  <select
                    aria-label="Filter by type"
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                    className="appearance-none rounded-lg border border-slate-200 bg-surface py-2 pl-8 pr-8 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value={ALL}>All types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                  <Icon
                    name="chevron-down"
                    size={14}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-500"
                  />
                </div>

                <div className="relative">
                  <Icon
                    name="calendar"
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
                  />
                  <select
                    aria-label="Filter by month"
                    value={monthFilter}
                    onChange={(event) => setMonthFilter(event.target.value)}
                    className="appearance-none rounded-lg border border-slate-200 bg-surface py-2 pl-8 pr-8 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value={ALL}>All months</option>
                    {uniqueMonths.map((key) => (
                      <option key={key} value={key}>
                        {monthLabel(key)}
                      </option>
                    ))}
                  </select>
                  <Icon
                    name="chevron-down"
                    size={14}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={openAdd}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-600"
                >
                  <Icon name="plus" size={16} />
                  Add Transaction
                </button>
              </div>
            </div>

            <p className="px-5 pt-3.5 text-xs text-ink-500">
              {rows.length} {rows.length === 1 ? "transaction" : "transactions"} ·{" "}
              {monthFilter === ALL ? "All time" : monthRange(monthFilter)}
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
              <TableSkeleton />
            ) : rows.length === 0 ? (
              emptyState
            ) : (
              <div className="px-5 py-4">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="text-xs text-ink-500">
                      <th scope="col" className="px-3 py-2.5 font-semibold">
                        Date
                      </th>
                      <th scope="col" className="hidden px-3 py-2.5 font-semibold sm:table-cell">
                        Type
                      </th>
                      <th scope="col" className="hidden px-3 py-2.5 font-semibold md:table-cell">
                        Category
                      </th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">
                        Description
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                        Amount
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((item) => {
                      const category = lookup[item.category_id];
                      const name = category?.name ?? "Others";
                      const icon = CATEGORY_ICONS[name] ?? "ellipsis";
                      const color = CATEGORY_COLORS[item.category_id] ?? "#64748b";
                      const isIncome = item.type === "income";
                      return (
                        <tr key={item.transaction_id} className="transition hover:bg-slate-50/70">
                          <td className="whitespace-nowrap px-3 py-3 text-sm tabular-nums text-ink-500">
                            {formatDate(item.date)}
                            {item.is_recurring && (
                              <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">
                                <Icon name="repeat" size={10} />
                                Recurring
                              </span>
                            )}
                          </td>
                          <td className="hidden px-3 py-3 sm:table-cell">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                isIncome ? "bg-emerald-100 text-brand-600" : "bg-red-100 text-red-500"
                              }`}
                            >
                              {isIncome ? "Income" : "Expense"}
                            </span>
                          </td>
                          <td className="hidden px-3 py-3 md:table-cell">
                            <span className="flex items-center gap-2 text-sm text-ink-900">
                              <span
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
                                style={{ backgroundColor: color }}
                              >
                                <Icon name={icon} size={13} />
                              </span>
                              {name}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <p className="text-sm font-semibold text-ink-900">
                              {item.description || name}
                            </p>
                            <p className="mt-0.5 text-xs text-ink-500 sm:hidden">
                              {formatDate(item.date)} · {isIncome ? "Income" : "Expense"} · {name}
                            </p>
                          </td>
                          <td
                            className={`whitespace-nowrap px-3 py-3 text-right text-sm font-bold tabular-nums ${
                              isIncome ? "text-brand-600" : "text-red-500"
                            }`}
                          >
                            {isIncome ? "+" : "-"}
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="px-3 py-3" data-row-actions>
                            <div className="relative flex justify-end">
                              {confirmId === item.transaction_id ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-ink-500">Delete?</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      remove(item.transaction_id);
                                      setConfirmId(null);
                                    }}
                                    className="rounded-lg bg-red-500 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-red-600"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmId(null)}
                                    className="rounded-lg px-2 py-1 text-xs font-semibold text-ink-500 transition hover:bg-slate-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    aria-label={`Actions for ${item.description || name}`}
                                    aria-haspopup="menu"
                                    aria-expanded={menuId === item.transaction_id}
                                    onClick={() =>
                                      setMenuId(
                                        menuId === item.transaction_id ? null : item.transaction_id,
                                      )
                                    }
                                    className="rounded-lg p-1.5 text-ink-500 transition hover:bg-slate-100 hover:text-ink-900"
                                  >
                                    <Icon name="ellipsis" size={18} />
                                  </button>
                                  {menuId === item.transaction_id && (
                                    <div
                                      role="menu"
                                      className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-lg border border-slate-200 bg-surface py-1 shadow-card"
                                    >
                                      <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => {
                                          setMenuId(null);
                                          setEditing(item);
                                          setFormOpen(true);
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink-900 transition hover:bg-slate-50"
                                      >
                                        <Icon name="pencil" size={14} />
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => {
                                          setMenuId(null);
                                          setConfirmId(item.transaction_id);
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 transition hover:bg-red-50"
                                      >
                                        <Icon name="trash-2" size={14} />
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>

      {formOpen && (
        <TransactionForm
          initial={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
