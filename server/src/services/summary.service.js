import { serializeAll } from "../utils/idOptions.js";
import { addMonths, monthKey, todayString } from "../utils/dateMath.js";
import { Category, Transaction } from "../models/index.js";
import { listBudgets, materialiseRecurring } from "./ledger.service.js";

/**
 * Every number the student sees on Dashboard, Transactions and Insights is
 * produced here, in one round trip, from the database — never from a list of
 * rows the browser happens to be holding. That matters as soon as the row list
 * is paginated: a page of 50 transactions cannot be summed into a month total.
 *
 * `month` is optional. With a month the answer is scoped to that month and the
 * previous month comes back alongside it for the month-on-month deltas. Without
 * a month the answer covers everything.
 */

const SERIES_MONTHS = 6;
const RECENT_LIMIT = 5;

function round2(value) {
  return Math.round(value * 100) / 100;
}

function monthWindow(month) {
  if (!month) return null;
  return { $gte: `${month}-01`, $lte: `${month}-31` };
}

function previousMonth(month) {
  return addMonths(`${month}-01`, -1).slice(0, 7);
}

function monthAfter(month, delta) {
  return addMonths(`${month}-01`, delta).slice(0, 7);
}

async function totalsFor(userId, dateFilter) {
  const match = { user_id: userId };
  if (dateFilter) match.date = dateFilter;

  const rows = await Transaction.aggregate([
    { $match: match },
    { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);

  let income = 0;
  let expense = 0;
  let count = 0;
  for (const row of rows) {
    count += row.count;
    if (row._id === "income") income += row.total;
    else if (row._id === "expense") expense += row.total;
  }

  return {
    income: round2(income),
    expense: round2(expense),
    net: round2(income - expense),
    count,
  };
}

async function breakdownFor(userId, dateFilter) {
  const match = { user_id: userId, type: "expense" };
  if (dateFilter) match.date = dateFilter;

  const rows = await Transaction.aggregate([
    { $match: match },
    { $group: { _id: "$category_id", amount: { $sum: "$amount" } } },
  ]);
  if (!rows.length) return [];

  const categoryIds = rows.map((row) => row._id).filter(Boolean);
  const categories = categoryIds.length
    ? await Category.find({ _id: { $in: categoryIds } }).select("name").lean()
    : [];
  const names = new Map(categories.map((row) => [String(row._id), row.name]));

  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return rows
    .map((row) => ({
      category_id: String(row._id),
      name: names.get(String(row._id)) ?? "Others",
      amount: round2(row.amount),
      percentage: total > 0 ? Math.round((row.amount / total) * 100) : 0,
    }))
    // "Others" always sinks to the bottom, exactly like the client-side helper
    // it replaces, so the donut and the top-category card agree.
    .sort(
      (a, b) =>
        Number(a.name === "Others") - Number(b.name === "Others") || b.amount - a.amount,
    );
}

async function seriesFor(userId, endMonth, count) {
  const startMonth = monthAfter(endMonth, -(count - 1));
  const rows = await Transaction.aggregate([
    {
      $match: {
        user_id: userId,
        date: { $gte: `${startMonth}-01`, $lte: `${endMonth}-31` },
      },
    },
    {
      $group: {
        _id: { month: { $substr: ["$date", 0, 7] }, type: "$type" },
        total: { $sum: "$amount" },
      },
    },
  ]);

  const byMonth = new Map();
  for (const row of rows) {
    const key = row._id.month;
    const entry = byMonth.get(key) ?? { income: 0, expense: 0 };
    if (row._id.type === "income") entry.income += row.total;
    else if (row._id.type === "expense") entry.expense += row.total;
    byMonth.set(key, entry);
  }

  const series = [];
  for (let index = 0; index < count; index += 1) {
    const key = monthAfter(startMonth, index);
    const entry = byMonth.get(key) ?? { income: 0, expense: 0 };
    series.push({ key, income: round2(entry.income), expense: round2(entry.expense) });
  }
  return series;
}

export async function getSummary(userId, month = null) {
  // Recurring rows only exist once they have been rolled forward, so the totals
  // have to happen after that pass or the month comes up short.
  await materialiseRecurring(userId);

  const window = monthWindow(month);
  const prev = month ? previousMonth(month) : null;
  const prevWindow = monthWindow(prev);
  const endMonth = month ?? monthKey(todayString());

  const [
    totals,
    prevTotals,
    breakdown,
    prevBreakdown,
    series,
    budgets,
    recentRows,
  ] = await Promise.all([
    totalsFor(userId, window),
    month ? totalsFor(userId, prevWindow) : Promise.resolve(null),
    breakdownFor(userId, window),
    month ? breakdownFor(userId, prevWindow) : Promise.resolve([]),
    seriesFor(userId, endMonth, SERIES_MONTHS),
    // A summary without a month still reports the budgets of the live month so
    // the Dashboard's budget card has something to show next to "All months".
    listBudgets(userId, month ?? endMonth),
    Transaction.find(window ? { user_id: userId, date: window } : { user_id: userId })
      .sort({ date: -1, createdAt: -1 })
      .limit(RECENT_LIMIT)
      .lean(),
  ]);

  // Budgets need their category name even when nothing was spent in that
  // category this month, which is exactly when the breakdown has no entry for
  // it. One lookup covers every budget on the page.
  const budgetCategoryIds = budgets.map((row) => row.category_id).filter(Boolean);
  const budgetCategories = budgetCategoryIds.length
    ? await Category.find({ _id: { $in: budgetCategoryIds } }).select("name").lean()
    : [];
  const budgetNames = new Map(
    budgetCategories.map((row) => [String(row._id), row.name]),
  );

  return {
    scope: month ? "month" : "all",
    month,
    totals,
    prev: prev ? { month: prev, ...prevTotals } : null,
    breakdown,
    prevBreakdown: prevBreakdown.map((row) => ({
      category_id: row.category_id,
      amount: row.amount,
    })),
    topCategory: breakdown[0] ?? null,
    series,
    // listBudgets already serialises the id and computes spent/percentage/status.
    budgets: budgets.map((row) => ({
      budget_id: row.budget_id,
      category_id: String(row.category_id),
      name: budgetNames.get(String(row.category_id)) ?? "Others",
      month: row.month,
      limit_amount: row.limit_amount,
      spent: round2(row.spent ?? 0),
      remaining: round2(row.remaining ?? 0),
      percentage: row.percentage ?? 0,
      status: row.status ?? "ok",
    })),
    recent: serializeAll(recentRows, "transaction_id"),
  };
}
