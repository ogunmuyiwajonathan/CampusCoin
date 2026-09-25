import { useState } from "react";
import Icon from "../components/Icon.jsx";
import campusboy from "../assets/campusboy.png";
import Sidebar from "../components/Sidebar.jsx";
import StatCard from "../components/StatCard.jsx";
import SpendingDonut from "../components/SpendingDonut.jsx";
import RecentTransactions from "../components/RecentTransactions.jsx";
import AIAssistantCard from "../components/AIAssistantCard.jsx";
import { useAuth } from "../hooks/useAuth.js";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  categoryLookup,
  computeTotals,
  expenseBreakdown,
  mockUser,
  transactions,
} from "../data/mockData.js";
import { formatCurrency } from "../lib/formatCurrency.js";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const displayName = user?.name ?? mockUser.name;

  const totals = computeTotals(transactions);
  const balance = totals.income - totals.expense;
  const savings = mockUser.monthly_savings_goal;
  const breakdown = expenseBreakdown(transactions);

  const lookup = categoryLookup();
  const recent = [...transactions]
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

      <div className="md:pl-60">
        <main className="mx-auto max-w-7xl space-y-4 px-4 py-5">
          <header className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 hover:bg-white md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <Icon name="menu" size={20} />
            </button>
            <div className="relative hidden flex-1 sm:block">
              <Icon
                name="search"
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500"
              />
              <input
                type="search"
                placeholder="Search anything..."
                aria-label="Search transactions"
                className="w-full max-w-md rounded-full bg-white py-2.5 pl-10 pr-4 text-sm ring-1 ring-slate-200/70 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                className="relative rounded-lg p-2 hover:bg-white"
                aria-label="Notifications, 1 unread"
              >
                <Icon name="bell" size={19} />
                <span
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500"
                  aria-hidden="true"
                />
              </button>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-700 text-sm font-bold text-white">
                  {displayName.charAt(0)}
                </span>
                <span className="hidden leading-tight sm:block">
                  <span className="block text-sm font-semibold text-ink-900">Hi, Student!</span>
                  <span className="block text-[11px] text-ink-500">Level 1</span>
                </span>
                <Icon name="chevron-down" size={15} className="text-ink-500" />
              </div>
            </div>
          </header>

          <section className="flex overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-100/80 via-emerald-50 to-white p-6 ring-1 ring-emerald-100 min-h-[220px]">
            <div className="flex w-full flex-col gap-4 md:flex-row md:justify-between">
              <div className="max-w-md md:self-center">
                <h1 className="text-2xl font-extrabold text-forest-900 md:text-3xl">
                  Hello, {displayName}
                </h1>
                <p className="mt-1.5 text-sm text-ink-500 md:text-base">
                  Take control of your money. Build your future.
                </p>
              </div>
              <div className="flex flex-col items-center gap-1 self-end md:-mb-6 md:mr-8 md:self-stretch md:justify-between">
                <div className="flex flex-col items-center gap-1">
                  <p className="-rotate-3 font-['Segoe_Script','Comic_Sans_MS',cursive] text-lg font-bold text-brand-600 md:text-xl">
                    Small Steps
                    <br />
                    Big Goals
                  </p>
                  <Icon name="arrow-down" size={26} className="text-brand-600" />
                </div>
                <img
                  src={campusboy}
                  alt="Student holding a laptop"
                  loading="lazy"
                  className="h-35 w-auto object-contain object-bottom md:h-40"
                />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Balance" value={formatCurrency(balance)} icon="wallet" tone="mint" />
            <StatCard label="Total Income" value={formatCurrency(totals.income)} icon="arrow-up" tone="blue" />
            <StatCard label="Total Expenses" value={formatCurrency(totals.expense)} icon="arrow-down" tone="coral" />
            <StatCard label="Savings" value={formatCurrency(savings)} icon="piggy-bank" tone="purple" />
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[40fr_35fr_25fr]">
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
              <h2 className="mb-4 text-base font-bold text-ink-900">Spending Overview</h2>
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
