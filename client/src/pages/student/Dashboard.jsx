import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../../components/Icon.jsx";
import campusboy from "../../assets/campusboy.webp";
import AssistantFab from "../../components/AssistantFab.jsx";
import MobileNav from "../../components/MobileNav.jsx";
import { INLINE_AI_VISIBLE_CLASS } from "../../components/AssistantFab.jsx";
import Sidebar from "../../components/Sidebar.jsx";
import StatCard from "../../components/StatCard.jsx";
import SpendingDonut from "../../components/SpendingDonut.jsx";
import RecentTransactions from "../../components/RecentTransactions.jsx";
import AIAssistantCard from "../../components/AIAssistantCard.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import ProfileSetupOverlay from "../../components/ProfileSetupOverlay.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import {
  CATEGORY_ICONS,
  categoryColor,
  categoryLookup,
  computeTotals,
  expenseBreakdown,
} from "../../data/mockData.js";
import { useBudgets } from "../../hooks/useBudgets.js";
import { useRecentlyViewed } from "../../hooks/useRecentlyViewed.js";
import TipsPanel from "../../components/TipsPanel.jsx";
import { useTransactions } from "../../hooks/useTransactions.js";
import { currentMonthKey, formatDate, monthLabel } from "../../lib/formatMonth.js";
import { formatCurrency } from "../../lib/formatCurrency.js";

const AddTransactionLink = () => (
  <Link
    to="/transactions"
    className="rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"
  >
    Add a transaction
  </Link>
);

const CardTitle = ({ children, action }) => (
  <div className="mb-3 flex items-center justify-between gap-3">
    <h2 className="font-display text-base font-bold tracking-tight text-ink-900">{children}</h2>
    {action}
  </div>
);

const RetryButton = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="mt-3 rounded-lg bg-brand-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-800"
  >
    Try again
  </button>
);

function DashboardSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading dashboard...</span>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="flex animate-pulse items-center gap-3 rounded-card bg-surface p-4 shadow-card"
          >
            <div className="h-10 w-10 rounded-full bg-slate-100" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-20 rounded bg-slate-100" />
              <div className="h-4 w-28 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-44 animate-pulse rounded-card bg-surface shadow-card" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[0, 1].map((index) => (
          <div key={index} className="h-44 animate-pulse rounded-card bg-surface shadow-card" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[40fr_35fr_25fr]">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-72 animate-pulse rounded-card bg-surface shadow-card" />
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, updateProfile } = useAuth();
  const displayName = user?.name ?? "there";

  const { status, items, error, refresh } = useTransactions();
  const budgets = useBudgets();
  const recently = useRecentlyViewed();

  const totals = computeTotals(items);
  const balance = totals.income - totals.expense;
  const savingsGoal = user?.monthly_savings_goal ?? null;
  const breakdown = expenseBreakdown(items);
  const topCategory = breakdown[0] ?? null;
  const thisMonth = monthLabel(currentMonthKey());

  const spentByCategory = items.reduce((acc, item) => {
    if (item.type === "expense") {
      acc[item.category_id] = (acc[item.category_id] ?? 0) + item.amount;
    }
    return acc;
  }, {});
  const totalLimit = budgets.items.reduce((sum, budget) => sum + (budget.limit_amount ?? 0), 0);
  const totalSpent = budgets.items.reduce(
    (sum, budget) => sum + (spentByCategory[budget.category_id] ?? 0),
    0,
  );
  const ratio = totalLimit > 0 ? totalSpent / totalLimit : 0;
  const usedPct = Math.round(ratio * 100);
  const barWidth = Math.min(Math.max(ratio * 100, 0), 100);
  const isOver = totalLimit > 0 && ratio >= 1;
  const isNear = !isOver && ratio >= 0.95;

  const [yearPart, monthPart] = currentMonthKey().split("-");
  const monthDays = new Date(Number(yearPart), Number(monthPart), 0).getDate();
  const daysElapsed = new Date().getDate();
  const projectedSpend =
    daysElapsed > 0 ? (totals.expense / daysElapsed) * monthDays : totals.expense;
  const forecastTarget =
    totalLimit > 0
      ? { amount: totalLimit, label: "budget" }
      : user?.allowance_baseline != null
        ? { amount: user.allowance_baseline, label: "allowance" }
        : null;
  const forecastOver = forecastTarget != null && projectedSpend > forecastTarget.amount;

  const [setupOpen, setSetupOpen] = useState(user?.profileOnboarded === false);

  const lookup = categoryLookup();
  const recent = [...items]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
    .map((t) => {
      const category = lookup[t.category_id];
      const name = category?.name ?? "Others";
      return {
        ...t,
        category_name: name,
        icon: CATEGORY_ICONS[name] ?? "ellipsis",
        color: categoryColor(t.category_id),
      };
    });

  return (
    <div className="min-h-svh">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <MobileNav />
      <AssistantFab />

      {setupOpen && (
        <ProfileSetupOverlay
          onDismiss={() => setSetupOpen(false)}
          onSave={(patch) => updateProfile({ ...patch, profileOnboarded: true })}
          onSkip={() => updateProfile({ profileOnboarded: true })}
        />
      )}

      <div className="lg:pl-60">
        <main className="mx-auto max-w-7xl space-y-4 px-4 pb-24 pt-5 md:pb-5">
          <PageHeader onMenu={() => setSidebarOpen(true)} />

          <section className="flex min-h-37.5 overflow-hidden rounded-card bg-linear-to-r from-emerald-100/80 via-emerald-50 to-surface px-6 py-3 ring-1 ring-emerald-100">
            <div className="flex w-full flex-col gap-4 md:flex-row md:justify-between">
              <div className="max-w-md md:self-center">
                <h1 className="font-display text-2xl font-extrabold tracking-tight text-forest-900 dark:text-sage-100 md:text-3xl">
                  Hello, {displayName}
                </h1>
                <p className="mt-1.5 text-sm text-ink-500 md:text-base">
                  Take control of your money. Build your future.
                </p>
              </div>
              <div className="flex items-end gap-2 self-end md:-mb-3 md:mr-6">
                <div className="flex flex-col items-start gap-1 self-start">
                  <p className="-rotate-3 font-['Segoe_Script','Comic_Sans_MS',cursive] text-lg font-bold text-brand-600 md:text-xl">
                    Small Steps
                    <br />
                    Big Goals
                  </p>
                  <Icon
                    name="arrow-down-right"
                    size={30}
                    className="self-end rotate-12 text-brand-600"
                  />
                </div>
                <img
                  src={campusboy}
                  alt="Student holding a laptop"
                  loading="lazy"
                  className="h-30 w-auto shrink-0 object-contain object-bottom sm:h-35 md:h-40 lg:h-44"
                />
              </div>
            </div>
          </section>

          {status === "loading" && <DashboardSkeleton />}

          {status === "error" && (
            <div className="rounded-card bg-surface p-8 text-center shadow-card" role="alert">
              <Icon name="triangle-alert" size={28} className="mx-auto text-red-500" />
              <p className="mt-2 text-sm font-semibold text-ink-900">{error}</p>
              <RetryButton onClick={refresh} />
            </div>
          )}

          {status === "ready" && (
            <>
              <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <StatCard
                  label="Month Balance"
                  value={formatCurrency(balance)}
                  icon="wallet"
                  tone="mint"
                  hint={thisMonth}
                />
                <StatCard label="Income" value={formatCurrency(totals.income)} icon="arrow-up" tone="blue" />
                <StatCard
                  label="Expenses"
                  value={formatCurrency(totals.expense)}
                  icon="arrow-down"
                  tone="coral"
                />
                <StatCard
                  label="Savings Goal"
                  value={savingsGoal == null ? "Not added" : formatCurrency(savingsGoal)}
                  icon="piggy-bank"
                  tone="purple"
                  hint={savingsGoal == null ? "Add a goal in Settings" : "Your monthly target"}
                />
              </section>

              {items.length === 0 && (
                <section className="rounded-card border border-dashed border-emerald-200 bg-surface p-8 text-center shadow-card dark:border-emerald-500/30">
                  <Icon name="wallet" size={26} className="mx-auto text-ink-500" />
                  <p className="mt-2 text-sm font-semibold text-ink-900">
                    No transactions this month
                  </p>
                  <p className="mt-1 text-sm text-ink-500">
                    Log income or an expense and every card here fills itself in.
                  </p>
                  <div className="mt-4 flex justify-center">
                    <AddTransactionLink />
                  </div>
                </section>
              )}

              <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {budgets.status === "loading" && (
                  <div
                    className="h-44 animate-pulse rounded-card bg-surface shadow-card"
                    role="status"
                    aria-busy="true"
                  >
                    <span className="sr-only">Loading budgets...</span>
                  </div>
                )}

                {budgets.status === "error" && (
                  <div className="rounded-card bg-surface p-5 shadow-card" role="alert">
                    <CardTitle>Budget vs actual</CardTitle>
                    <p className="text-sm font-semibold text-red-500">{budgets.error}</p>
                    <RetryButton onClick={budgets.refresh} />
                  </div>
                )}

                {budgets.status === "ready" && totalLimit === 0 && (
                  <div className="rounded-card bg-surface p-5 shadow-card">
                    <CardTitle>Budget vs actual</CardTitle>
                    <Icon name="target" size={26} className="text-ink-500" />
                    <p className="mt-2 text-sm font-semibold text-ink-900">
                      No budget for {thisMonth}
                    </p>
                    <p className="mt-1 text-sm text-ink-500">
                      Give a category a monthly limit and your actual spend shows up here.
                    </p>
                    <Link
                      to="/budgets"
                      className="mt-3 inline-block rounded-lg bg-brand-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-800"
                    >
                      Set a budget
                    </Link>
                  </div>
                )}

                {budgets.status === "ready" && totalLimit > 0 && (
                  <div className="rounded-card bg-surface p-5 shadow-card">
                    <CardTitle
                      action={
                        <Link
                          to="/budgets"
                          className="text-xs font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-emerald-300"
                        >
                          Manage
                        </Link>
                      }
                    >
                      Budget vs actual
                    </CardTitle>
                    <p className="text-2xl font-extrabold tabular-nums text-ink-900">
                      {formatCurrency(totalSpent)}
                      <span className="text-sm font-semibold text-ink-500">
                        {" "}
                        of {formatCurrency(totalLimit)}
                      </span>
                    </p>
                    <div
                      className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-200/70"
                      role="progressbar"
                      aria-valuenow={Math.min(Math.max(usedPct, 0), 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Budget usage for ${thisMonth}`}
                    >
                      <div
                        className={`h-full rounded-full ${
                          isOver ? "bg-red-500" : isNear ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <p
                      className={`mt-2 text-xs font-semibold ${
                        isOver
                          ? "text-red-500"
                          : isNear
                            ? "text-amber-600"
                            : "text-emerald-600"
                      }`}
                    >
                      {isOver
                        ? `${formatCurrency(totalSpent - totalLimit)} over the ${formatCurrency(totalLimit)} limit`
                        : isNear
                          ? `Near your limit - ${usedPct}% used`
                          : `${usedPct}% of the ${formatCurrency(totalLimit)} limit used`}
                    </p>
                  </div>
                )}

                <div className="rounded-card bg-surface p-5 shadow-card">
                  <CardTitle>Top category</CardTitle>
                  {topCategory ? (
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: topCategory.color }}
                      >
                        <Icon name={CATEGORY_ICONS[topCategory.name] ?? "ellipsis"} size={20} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-lg font-bold text-ink-900">
                          {topCategory.name}
                        </p>
                        <p className="text-sm text-ink-500">
                          {formatCurrency(topCategory.amount)} ({topCategory.percentage}% of
                          spending)
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Icon name="chart-pie" size={26} className="text-ink-500" />
                      <p className="mt-2 text-sm font-semibold text-ink-900">
                        No spending logged yet
                      </p>
                      <p className="mt-1 text-sm text-ink-500">
                        Expenses logged this month get ranked here by size.
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-card bg-surface p-5 shadow-card md:col-span-2 xl:col-span-1">
                  <CardTitle
                    action={<Icon name="trending-up" size={18} className="text-emerald-600" />}
                  >
                    Month-end forecast
                  </CardTitle>
                  {totals.expense === 0 ? (
                    <p className="text-sm text-ink-500">
                      Nothing spent yet this month, so there is no pace to project.
                    </p>
                  ) : (
                    <>
                      <p className="text-2xl font-extrabold tabular-nums text-ink-900">
                        {formatCurrency(projectedSpend)}
                      </p>
                      <p className="mt-1 text-xs text-ink-500">
                        Projected for {monthLabel(currentMonthKey())} at this pace, based on{" "}
                        {daysElapsed} day{daysElapsed === 1 ? "" : "s"} of spending.
                      </p>
                      {forecastTarget && (
                        <p
                          className={`mt-2 text-xs font-semibold ${
                            forecastOver ? "text-red-500" : "text-emerald-600"
                          }`}
                        >
                          {forecastOver
                            ? `${formatCurrency(projectedSpend - forecastTarget.amount)} over your ${forecastTarget.label}`
                            : `${formatCurrency(forecastTarget.amount - projectedSpend)} under your ${forecastTarget.label}`}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-card bg-surface p-5 shadow-card">
                  <CardTitle
                    action={
                      <Link
                        to="/transactions"
                        className="text-xs font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-emerald-300"
                      >
                        Open list
                      </Link>
                    }
                  >
                    Recently viewed
                  </CardTitle>
                  {recently.items.length === 0 ? (
                    <p className="text-sm text-ink-500">
                      Open a transaction to edit it and it waits for you here next time.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {recently.items.map((row) => (
                        <li
                          key={row.transaction_id}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="min-w-0 truncate text-ink-900">
                            {row.label}
                            {row.date && (
                              <span className="ml-1.5 text-xs text-ink-500">
                                {formatDate(row.date)}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 tabular-nums text-ink-500">
                            {row.type === "income" ? "+" : "-"}
                            {formatCurrency(row.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <TipsPanel />
              </section>

              <section className="grid grid-cols-1 gap-4 xl:grid-cols-[40fr_35fr_25fr]">
                <div className="rounded-card bg-surface p-5 shadow-card">
                  <h2 className="mb-4 font-display text-base font-bold tracking-tight text-ink-900">
                    Spending Overview
                  </h2>
                  <SpendingDonut
                    breakdown={breakdown}
                    totalExpense={totals.expense}
                    emptyAction={<AddTransactionLink />}
                  />
                </div>
                <RecentTransactions items={recent} />
                <div className={INLINE_AI_VISIBLE_CLASS}>
                  <AIAssistantCard breakdown={breakdown} />
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
