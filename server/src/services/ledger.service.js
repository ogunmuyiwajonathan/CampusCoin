import ApiError from "../utils/ApiError.js";
import { serialize, serializeAll } from "../utils/idOptions.js";
import { Budget, Category, Notification, Transaction } from "../models/index.js";

export const ALERT_NEAR = 0.95;
export const ALERT_OVER = 1;

// Categories a student may see: the system defaults plus their own. Scoped in one
// place because every other query filters on the same thing, and a route that
// forgot the filter would leak another student's personal categories.
export function visibleCategories(userId) {
  return { $or: [{ user_id: null }, { user_id: userId }] };
}

export async function listCategories(userId) {
  const rows = await Category.find(visibleCategories(userId)).sort({ type: 1, name: 1 }).lean();
  return serializeAll(rows, "category_id");
}

export async function createCategory(userId, body) {
  // The database has a unique index on (user_id, name, type), so this check is
  // for a friendly message rather than for correctness.
  const clash = await Category.findOne({
    user_id: userId,
    name: body.name,
    type: body.type,
  }).lean();
  if (clash) {
    throw ApiError.conflict(`You already have a ${body.type} category called ${body.name}.`);
  }
  return Category.create({
    ...body,
    // A personal category is never a default, whatever the client sent.
    is_default: false,
    user_id: userId,
  });
}

export async function updateCategory(userId, id, body) {
  const category = await Category.findOneAndUpdate(
    { _id: id, user_id: userId },
    { $set: body },
    { new: true, runValidators: true },
  ).lean();
  if (!category) {
    throw ApiError.notFound("That category was not found, or it is one of the defaults.");
  }
  return category;
}

// A default category is shared by everyone, so deleting one would break other
// students' history. What is allowed is hiding it from the student who wants it
// gone, which is what the SRS means by managing your own categories.
export async function deleteCategory(userId, id) {
  const category = await Category.findOneAndDelete({ _id: id, user_id: userId }).lean();
  if (category) return category;

  const inUse = await Transaction.exists({ user_id: userId, category_id: id });
  if (inUse) {
    throw ApiError.conflict("That category has transactions on it. Move them first.");
  }
  throw ApiError.forbidden("The default categories cannot be deleted.");
}

// The month window is built from string dates, which compare correctly as ISO
// strings, so no timezone maths is involved anywhere in this file.
function monthWindow(month) {
  if (!month) return null;
  return { $gte: `${month}-01`, $lte: `${month}-31` };
}

export async function listTransactions(userId, month) {
  const query = { user_id: userId };
  const window = monthWindow(month);
  if (window) query.date = window;
  const rows = await Transaction.find(query).sort({ date: -1, createdAt: -1 }).lean();
  return serializeAll(rows, "transaction_id");
}

async function assertOwnsCategory(userId, categoryId) {
  const category = await Category.findOne({
    _id: categoryId,
    $or: [{ user_id: null }, { user_id: userId }],
  })
    .select("type")
    .lean();
  if (!category) throw ApiError.badRequest("That category was not found.");
  return category;
}

export async function createTransaction(userId, body) {
  const category = await assertOwnsCategory(userId, body.category_id);
  // The type is taken from the category rather than trusted from the client, so
  // an expense cannot be filed as income by posting a different type.
  const transaction = await Transaction.create({
    ...body,
    user_id: userId,
    type: category.type,
    frequency: body.is_recurring ? body.frequency ?? "monthly" : null,
    next_run_at: body.is_recurring ? body.next_run_at ?? null : null,
  });

  await evaluateBudgets(userId, transaction);
  return transaction;
}

export async function updateTransaction(userId, id, body) {
  const existing = await Transaction.findOne({ _id: id, user_id: userId }).lean();
  if (!existing) throw ApiError.notFound("That transaction was not found.");

  if (body.category_id) {
    const category = await assertOwnsCategory(userId, body.category_id);
    body.type = category.type;
  }

  const updated = await Transaction.findOneAndUpdate(
    { _id: id, user_id: userId },
    { $set: body },
    { new: true, runValidators: true },
  ).lean();

  await evaluateBudgets(userId, updated);
  return updated;
}

export async function deleteTransaction(userId, id) {
  const removed = await Transaction.findOneAndDelete({ _id: id, user_id: userId }).lean();
  if (!removed) throw ApiError.notFound("That transaction was not found.");
  return removed;
}

// ------------------------------------------------------- budgets and alerts

export async function listBudgets(userId, month) {
  const query = { user_id: userId };
  if (month) query.month = month;
  const budgets = await Budget.find(query).sort({ month: -1 }).lean();
  if (!budgets.length) return [];

  // Spent is one aggregation over the whole window rather than a query per
  // budget, which is the N+1 the SRS explicitly warns about.
  const budgetMonth = month ?? budgets[0].month;
  const spent = await Transaction.aggregate([
    { $match: { user_id: userId, date: monthWindow(budgetMonth) } },
    { $match: { type: "expense" } },
    { $group: { _id: "$category_id", total: { $sum: "$amount" } } },
  ]);

  const byCategory = new Map(spent.map((row) => [String(row._id), row.total]));
  return budgets.map((budget) => {
    const used = byCategory.get(String(budget.category_id)) ?? 0;
    const limit = budget.limit_amount;
    const ratio = limit > 0 ? used / limit : 0;
    return {
      ...serialize(budget, "budget_id"),
      spent: used,
      remaining: Math.max(0, limit - used),
      percentage: limit > 0 ? Math.round(ratio * 100) : 0,
      status: ratio >= ALERT_OVER ? "over" : ratio >= ALERT_NEAR ? "near" : "ok",
    };
  });
}

export async function createBudget(userId, body) {
  const clash = await Budget.findOne({
    user_id: userId,
    category_id: body.category_id,
    month: body.month,
  }).lean();
  if (clash) throw ApiError.conflict("You already set a limit for that category this month.");
  return Budget.create({ ...body, user_id: userId });
}

export async function updateBudget(userId, id, body) {
  const budget = await Budget.findOneAndUpdate(
    { _id: id, user_id: userId },
    { $set: body },
    { new: true, runValidators: true },
  ).lean();
  if (!budget) throw ApiError.notFound("That budget was not found.");
  return budget;
}

export async function deleteBudget(userId, id) {
  const removed = await Budget.findOneAndDelete({ _id: id, user_id: userId }).lean();
  if (!removed) throw ApiError.notFound("That budget was not found.");
  return removed;
}

// Called after every write that can move a category's total. The unique index
// on (user_id, dedupe_key) is what stops a student who logs ten transactions in
// a row from collecting ten identical alerts, so this is safe to call often.
export async function evaluateBudgets(userId, transaction) {
  if (!transaction || transaction.type !== "expense") return [];

  const budget = await Budget.findOne({
    user_id: userId,
    category_id: transaction.category_id,
    month: transaction.date.slice(0, 7),
  }).lean();
  if (!budget || budget.limit_amount <= 0) return [];

  const [{ total = 0 } = {}] = await Transaction.aggregate([
    { $match: { user_id: userId, category_id: transaction.category_id, type: "expense", date: monthWindow(budget.month) } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const ratio = total / budget.limit_amount;
  if (ratio < ALERT_NEAR) return [];

  const over = ratio >= ALERT_OVER;
  const category = await Category.findById(transaction.category_id).select("name").lean();
  const name = category?.name ?? "that category";
  const percent = Math.round(ratio * 100);

  const dedupeKey = `${over ? "budget-over" : "budget-near"}:${budget._id}`;
  const existing = await Notification.findOne({ user_id: userId, dedupe_key: dedupeKey }).lean();
  if (existing) return [];

  return Notification.create({
    user_id: userId,
    title: over ? `${name} is over budget` : `${name} is close to its limit`,
    body: over
      ? `You have spent ${percent}% of this month's ${name} limit.`
      : `You have used ${percent}% of this month's ${name} limit.`,
    icon: "wallet",
    to: "/budgets",
    dedupe_key: dedupeKey,
  });
}

// ----------------------------------------------------------- notifications

export async function listNotifications(userId) {
  const rows = await Notification.find({ user_id: userId })
    .sort({ is_read: 1, createdAt: -1 })
    .limit(50)
    .lean();
  return serializeAll(rows, "notification_id");
}

export async function markNotificationRead(userId, id) {
  const updated = await Notification.findOneAndUpdate(
    { _id: id, user_id: userId },
    { $set: { is_read: true, read_at: new Date() } },
    { new: true },
  ).lean();
  if (!updated) throw ApiError.notFound("That notification was not found.");
  return updated;
}

export async function markAllNotificationsRead(userId) {
  await Notification.updateMany(
    { user_id: userId, is_read: false },
    { $set: { is_read: true, read_at: new Date() } },
  );
  return Notification.countDocuments({ user_id: userId });
}
