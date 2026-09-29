import { serialize, serializeAll } from "../utils/idOptions.js";
import { monthKey, todayString } from "../utils/dateMath.js";
import { Budget, Category, Tip, TipTemplate, Transaction } from "../models/index.js";

function money(value) {
  return `N${Math.round(value).toLocaleString("en-NG")}`;
}

// A template is admin-authored data, never code, so a rule the engine does not
// recognise is skipped rather than guessed at. That is also why the switch below
// is exhaustive: adding a rule means adding a case here, and anything else is
// inert.
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

// Each rule takes the same context and answers one question about the student's
// own numbers, returning the text and the money at stake or null when it does not
// apply. They are all async and all take the whole context, so adding a rule never
// means changing how an existing one is called.
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

// Regenerates the student's tips for a month from the templates that are active
// now, then re-reads them. Each template's tip is updated in place and matched
// on template_key, so a template whose wording an admin changed reaches the
// student on their next read, and a template the admin deactivated simply stops
// being written.
//
// Updating in place rather than deleting and reinserting is what makes pin and
// dismiss survive: the row is the same row, so the flags on it are untouched by
// a regeneration. Toggling a rule, editing a template, or a second tab rendering
// the dashboard all leave a pinned tip pinned.
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

  // A rule that no longer applies is removed rather than left behind, so a
  // student who brings a category under its threshold stops being warned about
  // it. Dismissed tips are kept: the student asked to stop seeing them, and
  // keeping the row is what lets them bring one back.
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

// Regenerates on every read. The upsert above makes that cheap when nothing has
// changed, and it is what lets a deactivated template or an edited wording reach
// the student without anyone having to remember to invalidate a cache.
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

// Dismissed tips are read back separately, because a student who hid a tip still
// needs a way to see that they hid one and undo it.
export async function listDismissedTips(userId, month) {
  const rows = await Tip.find({ user_id: userId, month, is_dismissed: true })
    .sort({ dismissed_at: -1 })
    .lean();
  return serializeAll(rows, "tip_id");
}

// Scoped to the owner on every write. A tip id belonging to another student
// matches nothing here, so the caller gets a 404 rather than a chance to change
// someone else's state.
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
