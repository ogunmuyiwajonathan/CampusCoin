import { Budget, Category, Transaction, User } from "../models/index.js";

const NEAR_LIMIT = 0.95;

export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function shiftMonth(month, delta) {
  const [year, mon] = month.split("-").map(Number);
  return new Date(Date.UTC(year, mon - 1 + delta, 1)).toISOString().slice(0, 7);
}

export function daysInMonth(month) {
  const [year, mon] = month.split("-").map(Number);
  return new Date(Date.UTC(year, mon, 0)).getUTCDate();
}

export function monthWindow(month) {
  return { $gte: `${month}-01`, $lte: `${month}-31` };
}

export function naira(value) {
  return `₦${Math.abs(Math.round(value)).toLocaleString("en-NG")}`;
}

export function pctOf(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

function monthTotals(userId, month) {
  return Transaction.aggregate([
    { $match: { user_id: userId, date: monthWindow(month) } },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);
}

function monthByCategory(userId, month) {
  return Transaction.aggregate([
    { $match: { user_id: userId, type: "expense", date: monthWindow(month) } },
    {
      $group: {
        _id: "$category_id",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ]);
}

async function categoryNames(ids) {
  const unique = [...new Set(ids.map(String).filter((id) => id !== "null"))];
  if (!unique.length) return new Map();
  const rows = await Category.find({ _id: { $in: unique } }).select("name").lean();
  return new Map(rows.map((row) => [String(row._id), row.name]));
}

function compareBreakdown(current, previous) {
  const previousMap = new Map(previous.map((row) => [String(row._id), row.total]));
  return current.map((row) => {
    const before = previousMap.get(String(row._id)) ?? 0;
    const change = before ? pctOf(row.total - before, before) : row.total > 0 ? 100 : 0;
    return {
      category_id: String(row._id),
      amount: row.total,
      previous_amount: before,
      change_pct: change,
    };
  });
}

export async function buildSnapshot(userId) {
  const month = currentMonth();
  const prevMonth = shiftMonth(month, -1);
  const now = new Date();
  const dayOfMonth = now.getUTCDate();
  const monthDays = daysInMonth(month);
  const daysLeft = Math.max(monthDays - dayOfMonth, 0);

  const [user, totals, byCategory, prevByCategory, budgetRows, largest, recent, recurring] =
    await Promise.all([
      User.findById(userId).lean(),
      monthTotals(userId, month),
      monthByCategory(userId, month),
      monthByCategory(userId, prevMonth),
      Budget.find({ user_id: userId, month }).lean(),
      Transaction.find({ user_id: userId, type: "expense", date: monthWindow(month) })
        .sort({ amount: -1 })
        .limit(5)
        .lean(),
      Transaction.find({ user_id: userId }).sort({ date: -1, createdAt: -1 }).limit(10).lean(),
      Transaction.find({ user_id: userId, is_recurring: true }).sort({ date: -1 }).limit(20).lean(),
    ]);

  const incomeRow = totals.find((row) => row._id === "income");
  const expenseRow = totals.find((row) => row._id === "expense");
  const income = incomeRow?.total ?? 0;
  const expense = expenseRow?.total ?? 0;
  const transactionCount = (incomeRow?.count ?? 0) + (expenseRow?.count ?? 0);

  const names = await categoryNames([
    ...byCategory.map((row) => row._id),
    ...prevByCategory.map((row) => row._id),
    ...budgetRows.map((row) => row.category_id),
    ...largest.map((row) => row.category_id),
    ...recent.map((row) => row.category_id),
    ...recurring.map((row) => row.category_id),
  ]);

  const breakdown = compareBreakdown(byCategory, prevByCategory).map((row) => ({
    ...row,
    category: names.get(row.category_id) ?? "Uncategorised",
    share_pct: pctOf(row.amount, expense),
  }));

  const budgets = budgetRows.map((row) => {
    const categoryId = String(row.category_id);
    const spent = byCategory.find((entry) => String(entry._id) === categoryId)?.total ?? 0;
    const used = row.limit_amount ? spent / row.limit_amount : 0;
    return {
      category_id: categoryId,
      category: names.get(categoryId) ?? "Uncategorised",
      month: row.month,
      limit: row.limit_amount,
      spent,
      used_pct: pctOf(spent, row.limit_amount),
      status: used >= 1 ? "over" : used >= NEAR_LIMIT ? "near" : "ok",
    };
  });

  const prevTotals = await monthTotals(userId, prevMonth);
  const prevExpense = prevTotals.find((row) => row._id === "expense")?.total ?? 0;
  const prevIncome = prevTotals.find((row) => row._id === "income")?.total ?? 0;

  const dailyAverage = dayOfMonth ? expense / dayOfMonth : 0;

  return {
    month,
    previous_month: prevMonth,
    user: {
      first_name: String(user?.name ?? "there").trim().split(/\s+/)[0],
      full_name: user?.name ?? "",
      academic_year: user?.academic_year ?? null,
      allowance_baseline: user?.allowance_baseline ?? null,
      monthly_savings_goal: user?.monthly_savings_goal ?? null,
    },
    month_summary: {
      income,
      expense,
      balance: income - expense,
      transaction_count: transactionCount,
      previous_expense: prevExpense,
      previous_income: prevIncome,
      expense_change_pct: prevExpense ? pctOf(expense - prevExpense, prevExpense) : 0,
      days_in_month: monthDays,
      day_of_month: dayOfMonth,
      days_left: daysLeft,
      daily_average: dailyAverage,
      projected_month_end: dayOfMonth ? (expense / dayOfMonth) * monthDays : expense,
    },
    categories: breakdown,
    budgets,
    largest_expenses: largest.map((row) => ({
      transaction_id: String(row._id),
      amount: row.amount,
      description: String(row.description ?? "").slice(0, 60),
      date: row.date,
      category: names.get(String(row.category_id)) ?? "Uncategorised",
    })),
    recent_transactions: recent.map((row) => ({
      transaction_id: String(row._id),
      type: row.type,
      amount: row.amount,
      date: row.date,
      description: String(row.description ?? "").slice(0, 60),
      category: names.get(String(row.category_id)) ?? "Uncategorised",
    })),
    recurring: recurring.map((row) => ({
      type: row.type,
      amount: row.amount,
      date: row.date,
      frequency: row.frequency,
      next_run_at: row.next_run_at,
      description: String(row.description ?? "").slice(0, 60),
      category: names.get(String(row.category_id)) ?? "Uncategorised",
    })),
  };
}

export async function categorySpending(userId, month, categoryName) {
  const byCategory = await monthByCategory(userId, month);
  const names = await categoryNames(byCategory.map((row) => row._id));
  const rows = byCategory.map((row) => {
    const name = names.get(String(row._id)) ?? "Uncategorised";
    const total = row.total;
    return {
      category: name,
      amount: total,
      count: row.count,
      matches: categoryName ? name.toLowerCase() === categoryName.toLowerCase() : false,
    };
  });

  const expense = rows.reduce((sum, row) => sum + row.amount, 0);
  const target = categoryName
    ? rows.filter((row) => row.matches || row.category.toLowerCase().includes(categoryName.toLowerCase()))
    : rows;

  return {
    month,
    month_total_expense: expense,
    categories: target.map((row) => ({
      category: row.category,
      amount: row.amount,
      share_pct: pctOf(row.amount, expense),
      transactions: row.count,
    })),
    found: categoryName ? target.length > 0 : true,
  };
}

export async function comparePeriods(userId, a, b) {
  const [rowsA, rowsB] = await Promise.all([monthByCategory(userId, a), monthByCategory(userId, b)]);
  const names = await categoryNames([...rowsA.map((row) => row._id), ...rowsB.map((row) => row._id)]);
  const mapA = new Map(rowsA.map((row) => [String(row._id), row.total]));
  const mapB = new Map(rowsB.map((row) => [String(row._id), row.total]));
  const ids = [...new Set([...mapA.keys(), ...mapB.keys()])];

  return {
    a,
    b,
    categories: ids.map((id) => {
      const amountA = mapA.get(id) ?? 0;
      const amountB = mapB.get(id) ?? 0;
      return {
        category: names.get(id) ?? "Uncategorised",
        [a]: amountA,
        [b]: amountB,
        change: amountA - amountB,
        change_pct: amountB ? pctOf(amountA - amountB, amountB) : amountA ? 100 : 0,
      };
    }),
  };
}

export async function forecastMonthEnd(userId, categoryName) {
  const month = currentMonth();
  const now = new Date();
  const dayOfMonth = now.getUTCDate();
  const monthDays = daysInMonth(month);
  const byCategory = await monthByCategory(userId, month);
  const names = await categoryNames(byCategory.map((row) => row._id));
  const expense = byCategory.reduce((sum, row) => sum + row.total, 0);
  const projection = dayOfMonth ? (expense / dayOfMonth) * monthDays : expense;

  const budgets = await Budget.find({ user_id: userId, month }).lean();
  const budgetByCategory = new Map(budgets.map((row) => [String(row.category_id), row.limit_amount]));

  const rows = byCategory.map((row) => {
    const name = names.get(String(row._id)) ?? "Uncategorised";
    const spent = row.total;
    const projected = dayOfMonth ? (spent / dayOfMonth) * monthDays : spent;
    const limit = budgetByCategory.get(String(row._id)) ?? null;
    return {
      category: name,
      spent,
      projected_month_end: Math.round(projected),
      limit,
      will_exceed: limit === null ? null : projected > limit,
    };
  });

  const target = categoryName
    ? rows.filter((row) => row.category.toLowerCase() === categoryName.toLowerCase() || row.category.toLowerCase().includes(categoryName.toLowerCase()))
    : rows;

  return {
    month,
    day_of_month: dayOfMonth,
    days_in_month: monthDays,
    days_left: Math.max(monthDays - dayOfMonth, 0),
    spent_to_date: expense,
    projected_month_end: Math.round(projection),
    categories: target,
    found: categoryName ? target.length > 0 : true,
  };
}

export async function whatIfSave(userId, categoryName, percent) {
  const month = currentMonth();
  const byCategory = await monthByCategory(userId, month);
  const names = await categoryNames(byCategory.map((row) => row._id));
  const expense = byCategory.reduce((sum, row) => sum + row.total, 0);
  const rate = Math.min(Math.max(percent, 0), 100) / 100;

  const rows = byCategory.map((row) => {
    const name = names.get(String(row._id)) ?? "Uncategorised";
    const saving = Math.round(row.total * rate);
    return {
      category: name,
      spent: row.total,
      cut_by_percent: percent,
      saving,
      remaining: row.total - saving,
    };
  });

  const target = categoryName
    ? rows.filter((row) => row.category.toLowerCase() === categoryName.toLowerCase() || row.category.toLowerCase().includes(categoryName.toLowerCase()))
    : rows;

  const saving = target.reduce((sum, row) => sum + row.saving, 0);

  return {
    month,
    month_expense: expense,
    categories: target,
    total_saving: saving,
    new_month_expense: expense - saving,
    percent,
    found: categoryName ? target.length > 0 : true,
  };
}

export async function recentTransactions(userId, filters = {}) {
  const query = { user_id: userId };
  if (filters.month) query.date = monthWindow(filters.month);
  if (filters.type) query.type = filters.type;
  if (filters.category_id) query.category_id = filters.category_id;
  if (filters.min_amount || filters.max_amount) {
    query.amount = {};
    if (filters.min_amount) query.amount.$gte = filters.min_amount;
    if (filters.max_amount) query.amount.$lte = filters.max_amount;
  }

  const limit = Math.min(Math.max(Number(filters.limit) || 10, 1), 25);
  const rows = await Transaction.find(query).sort({ date: -1, createdAt: -1 }).limit(limit).lean();
  const names = await categoryNames(rows.map((row) => row.category_id));

  return {
    count: rows.length,
    limit,
    transactions: rows.map((row) => ({
      transaction_id: String(row._id),
      type: row.type,
      amount: row.amount,
      date: row.date,
      description: String(row.description ?? "").slice(0, 60),
      category: names.get(String(row.category_id)) ?? "Uncategorised",
      is_recurring: Boolean(row.is_recurring),
    })),
  };
}
