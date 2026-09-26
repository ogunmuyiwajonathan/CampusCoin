import { useState } from "react";
import Icon from "../components/Icon.jsx";
import campusboy from "../assets/campusboy.png";
import Sidebar from "../components/Sidebar.jsx";
import StatCard from "../components/StatCard.jsx";
import SpendingDonut from "../components/SpendingDonut.jsx";
import RecentTransactions from "../components/RecentTransactions.jsx";
import AIAssistantCard from "../components/AIAssistantCard.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { useAuth } from "../hooks/useAuth.js";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  categoryLookup,
  computeTotals,
  expenseBreakdown,
  mockUser,
} from "../data/mockData.js";
import { useTransactions } from "../hooks/useTransactions.js";
import { formatCurrency } from "../lib/formatCurrency.js";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const displayName = user?.name ?? mockUser.name;

  const { items } = useTransactions();
  const totals = computeTotals(items);
  const balance = totals.income - totals.expense;
  const savings = mockUser.monthly_savings_goal;
  const breakdown = expenseBreakdown(items);

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
        color: CATEGORY_COLORS[t.category_id] ?? "#64748b",
      };
    });

  return (
    <div className="min-h-svh">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-60">
        <main className="mx-auto max-w-7xl space-y-4 px-4 py-5">
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
                  className="hidden h-35 w-auto shrink-0 object-contain object-bottom sm:block md:h-40 lg:h-44"
                />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard label="Total Balance" value={formatCurrency(balance)} icon="wallet" tone="mint" />
            <StatCard label="Total Income" value={formatCurrency(totals.income)} icon="arrow-up" tone="blue" />
            <StatCard label="Total Expenses" value={formatCurrency(totals.expense)} icon="arrow-down" tone="coral" />
            <StatCard label="Savings" value={formatCurrency(savings)} icon="piggy-bank" tone="purple" />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[40fr_35fr_25fr]">
            <div className="rounded-card bg-surface p-5 shadow-card">
              <h2 className="mb-4 font-display text-base font-bold tracking-tight text-ink-900">Spending Overview</h2>
              <SpendingDonut breakdown={breakdown} totalExpense={totals.expense} />
            </div>
            <RecentTransactions items={recent} />
            <AIAssistantCard breakdown={breakdown} recent={recent} />
          </section>
        </main>
      </div>
    </div>
  );
}
