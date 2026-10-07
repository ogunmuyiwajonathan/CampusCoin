import { CATEGORY_ICONS, categoryColor } from "../data/mockData.js";
import { formatCurrency } from "./formatCurrency.js";
import { shiftMonthKey } from "./formatMonth.js";

export const WINDOW_MONTHS = 6;
export const HISTORY_MONTHS = 24;

export function prevMonthKey(key) {
  return shiftMonthKey(key, -1);
}

export function percentChange(current, previous) {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * The server reports spending by category id and name; the palette lives on the
 * client, so colour is added here rather than duplicated in the API.
 */
export function decorateBreakdown(rows = []) {
  return rows.map((entry) => ({ ...entry, color: categoryColor(entry.category_id) }));
}

function shortMonth(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "short" });
}

/**
 * A zeroed summary for the moment before the first response lands. The page
 * still renders its chrome during that window, so the view has to be a real
 * object rather than a null the caller has to unwrap.
 */
export function emptySummary(month) {
  const series = [];
  let cursor = month;
  for (let index = 0; index < WINDOW_MONTHS; index += 1) {
    series.unshift({ key: cursor, income: 0, expense: 0 });
    cursor = prevMonthKey(cursor);
  }
  return {
    scope: "month",
    month,
    totals: { income: 0, expense: 0, net: 0, count: 0 },
    prev: null,
    breakdown: [],
    prevBreakdown: [],
    topCategory: null,
    series,
    budgets: [],
    recent: [],
  };
}

/**
 * Turns the server summary into everything the Insights page renders.
 *
 * Every figure here comes from `summary`, which the server computes with
 * aggregations over the whole month. Nothing is summed from a list of rows the
 * browser is holding, so these numbers stay correct once that list is
 * paginated. The client only adds presentation: colours, icons and wording.
 */
export function buildInsights({ summary, month, goal = 0 }) {
  const prev = summary.prev?.month ?? prevMonthKey(month);
  const totals = {
    income: summary.totals.income,
    expense: summary.totals.expense,
  };
  const prevTotals = summary.prev
    ? { income: summary.prev.income, expense: summary.prev.expense }
    : { income: 0, expense: 0 };
  // A previous month that holds no rows is not a comparison worth showing.
  const hasPrev = Boolean(summary.prev && summary.prev.count > 0);
  const saved = summary.totals.net;
  const prevSaved = summary.prev ? summary.prev.net : 0;

  const prevByCategory = new Map(
    (summary.prevBreakdown ?? []).map((row) => [row.category_id, row.amount]),
  );

  const stats = (summary.breakdown ?? []).map((entry) => {
    const previous = prevByCategory.get(entry.category_id) ?? 0;
    return {
      ...entry,
      color: categoryColor(entry.category_id),
      previous,
      delta: previous > 0 ? Math.round(((entry.amount - previous) / previous) * 100) : null,
      icon: CATEGORY_ICONS[entry.name] ?? "ellipsis",
    };
  });

  const budgetRows = (summary.budgets ?? [])
    .filter((item) => item.month === month)
    .map((item) => {
      // The server looks the name up for every budget, including categories
      // with no spending this month — the case the breakdown cannot answer.
      const name = item.name ?? "Others";
      return {
        ...item,
        name,
        pct: item.limit_amount > 0 ? Math.round((item.spent / item.limit_amount) * 100) : 0,
        icon: CATEGORY_ICONS[name] ?? "ellipsis",
        color: categoryColor(item.category_id),
      };
    })
    .sort((a, b) => b.pct - a.pct);

  // The chart series reads `expenses`; the server aggregates call it `expense`.
  const series = (summary.series ?? []).map((entry) => ({
    key: entry.key,
    label: shortMonth(entry.key),
    income: entry.income,
    expenses: entry.expense,
  }));

  const breakdown = stats.map((entry) => ({
    category_id: entry.category_id,
    name: entry.name,
    amount: entry.amount,
    percentage: entry.percentage,
    color: entry.color,
  }));

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
    series,
    keyInsights,
    recentInsights,
    tipText,
  };
}
