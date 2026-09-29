import { serialize, serializeAll } from "../utils/idOptions.js";
import { monthKey, todayString } from "../utils/dateMath.js";
import { Budget, Category, Tip, TipTemplate, Transaction } from "../models/index.js";

function money(value) {
  return `N${Math.round(value).toLocaleString("en-NG")}`;
}

function fill(text, values) {
  return text.replace(/\{(\w+)\}/g, (match, key) =>
    values[key] === undefined || values[key] === null ? match : String(values[key]),
  );
}

async function monthSnapshot(userId, month) {
  const from = `${month}-01`;
  const to = `${month}-31`;

  const [expense, count] = await Promise.all([
    Transaction.aggregate([
      { $match: { user_id: userId, type: "expense", date: { $gte: from, $lte: to } } },
      { $group: { _id: "$category_id", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
    ]),
    Transaction.countDocuments({ user_id: userId, date: { $gte: from, $lte: to } }),
  ]);

  const ids = expense.map((row) => row._id).filter(Boolean);
  const categories = ids.length
    ? await Category.find({ _id: { $in: ids } }).select("name").lean()
    : [];
  const names = new Map(categories.map((category) => [String(category._id), category.name]));

  return {
    month,
    totalExpense: expense.reduce((sum, row) => sum + row.total, 0),
    transactionCount: count,
    byCategory: expense.map((row) => ({
      categoryId: row._id,
      name: names.get(String(row._id)) ?? "Uncategorised",
      total: row.total,
    })),
  };
}

const RULES = {
  async category_share_above({ snapshot }, template) {
    const threshold = template.threshold ?? 30;
    const top = snapshot.byCategory[0];
    if (!top || snapshot.totalExpense <= 0) return null;
    const share = (top.total / snapshot.totalExpense) * 100;
    if (share < threshold) return null;
    return {
      text: fill(template.text, {
        category: top.name,
        percentage: Math.round(share),
        weekly: money(top.total / 4),
      }),
      savings_impact: template.savings_impact ?? 0,
    };
  },

  async budget_near_limit({ snapshot, budgetRows }, template) {
    const threshold = template.threshold ?? 95;
    for (const budget of budgetRows) {
      if (budget.limit_amount <= 0) continue;
      const category = await Category.findById(budget.category_id).select("name").lean();
      const name = category?.name ?? "that category";
      const spent = snapshot.byCategory.find((row) => row.name === name)?.total ?? 0;
      const ratio = (spent / budget.limit_amount) * 100;
      if (ratio < threshold) continue;
      return {
        text: fill(template.text, {
          category: name,
          percentage: Math.round(ratio),
          remaining: money(Math.max(0, budget.limit_amount - spent)),
        }),
        savings_impact: template.savings_impact ?? 0,
      };
    }
    return null;
  },

  async no_transactions({ snapshot }, template) {
    if (snapshot.transactionCount > 0) return null;
    return {
      text: template.text,
      savings_impact: template.savings_impact ?? 0,
    };
  },
};

export async function generateTips(userId, month) {
  const templates = await TipTemplate.find({ is_active: true })
    .sort({ savings_impact: -1 })
    .lean();

  const snapshot = await monthSnapshot(userId, month);
  const budgetRows = await Budget.find({ user_id: userId, month }).lean();

  const applied = new Set();
  for (const template of templates) {
    const handler = RULES[template.rule];
    if (!handler) continue;
    const result = await handler({ userId, snapshot, budgetRows }, template);
    if (!result?.text) continue;

    applied.add(template.key);
    await Tip.findOneAndUpdate(
      { user_id: userId, month, template_key: template.key },
      { $set: { text: result.text, savings_impact: result.savings_impact } },
      { upsert: true },
    );
  }

  await Tip.deleteMany({
    user_id: userId,
    month,
    is_dismissed: false,
    ...(applied.size ? { template_key: { $nin: [...applied] } } : {}),
  });

  const rows = await Tip.find({ user_id: userId, month })
    .sort({ is_pinned: -1, savings_impact: -1 })
    .lean();
  return serializeAll(rows, "tip_id");
}

export async function listTips(userId, month) {
  await generateTips(userId, month);
  return readTips(userId, month);
}

async function readTips(userId, month) {
  const rows = await Tip.find({ user_id: userId, month, is_dismissed: false })
    .sort({ is_pinned: -1, savings_impact: -1 })
    .lean();
  return serializeAll(rows, "tip_id");
}

export async function listDismissedTips(userId, month) {
  const rows = await Tip.find({ user_id: userId, month, is_dismissed: true })
    .sort({ dismissed_at: -1 })
    .lean();
  return serializeAll(rows, "tip_id");
}

async function ownTip(userId, id) {
  return Tip.exists({ _id: id, user_id: userId });
}

export async function setTipPinned(userId, id, isPinned) {
  if (!(await ownTip(userId, id))) return null;
  const updated = await Tip.findOneAndUpdate(
    { _id: id, user_id: userId },
    { $set: { is_pinned: isPinned } },
    { new: true },
  ).lean();
  return serialize(updated, "tip_id");
}

export async function dismissTip(userId, id) {
  if (!(await ownTip(userId, id))) return null;
  const updated = await Tip.findOneAndUpdate(
    { _id: id, user_id: userId },
    { $set: { is_dismissed: true, is_pinned: false, dismissed_at: new Date() } },
    { new: true },
  ).lean();
  return serialize(updated, "tip_id");
}

export async function restoreTip(userId, id) {
  if (!(await ownTip(userId, id))) return null;
  const updated = await Tip.findOneAndUpdate(
    { _id: id, user_id: userId },
    { $set: { is_dismissed: false, dismissed_at: null } },
    { new: true },
  ).lean();
  return serialize(updated, "tip_id");
}

export async function currentMonthKey() {
  return monthKey(todayString());
}
