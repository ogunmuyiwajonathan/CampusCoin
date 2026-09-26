import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  categoryLookup,
  computeTotals,
  expenseBreakdown,
} from "../data/mockData.js";
import { formatCurrency } from "./formatCurrency.js";
import { monthKey, shiftMonthKey } from "./formatMonth.js";

/** Months shown in the Spending Overview chart at a time. */
export const WINDOW_MONTHS = 6;

/** How far back the chart window can travel before the back arrow greys out. */
export const HISTORY_MONTHS = 24;

/** "2026-09" -> "2026-08" (safe across year boundaries). */
export function prevMonthKey(key) {
  return shiftMonthKey(key, -1);
}

/** Percentage change against a previous value; null when there is nothing to compare. */
export function percentChange(current, previous) {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function shortMonth(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "short" });
}

/** The last `count` months ending at `endMonth`, with income/expense totals each. */
export function monthSeries(items, endMonth, count = WINDOW_MONTHS) {
  const income = new Map();
  const expenses = new Map();
  for (const item of items) {
    const bucket = item.type === "income" ? income : expenses;
    const key = monthKey(item.date);
    bucket.set(key, (bucket.get(key) ?? 0) + item.amount);
  }

  const series = [];
  let cursor = endMonth;
  for (let index = 0; index < count; index += 1) {
    series.unshift({
      key: cursor,
      label: shortMonth(cursor),
      income: income.get(cursor) ?? 0,
      expenses: expenses.get(cursor) ?? 0,
    });
    cursor = prevMonthKey(cursor);
  }
  return series;
}

/**
 * Everything the Insights page shows for one month, derived from the
 * transactions and budgets stores. Backend swap: replace this single call
 * with `GET /api/insights?month=YYYY-MM` (summary_text, tip_text, history[]).
 */
export function buildInsights({ items, month, budgets = [], goal = 0 }) {
  const prev = prevMonthKey(month);
  const monthTx = items.filter((item) => monthKey(item.date) === month);
  const prevTx = items.filter((item) => monthKey(item.date) === prev);

  const totals = computeTotals(monthTx);
  const prevTotals = computeTotals(prevTx);
  const hasPrev = prevTx.length > 0;
  const saved = totals.income - totals.expense;
  const prevSaved = prevTotals.income - prevTotals.expense;
  const breakdown = expenseBreakdown(monthTx);

  const prevByCategory = new Map();
  for (const item of prevTx) {
    if (item.type !== "expense") continue;
    prevByCategory.set(item.category_id, (prevByCategory.get(item.category_id) ?? 0) + item.amount);
  }

  // Per-category spend for the month, each with its change against last month.
  const stats = breakdown.map((entry) => {
    const previous = prevByCategory.get(entry.category_id) ?? 0;
    return {
      ...entry,
      previous,
      delta: previous > 0 ? Math.round(((entry.amount - previous) / previous) * 100) : null,
      icon: CATEGORY_ICONS[entry.name] ?? "ellipsis",
    };
  });

  const lookup = categoryLookup();
  const spentByCategory = new Map();
  for (const item of monthTx) {
    if (item.type !== "expense") continue;
    spentByCategory.set(item.category_id, (spentByCategory.get(item.category_id) ?? 0) + item.amount);
  }

  // Budgets for this month, closest to (or past) the limit first.
  const budgetRows = budgets
    .filter((item) => item.month === month)
    .map((item) => {
      const name = lookup[item.category_id]?.name ?? "Others";
      const spent = spentByCategory.get(item.category_id) ?? 0;
      return {
        ...item,
        name,
        spent,
        pct: item.limit_amount > 0 ? Math.round((spent / item.limit_amount) * 100) : 0,
        icon: CATEGORY_ICONS[name] ?? "ellipsis",
        color: CATEGORY_COLORS[item.category_id] ?? "#64748b",
      };
    })
    .sort((a, b) => b.pct - a.pct);

  const top = stats[0];
  const tightest = budgetRows[0];
  const spoken = new Set();
  const keyInsights = [];

  if (top) {
    spoken.add(top.name);
    if (top.delta !== null && Math.abs(top.delta) >= 10) {
      const up = top.delta > 0;
      keyInsights.push({
        id: "top",
        icon: top.icon,
        color: top.color,
        tone: up ? "warn" : "good",
        accent: `${Math.abs(top.delta)}%`,
        title: `${top.name} spending ${up ? "increased" : "fell"} by ${Math.abs(top.delta)}%`,
        description: `You spent ${formatCurrency(top.amount)} on ${top.name.toLowerCase()} this month, ${up ? "up" : "down"} from ${formatCurrency(top.previous)} last month.`,
        to: "/transactions",
      });
    } else {
      keyInsights.push({
        id: "top",
        icon: top.icon,
        color: top.color,
        tone: "neutral",
        accent: null,
        title: `${top.name} is your top category`,
        description: `That's ${formatCurrency(top.amount)}, ${top.percentage}% of this month's spending.`,
        to: "/transactions",
      });
    }
  }

  if (tightest) {
    spoken.add(tightest.name);
    const over = tightest.pct >= 100;
    keyInsights.push({
      id: "budget",
      icon: over ? "triangle-alert" : tightest.icon,
      color: over ? "#ef4444" : tightest.color,
      tone: over || tightest.pct >= 95 ? "warn" : "good",
      accent: null,
      title: over ? `${tightest.name} is over its limit` : `${tightest.name} is within limit`,
      description: over
        ? `That's ${formatCurrency(tightest.spent - tightest.limit_amount)} past your ${formatCurrency(tightest.limit_amount)} limit.`
        : `You're ${100 - tightest.pct}% under your monthly ${tightest.name.toLowerCase()} budget.`,
      to: "/budgets",
    });
  } else {
    keyInsights.push({
      id: "budget",
      icon: "target",
      color: "#f59e0b",
      tone: "neutral",
      accent: null,
      title: "No budgets set this month",
      description: "Set per-category limits to get alerts before you overspend.",
      to: "/budgets",
    });
  }

  // Whichever category moved least against last month; when there is no
  // history to compare, the next biggest category reads as "normal".
  const stable = stats
    .filter((entry) => !spoken.has(entry.name) && entry.delta !== null)
    .sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta))[0];
  const calm = stats.find((entry) => !spoken.has(entry.name));
  if (stable && Math.abs(stable.delta) <= 15) {
    spoken.add(stable.name);
    keyInsights.push({
      id: "steady",
      icon: stable.icon,
      color: stable.color,
      tone: "neutral",
      accent: null,
      title: `${stable.name} spending is stable`,
      description: `Only ${Math.abs(stable.delta)}% change compared to last month.`,
      to: "/transactions",
    });
  } else if (calm) {
    spoken.add(calm.name);
    keyInsights.push({
      id: "steady",
      icon: calm.icon,
      color: calm.color,
      tone: "neutral",
      accent: null,
      title: `${calm.name} spending is normal`,
      description: "Within your expected range.",
      to: "/transactions",
    });
  }

  if (goal > 0) {
    if (saved >= goal) {
      keyInsights.push({
        id: "goal",
        icon: "check",
        color: "#10b981",
        tone: "good",
        accent: null,
        title: "Savings goal reached",
        description: `You saved ${formatCurrency(saved)}, that's ${formatCurrency(saved - goal)} beyond your ${formatCurrency(goal)} goal.`,
        to: "/",
      });
    } else if (saved > 0) {
      keyInsights.push({
        id: "goal",
        icon: "lightbulb",
        color: "#f59e0b",
        tone: "neutral",
        accent: null,
        title: "You could save more",
        description: `Save ${formatCurrency(goal - saved)} more this month to hit your ${formatCurrency(goal)} goal.`,
        to: "/",
      });
    } else {
      keyInsights.push({
        id: "goal",
        icon: "lightbulb",
        color: saved < 0 ? "#ef4444" : "#f59e0b",
        tone: saved < 0 ? "warn" : "neutral",
        accent: null,
        title: saved < 0 ? "Expenses beat your income" : "Start building savings",
        description:
          saved < 0
            ? `You spent ${formatCurrency(-saved)} more than you earned this month.`
            : `Log income and expenses to work toward your ${formatCurrency(goal)} goal.`,
        to: "/",
      });
    }
  }

  const recentInsights = [];
  const riser = stats
    .filter((entry) => entry.delta !== null && entry.delta > 0)
    .sort((a, b) => b.delta - a.delta)[0];

  if (riser) {
    recentInsights.push({
      id: "riser",
      icon: riser.icon,
      color: riser.color,
      tone: "warn",
      accent: `+${riser.delta}%`,
      title: `${riser.name} spending is up`,
      description: `+${riser.delta}% compared to last month.`,
      to: "/transactions",
    });
  } else if (top) {
    recentInsights.push({
      id: "riser",
      icon: top.icon,
      color: top.color,
      tone: "neutral",
      accent: null,
      title: `${top.name} leads your spending`,
      description: `${top.percentage}% of everything you spent this month.`,
      to: "/transactions",
    });
  }

  if (saved < 0) {
    recentInsights.push({
      id: "pace",
      icon: "triangle-alert",
      color: "#ef4444",
      tone: "warn",
      accent: null,
      title: "Spending beat your income",
      description: `You spent ${formatCurrency(-saved)} more than you earned.`,
      to: "/",
    });
  } else if (goal > 0 && saved >= goal) {
    recentInsights.push({
      id: "pace",
      icon: "piggy-bank",
      color: "#10b981",
      tone: "good",
      accent: null,
      title: "You're on track",
      description: `To meet your ${formatCurrency(goal)} savings goal.`,
      to: "/",
    });
  } else {
    recentInsights.push({
      id: "pace",
      icon: "piggy-bank",
      color: "#10b981",
      tone: "good",
      accent: null,
      title: "Savings are building up",
      description:
        goal > 0
          ? `${formatCurrency(saved)} saved so far, ${formatCurrency(goal - saved)} to go.`
          : `${formatCurrency(saved)} saved this month.`,
      to: "/",
    });
  }

  const quiet = stats.find((entry) => !spoken.has(entry.name));
  if (quiet) {
    recentInsights.push({
      id: "quiet",
      icon: quiet.icon,
      color: quiet.color,
      tone: "neutral",
      accent: null,
      title: `${quiet.name} spending is normal`,
      description: "Within your expected range.",
      to: "/transactions",
    });
  }

  const tipText = riser
    ? `You spent more on ${riser.name.toLowerCase()} this month. Small cuts there could free up ${formatCurrency(riser.amount)}.`
    : top
      ? `Your biggest expense was ${top.name.toLowerCase()} at ${formatCurrency(top.amount)}. Keep an eye on it next month.`
      : "No expenses logged this month yet. Add a transaction and Rix will start spotting patterns.";

  return {
    prev,
    totals,
    prevTotals,
    hasPrev,
    saved,
    prevSaved,
    breakdown,
    series: monthSeries(items, month),
    keyInsights,
    recentInsights,
    tipText,
  };
}
