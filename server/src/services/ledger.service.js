import ApiError from "../utils/ApiError.js";
import { serialize, serializeAll } from "../utils/idOptions.js";
import {
  Budget,
  Category,
  Notification,
  Transaction,
  TransactionHistory,
} from "../models/index.js";
import { isDateString, monthKey, nextRunFrom, todayString } from "../utils/dateMath.js";

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
// students' history. What is allowed is managing your own: the row is only
// removed once nothing else points at it, otherwise the student is told exactly
// what to move first rather than being left with a dangling budget.
export async function deleteCategory(userId, id) {
  const owned = await Category.exists({ _id: id, user_id: userId });
  const inUse = await Transaction.exists({ user_id: userId, category_id: id });
  const budgeted = await Budget.exists({ user_id: userId, category_id: id });

  if (owned) {
    if (inUse) {
      throw ApiError.conflict("That category has transactions on it. Move them first.");
    }
    if (budgeted) {
      throw ApiError.conflict("That category has a budget on it. Remove the budget first.");
    }
    return Category.findOneAndDelete({ _id: id, user_id: userId }).lean();
  }

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
  const frequency = body.is_recurring ? body.frequency ?? "monthly" : null;
  // A recurring row with no next_run_at would never fire, so the date is worked
  // out from the transaction's own date the first time it is saved. Anything the
  // client sent that is not a real date is ignored rather than stored broken.
  const requested = body.is_recurring && isDateString(body.next_run_at) ? body.next_run_at : null;
  const payload = {
    ...body,
    user_id: userId,
    type: category.type,
    frequency,
    next_run_at: requested ?? (frequency ? nextRunFrom(body.date, frequency) : null),
  };

  if (body.request_id) {
    const already = await Transaction.findOne({
      user_id: userId,
      request_id: body.request_id,
    }).lean();
    if (already) return already;
  }

  let transaction;
  try {
    transaction = await Transaction.create(payload);
  } catch (error) {
    // Two copies of the same click raced past the lookup above. The unique
    // index settles it: the loser reads back the row the winner just wrote
    // instead of saving the expense twice.
    if (error?.code === 11000 && body.request_id) {
      const already = await Transaction.findOne({
        user_id: userId,
        request_id: body.request_id,
      }).lean();
      if (already) return already;
    }
    throw error;
  }

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

// Deleting keeps the row's contents rather than dropping them. The live
// transaction is removed so every total, budget and report stops counting it,
// and a history document holds what it was, which is what makes an accidental
// delete recoverable instead of permanent.
export async function deleteTransaction(userId, id) {
  const removed = await Transaction.findOneAndDelete({ _id: id, user_id: userId }).lean();
  if (!removed) throw ApiError.notFound("That transaction was not found.");

  await TransactionHistory.create({
    user_id: userId,
    transaction: {
      category_id: removed.category_id,
      type: removed.type,
      amount: removed.amount,
      description: removed.description,
      date: removed.date,
      is_recurring: removed.is_recurring,
      frequency: removed.frequency,
      next_run_at: removed.next_run_at,
      import_batch_id: removed.import_batch_id,
    },
    deleted_at: new Date(),
    origin: "delete",
  });

  return removed;
}

export async function listTransactionHistory(userId) {
  const rows = await TransactionHistory.find({ user_id: userId, restored_at: null })
    .sort({ deleted_at: -1 })
    .limit(50)
    .lean();
  if (!rows.length) return [];

  const ids = [
    ...new Set(rows.map((row) => String(row.transaction?.category_id)).filter(Boolean)),
  ];
  const categories = ids.length
    ? await Category.find({ _id: { $in: ids } }).select("name color icon_key").lean()
    : [];
  const byId = new Map(categories.map((category) => [String(category._id), category]));

  return rows.map((row) => {
    const category = byId.get(String(row.transaction?.category_id));
    return {
      ...serialize(row, "history_id"),
      category: category
        ? { name: category.name, color: category.color, icon_key: category.icon_key }
        : null,
    };
  });
}

export async function restoreTransaction(userId, historyId) {
  const record = await TransactionHistory.findOne({
    _id: historyId,
    user_id: userId,
    restored_at: null,
  }).lean();
  if (!record) throw ApiError.notFound("That deleted transaction was not found.");

  const snapshot = record.transaction ?? {};
  const category = await Category.findOne({
    _id: snapshot.category_id,
    $or: [{ user_id: null }, { user_id: userId }],
  })
    .select("type")
    .lean();
  if (!category) {
    throw ApiError.conflict("That category is gone, so this cannot be restored.");
  }

  const restored = await Transaction.create({
    user_id: userId,
    category_id: snapshot.category_id,
    type: category.type,
    amount: snapshot.amount,
    description: snapshot.description ?? "",
    date: isDateString(snapshot.date) ? snapshot.date : todayString(),
    is_recurring: Boolean(snapshot.is_recurring),
    frequency: snapshot.is_recurring ? snapshot.frequency ?? "monthly" : null,
    next_run_at: null,
  });

  await TransactionHistory.updateOne(
    { _id: historyId, user_id: userId },
    { $set: { restored_at: new Date() } },
  );

  await evaluateBudgets(userId, restored);
  return restored;
}

// The next occurrence of every recurring row that is due. This is the step that
// turns the is_recurring flag into real transactions: a monthly allowance saved
// on the 20th writes itself on the 20th of every following month.
//
// It is called from listTransactions rather than a timer, so it needs no
// scheduler and no second process. The read is already the moment a student is
// looking at their ledger, which is exactly when a new entry should appear.
//
// Bounded on purpose. A row is only ever advanced one period at a time, and the
// catch-up loop stops after 24 steps, so a transaction dated years ago or a
// daily-ish frequency written by a bad client cannot stall the request.
const MAX_CATCH_UP_STEPS = 24;

export async function materialiseRecurring(userId) {
  const today = todayString();
  const due = await Transaction.find({
    user_id: userId,
    is_recurring: true,
    frequency: { $in: ["weekly", "monthly"] },
    next_run_at: { $ne: null, $lte: today },
  })
    .sort({ date: 1 })
    .limit(100)
    .lean();

  const created = [];
  const touched = new Set();

  for (const row of due) {
    if (touched.has(String(row._id))) continue;
    let next = row.next_run_at;
    let steps = 0;

    while (next <= today && steps < MAX_CATCH_UP_STEPS) {
      steps += 1;
      const duplicate = await Transaction.exists({
        user_id: userId,
        is_recurring: true,
        recurring_root: row.recurring_root ?? row._id,
        date: next,
      });
      if (!duplicate) {
        const createdRow = await Transaction.create({
          user_id: userId,
          category_id: row.category_id,
          type: row.type,
          amount: row.amount,
          description: row.description,
          date: next,
          is_recurring: false,
          frequency: null,
          next_run_at: null,
          recurring_root: row.recurring_root ?? row._id,
          generated_from: row._id,
        });
        created.push(createdRow);
      }
      next = nextRunFrom(next, row.frequency);
    }

    await Transaction.updateOne(
      { _id: row._id },
      {
        $set: {
          next_run_at: next,
          recurring_root: row.recurring_root ?? row._id,
        },
      },
    );
    touched.add(String(row._id));
  }

  if (created.length) {
    const categories = new Set(created.map((row) => String(row.category_id)));
    for (const categoryId of categories) {
      for (const month of new Set(created.map((row) => monthKey(row.date)))) {
        await evaluateBudgets(userId, {
          category_id: categoryId,
          type: "expense",
          date: `${month}-01`,
        });
      }
    }
  }

  return created;
}

export async function listTransactions(userId, month) {
  await materialiseRecurring(userId);
  const query = { user_id: userId };
  const window = monthWindow(month);
  if (window) query.date = window;
  const rows = await Transaction.find(query).sort({ date: -1, createdAt: -1 }).lean();
  return serializeAll(rows, "transaction_id");
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
