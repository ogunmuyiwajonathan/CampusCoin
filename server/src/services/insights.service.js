import ApiError from "../utils/ApiError.js";
import { serialize, serializeAll } from "../utils/idOptions.js";
import { addMonths, monthKey, todayString } from "../utils/dateMath.js";
import {
  Budget,
  Category,
  Insight,
  Transaction,
  User,
} from "../models/index.js";

const MAX_HISTORY = 24;

function previousMonth(month) {
  return addMonths(`${month}-01`, -1).slice(0, 7);
}

function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function money(value) {
  return `N${Math.round(value).toLocaleString("en-NG")}`;
}

// Everything the narrative is allowed to say something about, gathered in one
// pass per month. One aggregation per question rather than a query per category,
// which is the N+1 the SRS warns about.
async function monthTotals(userId, month) {
  const from = `${month}-01`;
  const to = `${month}-31`;

  const [income, expense, byCategory] = await Promise.all([
    Transaction.aggregate([
      { $match: { user_id: userId, type: "income", date: { $gte: from, $lte: to } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate([
      { $match: { user_id: userId, type: "expense", date: { $gte: from, $lte: to } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate([
      { $match: { user_id: userId, type: "expense", date: { $gte: from, $lte: to } } },
      { $group: { _id: "$category_id", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const total = expense[0]?.total ?? 0;
  const categoryIds = byCategory.map((row) => row._id).filter(Boolean);
  const categories = categoryIds.length
    ? await Category.find({ _id: { $in: categoryIds } }).select("name").lean()
    : [];
  const names = new Map(categories.map((category) => [String(category._id), category.name]));

  return {
    month,
    income: income[0]?.total ?? 0,
    expense: total,
    net: (income[0]?.total ?? 0) - total,
    transactionCount: byCategory.reduce((sum, row) => sum + row.count, 0),
    categories: byCategory.map((row) => ({
      name: names.get(String(row._id)) ?? "Uncategorised",
      total: row.total,
      percentage: total > 0 ? Math.round((row.total / total) * 100) : 0,
    })),
  };
}

function buildSummaryText(current, previous, user) {
  const name = String(user?.name ?? "").split(" ")[0] || "there";
  const parts = [];

  if (current.transactionCount === 0) {
    parts.push(
      `${name}, there is nothing logged for ${current.month} yet, so there is no pattern to read. Log a few transactions and this page fills itself in.`,
    );
  } else {
    const balance = current.net >= 0
      ? `${money(current.net)} left over this month`
      : `${money(Math.abs(current.net))} more than came in this month`;
    parts.push(
      `${name}, you logged ${plural(current.transactionCount, "transaction", "transactions")} in ${current.month} and ${balance}.`,
    );

    if (current.categories[0]) {
      const top = current.categories[0];
      const wasTop = previous.categories[0];
      let line = `${top.name} is your biggest expense at ${money(top.total)}, ${top.percentage}% of what you spent.`;
      if (wasTop && wasTop.name === top.name) {
        const change = Math.round(((top.total - wasTop.total) / (wasTop.total || 1)) * 100);
        if (Math.abs(change) >= 10) {
          line += ` That is ${change > 0 ? "up" : "down"} ${Math.abs(change)}% on last month.`;
        } else {
          line += " That is about the same as last month.";
        }
      } else if (wasTop) {
        line += ` Last month ${wasTop.name} was your biggest.`;
      }
      parts.push(line);
    }

    const rising = current.categories.find((category) => {
      const before = previous.categories.find((row) => row.name === category.name);
      if (!before || before.total <= 0) return false;
      return (category.total - before.total) / before.total >= 0.4;
    });
    if (rising) {
      const before = previous.categories.find((row) => row.name === rising.name);
      const change = Math.round(((rising.total - before.total) / before.total) * 100);
      parts.push(`${rising.name} is up ${change}% on last month, which is worth a look.`);
    }
  }

  return parts.join(" ");
}

async function buildTipText(userId, current, user) {
  const goal = Number(user?.monthly_savings_goal ?? 0);
  const budgetRows = await Budget.find({ user_id: userId, month: current.month }).lean();

  if (current.transactionCount === 0) {
    return "Start by logging one transaction today. Small steps are easier to keep than big ones.";
  }

  const lines = [];

  if (goal > 0) {
    const saved = current.net;
    if (saved >= goal) {
      lines.push(
        `You are on track for your ${money(goal)} goal: ${money(saved)} saved so far.`,
      );
    }
    const today = todayString();
    const inMonth = today.startsWith(current.month);
    const dayOfMonth = inMonth ? Number(today.slice(8, 10)) : new Date(`${current.month}-28`).getUTCDate();
    const pace = (saved / Math.max(1, dayOfMonth)) * 30;
    if (pace < goal) {
      lines.push(
        `At this pace you will save about ${money(Math.max(0, pace))} this month, short of your ${money(goal)} goal.`,
      );
    } else {
      lines.push(`At this pace you will save about ${money(pace)}, past your ${money(goal)} goal.`);
    }
  }

  for (const budget of budgetRows) {
    if (budget.limit_amount <= 0) continue;
    const category = await Category.findById(budget.category_id).select("name").lean();
    const name = category?.name ?? "that category";
    const used = current.categories.find((row) => row.name === name);
    if (!used) continue;
    const ratio = used.total / budget.limit_amount;
    if (ratio >= 1) {
      lines.push(
        `${name} is over its ${money(budget.limit_amount)} budget at ${money(used.total)}. Moving one big item out of it this week is usually enough.`,
      );
    } else if (ratio >= 0.8) {
      lines.push(
        `${name} is at ${Math.round(ratio * 100)}% of its budget with ${money(budget.limit_amount - used.total)} left.`,
      );
    }
  }

  if (!lines.length) {
    const top = current.categories[0];
    if (top) {
      lines.push(
        `A weekly cap of ${money(top.total / 4)} on ${top.name} is roughly what you are already spending.`,
      );
    }
  }

  return lines.slice(0, 3).join(" ");
}

// Writes the Insight for one month. A month that already has one is left alone
// unless the caller asked for a fresh read, so opening the page does not rewrite
// the narrative a student has already read.
export async function generateInsight(userId, month, { force = false } = {}) {
  if (!force) {
    const existing = await Insight.findOne({ user_id: userId, month }).lean();
    if (existing) return serialize(existing, "insight_id");
  }

  const [user, current, previous] = await Promise.all([
    User.findById(userId).select("name monthly_savings_goal").lean(),
    monthTotals(userId, month),
    monthTotals(userId, previousMonth(month)),
  ]);

  const summary = buildSummaryText(current, previous, user);
  const tip = await buildTipText(userId, current, user);

  // Upsert, not create. Two of the student's own tabs asking for the same month
  // at the same time is ordinary, and the unique index on (user_id, month) is the
  // database's answer to it: without an upsert the loser of that race sees a
  // duplicate key error instead of the insight they asked for.
  const written = await Insight.findOneAndUpdate(
    { user_id: userId, month },
    { $set: { summary_text: summary, tip_text: tip, generated_at: new Date() } },
    { upsert: true, returnDocument: "after" },
  )
    .lean();

  return serialize(written, "insight_id");
}

export async function listInsights(userId) {
  const rows = await Insight.find({ user_id: userId })
    .sort({ month: -1 })
    .limit(MAX_HISTORY)
    .lean();
  return serializeAll(rows, "insight_id");
}

export async function getInsight(userId, month) {
  const found = await Insight.findOne({ user_id: userId, month }).lean();
  if (!found) throw ApiError.notFound("There is no insight for that month yet.");
  return serialize(found, "insight_id");
}

export async function getOrGenerateInsight(userId, month) {
  const found = await Insight.findOne({ user_id: userId, month }).lean();
  if (found) return serialize(found, "insight_id");
  return generateInsight(userId, month);
}

// Only a student asking for a fresh read rewrites their own month, and the
// upsert settles a race between two of them doing it at once.
export async function regenerateInsight(userId, month) {
  return generateInsight(userId, month, { force: true });
}

export async function currentMonthKey() {
  return monthKey(todayString());
}
