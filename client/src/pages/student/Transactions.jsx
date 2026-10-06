import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "../../components/Icon.jsx";
import CategoryIcon from "../../components/CategoryIcon.jsx";
import AssistantFab from "../../components/AssistantFab.jsx";
import MobileNav from "../../components/MobileNav.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import Sidebar from "../../components/Sidebar.jsx";
import StatCard from "../../components/StatCard.jsx";
import TransactionForm from "../../components/TransactionForm.jsx";
import CsvImportDialog from "../../components/CsvImportDialog.jsx";
import DeletedTransactionsDialog from "../../components/DeletedTransactionsDialog.jsx";
import SubmitSpinner from "../../components/SubmitSpinner.jsx";
import { useTransactions } from "../../hooks/useTransactions.js";
import { useSummary } from "../../hooks/useSummary.js";
import { useSubmitLock } from "../../hooks/useSubmitLock.js";
import { duplicateIds } from "../../lib/duplicates.js";
import { categoryColor, categoryLookup } from "../../data/mockData.js";
import { formatCurrency } from "../../lib/formatCurrency.js";
import {
  currentMonthKey,
  formatDate,
  formatDayMonth,
  monthKey,
  monthLabel,
  monthOptions,
  monthRange,
} from "../../lib/formatMonth.js";

const ALL = "all";
const MONTH_RANGE = 12;

/**
 * The client-side half of the same match the dropdown used: description,
 * category name, date text, and the amount as typed digits (so "2,500" and
 * "2500" both find 2500.50).
 */
function matchesSearch(item, query, categoryName = "") {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const digits = needle.replace(/[,\s]/g, "");
  const amount = String(item.amount ?? "");
  return (
    String(item.description ?? "").toLowerCase().includes(needle) ||
    categoryName.toLowerCase().includes(needle) ||
    String(item.date ?? "").includes(needle) ||
    (digits !== "" && /^\d+(\.\d+)?$/.test(digits) && amount.startsWith(digits))
  );
}

function TableSkeleton() {
  return (
    <div
      className="flex flex-col gap-3.5 px-5 py-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading transactionsÃ¢â‚¬Â¦</span>
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

function ConfirmDeleteButton({ onConfirm, onCancel }) {
  const { locked, done, run, minWidth, measure } = useSubmitLock();
  const [error, setError] = useState("");

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-ink-500">Delete?</span>
      <button
        type="button"
        ref={measure}
        disabled={locked}
        aria-busy={locked}
        style={minWidth ? { minWidth } : undefined}
        onClick={async () => {
          if (locked) return;
          setError("");
          try {
            await run(async () => {
              const result = await onConfirm();
              if (result && result.ok === false) {
                throw new Error(result.error ?? "Couldn't delete that transaction.");
              }
            }, { oneShot: true });
          } catch (err) {
            setError(err.message);
          }
        }}
        className="flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {locked && <SubmitSpinner className="h-3 w-3" />}
        {locked ? "Deleting..." : done ? "Deleted" : "Delete"}
      </button>
      {!locked && (
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-ink-500 transition hover:bg-slate-50"
        >
          Cancel
        </button>
      )}
      {error && (
        <span className="text-xs font-semibold text-red-500" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export default function Transactions() {
  // The header typeahead hands over ?q= (text to match), ?id= (one row),
  // ?category= (one category), ?month= (which month to show) and ?new=1 /
  // ?import=1 (open a dialog straight away). Reading them before the state
  // below means the page lands already filtered, with no second render.
  const [params, setParams] = useSearchParams();
  const query = (params.get("q") ?? "").trim();
  const focusId = params.get("id");
  const focusCategory = params.get("category");
  const monthParam = params.get("month");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [monthFilter, setMonthFilter] = useState(() =>
    monthParam ? (monthParam === "all" ? ALL : monthParam) : currentMonthKey(),
  );
  const [formOpen, setFormOpen] = useState(() => params.get("new") === "1");
  const [editing, setEditing] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [importOpen, setImportOpen] = useState(() => params.get("import") === "1");
  const [deletedOpen, setDeletedOpen] = useState(false);

  // Searching again while already here changes ?month=, and the month the
  // student is looking at has to follow it. Adjusting during render is React's
  // supported way to reset state when an input changes - an effect would show
  // the wrong month for a frame.
  const [seenMonthParam, setSeenMonthParam] = useState(monthParam);
  if (monthParam !== seenMonthParam) {
    setSeenMonthParam(monthParam);
    if (monthParam) setMonthFilter(monthParam === "all" ? ALL : monthParam);
  }


  // "All months" is sent as null so the parameter is left off the request; the
  // server then returns every row instead of rejecting `?month=all` with a 400.
  const {
    status,
    items,
    error,
    add: addTx,
    update: updateTx,
    remove: removeTx,
    refresh: refreshRows,
  } = useTransactions(monthFilter === ALL ? null : monthFilter);

  // The four cards above the table are server totals for the same period. They
  // are deliberately not summed from `items`, which will be paginated.
  const {
    status: summaryStatus,
    summary,
    error: summaryError,
    refresh: refreshSummary,
  } = useSummary(monthFilter === ALL ? null : monthFilter);

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

  // Built from the calendar, not from whatever rows happen to be loaded, so the
  // picker is the same for everyone and an empty month is still selectable.
  const uniqueMonths = monthOptions(MONTH_RANGE);
  const lookup = categoryLookup();

  const periodItems =
    monthFilter === ALL ? items : items.filter((item) => monthKey(item.date) === monthFilter);

  const rows = periodItems
    .filter((item) => typeFilter === ALL || item.type === typeFilter)
    // The same text the dropdown searched for, applied again on arrival so
    // "See all results" shows every hit rather than the whole month. `id` and
    // `category` narrow it further when a single row or category was clicked.
    .filter((item) =>
      focusId
        ? item.transaction_id === focusId
        : matchesSearch(item, query, lookup[item.category_id]?.name ?? ""),
    )
    .filter((item) =>
      focusCategory && focusCategory !== "all" ? item.category_id === focusCategory : true,
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  const flagged = duplicateIds(rows);

  const totals = summary?.totals ?? { income: 0, expense: 0, net: 0, count: 0 };
  const balance = totals.net;
  const top = summary?.breakdown?.[0] ?? null;
  const totalsReady = summaryStatus === "ready";
  const periodHint = monthFilter === ALL ? "All time" : monthLabel(monthFilter);
  const searchActive = Boolean(query || focusId || (focusCategory && focusCategory !== "all"));

  // A write changes both the row list and the month totals, so both go back to
  // the server. Nothing on this page recomputes a total from what it is holding.
  const commit = (result) => {
    refreshSummary();
    return result;
  };
  const add = (payload) => addTx(payload).then(commit);
  const update = (id, payload) => updateTx(id, payload).then(commit);
  const remove = (id) => removeTx(id).then(commit);
  const refresh = () => {
    refreshRows();
    refreshSummary();
  };

  const listError = [error, summaryError].filter(Boolean).join(" ") || null;

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleSave = async (payload) => {
    const result = editing
      ? await update(editing.transaction_id, payload)
      : await add(payload);
    if (!result?.ok) throw new Error(result?.error ?? "Couldn't save that transaction.");
    if (!editing && monthFilter !== ALL && monthFilter !== monthKey(payload.date)) {
      setMonthFilter(monthKey(payload.date));
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
    // The search parameters go too, otherwise the text filter would keep
    // hiding rows and `Clear filters` would look like it did nothing.
    if (searchActive) setParams(new URLSearchParams(), { replace: true });
  };

  const statCards = (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Total Income"
        value={totalsReady ? formatCurrency(totals.income) : "\u2014"}
        icon="arrow-up"
        tone="mint"
        hint={periodHint}
        tint
      />
      <StatCard
        label="Total Spending"
        value={totalsReady ? formatCurrency(totals.expense) : "\u2014"}
        icon="arrow-down"
        tone="coral"
        hint={periodHint}
        tint
      />
      <StatCard
        label="Remaining Balance"
        value={totalsReady ? formatCurrency(balance) : "\u2014"}
        icon="wallet"
        tone="blue"
        hint={periodHint}
        tint
      />
      <StatCard
        label="Top Spending Category"
        value={totalsReady && top ? top.name : "\u2014"}
        icon="chart-column"
        tone="purple"
        hint={
          totalsReady && top ? `${top.percentage}% of total spending` : "No spending yet"
        }
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
          className="mt-1 flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-800"
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
            {searchActive ? "Nothing matches that search" : "No transactions match these filters"}
          </p>
          <p className="mt-1 text-sm text-ink-500">
            {searchActive
              ? "Clear the search to see everything again."
              : "Try a different month or transaction type."}
          </p>
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
      <MobileNav />
      <AssistantFab />

      <div className="lg:pl-60">
        <main className="mx-auto max-w-7xl space-y-5 px-4 pb-24 pt-5 md:pb-5">
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
                  className="flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-800"
                >
                  <Icon name="plus" size={16} />
                  Add Transaction
                </button>

                <button
                  type="button"
                  onClick={() => setImportOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-ink-500 transition hover:bg-slate-50"
                >
                  <Icon name="upload" size={16} />
                  Import CSV
                </button>

                <button
                  type="button"
                  onClick={() => setDeletedOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-ink-500 transition hover:bg-slate-50"
                >
                  <Icon name="history" size={16} />
                  Deleted
                </button>
              </div>
            </div>

            <p className="px-5 pt-3.5 text-xs text-ink-500">
              {rows.length} {rows.length === 1 ? "transaction" : "transactions"} ·{" "}
              {monthFilter === ALL ? "All time" : monthRange(monthFilter)}
            </p>

            {listError && (
              <p
                className="mx-5 mt-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-500"
                role="alert"
              >
                {listError}
              </p>
            )}

            {status === "loading" ? (
              <TableSkeleton />
            ) : rows.length === 0 ? (
              emptyState
            ) : (
              <div className="overflow-x-auto px-5 py-4">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="text-xs text-ink-500">
                      <th scope="col" className="px-2 py-2.5 font-semibold sm:px-3">
                        Date
                      </th>
                      <th scope="col" className="hidden px-3 py-2.5 font-semibold md:table-cell">
                        Type
                      </th>
                      <th scope="col" className="hidden px-3 py-2.5 font-semibold md:table-cell">
                        Category
                      </th>
                      <th scope="col" className="px-2 py-2.5 font-semibold sm:px-3">
                        Description
                      </th>
                      <th scope="col" className="px-2 py-2.5 text-right font-semibold sm:px-3">
                        Amount
                      </th>
                      <th scope="col" className="px-2 py-2.5 text-right font-semibold sm:px-3">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((item) => {
                      const category = lookup[item.category_id];
                      const name = category?.name ?? "Others";
                      const color = categoryColor(item.category_id);
                      const isIncome = item.type === "income";
                      return (
                        <tr key={item.transaction_id} className="transition hover:bg-slate-50/70">
                          <td className="whitespace-nowrap px-2 py-3 text-sm tabular-nums text-ink-500 sm:px-3">
                            <span className="sm:hidden">{formatDayMonth(item.date)}</span>
                            <span className="hidden sm:inline">{formatDate(item.date)}</span>
                            {item.is_recurring && (
                              <span
                                className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600"
                                aria-label="Recurring transaction"
                              >
                                <Icon name="repeat" size={10} />
                                <span className="hidden sm:inline">Recurring</span>
                              </span>
                            )}
                          </td>
                          <td className="hidden px-3 py-3 md:table-cell">
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
                                <CategoryIcon category={category} size={13} />
                              </span>
                              <span className="min-w-0 max-w-[130px] truncate">{name}</span>
                            </span>
                          </td>
                          <td className="max-w-[108px] px-2 py-3 sm:max-w-none sm:px-3">
                            <p className="line-clamp-2 text-sm font-semibold text-ink-900">
                              {item.description || name}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-ink-500 md:hidden">
                              {isIncome ? "Income" : "Expense"} · {name}
                            </p>
                            {flagged.has(item.transaction_id) && (
                              <span
                                className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700"
                                title="Same amount, category and date within three days of another entry"
                              >
                                <Icon name="triangle-alert" size={10} />
                                Possible duplicate
                              </span>
                            )}
                          </td>
                          <td
                            className={`whitespace-nowrap px-2 py-3 text-right text-sm font-bold tabular-nums sm:px-3 ${
                              isIncome ? "text-brand-600" : "text-red-500"
                            }`}
                          >
                            {isIncome ? "+" : "-"}
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="px-2 py-3 sm:px-3" data-row-actions>
                            <div className="relative flex justify-end">
                              {confirmId === item.transaction_id ? (
                                <ConfirmDeleteButton
                                  onConfirm={() => remove(item.transaction_id)}
                                  onCancel={() => setConfirmId(null)}
                                />
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

      {importOpen && (
        <CsvImportDialog
          onClose={() => setImportOpen(false)}
          onImported={refresh}
        />
      )}

      {deletedOpen && (
        <DeletedTransactionsDialog
          onClose={() => setDeletedOpen(false)}
          onRestored={refresh}
        />
      )}
    </div>
  );
}
