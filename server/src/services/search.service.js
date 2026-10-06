import mongoose from "mongoose";
import {
  Bookmark,
  Budget,
  Category,
  Notification,
  TipTemplate,
  Transaction,
  User,
} from "../models/index.js";
import { Announcement } from "../models/Announcement.js";
import { escapeRegExp } from "../utils/regex.js";

/**
 * One dropdown shows at most this many rows per group, and the server never
 * reads more than this many either. A typeahead does not need the full set, and
 * a small limit is what keeps every query on a bounded index range.
 */
export const SEARCH_LIMIT = 5;

/** Only these fields are read, and only these fields leave the server. */
const TRANSACTION_FIELDS = "description amount type date category_id";
const BUDGET_FIELDS = "month limit_amount category_id";
const BOOKMARK_FIELDS = "month note";
const NOTIFICATION_FIELDS = "title body to is_read";
const USER_FIELDS = "name email is_active role";
const CATEGORY_FIELDS = "name type";
const TIP_FIELDS = "key text savings_impact is_active";
const ANNOUNCEMENT_FIELDS = "title body active createdAt";

const MONTH_LABEL = { month: "long", year: "numeric", timeZone: "UTC" };

export function monthLabel(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return "Saved month";
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1, 1)).toLocaleDateString("en-GB", MONTH_LABEL);
}

export function dayLabel(date) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  const [year, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function clip(text, max) {
  const value = String(text ?? "").trim();
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function withQuery(path, query, extra = {}) {
  const params = new URLSearchParams({ q: query, ...extra });
  return `${path}?${params.toString()}`;
}

/**
 * Every `$regex` below is built from this and nothing else. The user's text is
 * escaped first, so ".*" can only ever mean two literal characters and "(" can
 * only ever mean a bracket - the pattern cannot be used to change what the query
 * means, and it can never be an invalid pattern that throws.
 */
function textPattern(query) {
  return { $regex: escapeRegExp(query), $options: "i" };
}

const AMOUNT_TEXT = /^[0-9][0-9,. ]*$/;

/**
 * "2,500" and "2500" must both find an amount of 2500.50. The digits a person
 * types are a *prefix* of the stored amount, not a numeric range, so the value
 * is rendered to its own decimal text and the digits are matched against the
 * front of it. Commas and spaces are dropped first, which is the whole point -
 * "2,500" and "2500" reduce to the same prefix. The pattern is anchored and
 * escaped, so it stays a literal prefix rather than a wildcard.
 */
function amountBranch(query) {
  const digits = query.replace(/[,\s]/g, "");
  if (!AMOUNT_TEXT.test(query) || !/^[0-9]+(\.[0-9]+)?$/.test(digits)) return null;
  return { $expr: { $regexMatch: { input: { $toString: "$amount" }, regex: `^${escapeRegExp(digits)}` } } };
}

/** The default categories (user_id null) plus the student's own. */
export function visibleCategories(userId) {
  return { $or: [{ user_id: null }, { user_id: userId }] };
}

function group(type, label, items, seeAll) {
  return items.length ? { type, label, seeAll, items } : null;
}

/** The five groups a signed-in student can search, in the order they are shown. */
export async function searchStudentData(userId, rawQuery) {
  const query = String(rawQuery ?? "").trim();
  const pattern = textPattern(query);
  const amount = amountBranch(query);

  // The categories are read first because the transaction and budget matches
  // both depend on which category names hit. That is one query, reused three
  // times, rather than a lookup per row.
  const hitCategories = await Category.find({
    ...visibleCategories(userId),
    name: pattern,
  })
    .select(CATEGORY_FIELDS)
    .sort({ name: 1 })
    .limit(SEARCH_LIMIT)
    .lean();

  const hitCategoryIds = hitCategories.map((row) => row._id);
  const categoryById = new Map(hitCategories.map((row) => [String(row._id), row]));

  const [transactions, budgets, bookmarks, notifications] = await Promise.all([
    Transaction.find({
      user_id: userId,
      $or: [
        { description: pattern },
        { date: pattern },
        ...(hitCategoryIds.length ? [{ category_id: { $in: hitCategoryIds } }] : []),
        ...(amount ? [amount] : []),
      ],
    })
      .select(TRANSACTION_FIELDS)
      .sort({ date: -1, _id: -1 })
      .limit(SEARCH_LIMIT)
      .lean(),

    Budget.find({
      user_id: userId,
      ...(hitCategoryIds.length
        ? { category_id: { $in: hitCategoryIds } }
        : { category_id: { $in: [] } }),
    })
      .select(BUDGET_FIELDS)
      .sort({ month: -1 })
      .limit(SEARCH_LIMIT)
      .lean(),

    Bookmark.find({ user_id: userId, note: pattern })
      .select(BOOKMARK_FIELDS)
      .sort({ createdAt: -1 })
      .limit(SEARCH_LIMIT)
      .lean(),

    Notification.find({
      user_id: userId,
      $or: [{ title: pattern }, { body: pattern }],
    })
      .select(NOTIFICATION_FIELDS)
      .sort({ is_read: 1, createdAt: -1 })
      .limit(SEARCH_LIMIT)
      .lean(),
  ]);

  // One indexed read for the names the transaction rows point at. Bounded by
  // the number of rows above, so this is not an N+1.
  const missingIds = [
    ...new Set(
      transactions
        .map((row) => String(row.category_id))
        .filter((id) => !categoryById.has(id)),
    ),
  ].map((id) => new mongoose.Types.ObjectId(id));
  const extraNames = missingIds.length
    ? await Category.find({ _id: { $in: missingIds } })
        .select(CATEGORY_FIELDS)
        .lean()
    : [];
  for (const row of extraNames) categoryById.set(String(row._id), row);

  const groups = [
    group(
      "transaction",
      "Transactions",
      transactions.map((row, index) => {
        const name = categoryById.get(String(row.category_id))?.name ?? "Category";
        const month = row.date?.slice(0, 7) ?? "";
        return {
          key: `transaction-${index}`,
          title: clip(row.description, 80) || name,
          subtitle: `${name} · ${dayLabel(row.date)}`,
          meta: row.type === "income" ? "Income" : "Expense",
          amount: row.amount,
          link: `/transactions?${new URLSearchParams({
            id: String(row._id),
            month,
          }).toString()}`,
        };
      }),
      withQuery("/transactions", query, { month: "all" }),
    ),
    group(
      "category",
      "Categories",
      hitCategories.map((row, index) => ({
        key: `category-${index}`,
        title: row.name,
        subtitle: row.type === "income" ? "Income category" : "Expense category",
        link: `/transactions?${new URLSearchParams({
          category: String(row._id),
          month: "all",
        }).toString()}`,
      })),
      withQuery("/transactions", query, { category: "all", month: "all" }),
    ),
    group(
      "budget",
      "Budgets",
      budgets.map((row, index) => ({
        key: `budget-${index}`,
        title: categoryById.get(String(row.category_id))?.name ?? "Budget",
        subtitle: `${monthLabel(row.month)} limit`,
        amount: row.limit_amount,
        link: `/budgets?month=${encodeURIComponent(row.month)}`,
      })),
      withQuery("/budgets", query, { month: "all" }),
    ),
    group(
      "bookmark",
      "Bookmarks",
      bookmarks.map((row, index) => ({
        key: `bookmark-${index}`,
        title: clip(row.note, 80) || monthLabel(row.month),
        subtitle: monthLabel(row.month),
        link: `/bookmarks?month=${encodeURIComponent(row.month ?? "")}`,
      })),
      withQuery("/bookmarks", query),
    ),
    group(
      "notification",
      "Notifications",
      notifications.map((row, index) => ({
        key: `notification-${index}`,
        title: clip(row.title, 80),
        subtitle: clip(row.body, 120),
        meta: row.is_read ? "" : "New",
        link: "/notifications",
      })),
      withQuery("/notifications", query),
    ),
  ].filter(Boolean);

  return groups;
}

/**
 * The admin search deliberately reads none of a student's money: no
 * transactions, no budgets, no chat. It searches accounts, the shared
 * reference data an admin edits, and nothing else.
 */
export async function searchAdminData(rawQuery) {
  const query = String(rawQuery ?? "").trim();
  const pattern = textPattern(query);

  const [users, categories, templates, announcements] = await Promise.all([
    User.find({ $or: [{ name: pattern }, { email: pattern }] })
      .select(USER_FIELDS)
      .sort({ name: 1 })
      .limit(SEARCH_LIMIT)
      .lean(),

    Category.find({ is_default: true, name: pattern })
      .select(CATEGORY_FIELDS)
      .sort({ name: 1 })
      .limit(SEARCH_LIMIT)
      .lean(),

    TipTemplate.find({ $or: [{ text: pattern }, { key: pattern }] })
      .select(TIP_FIELDS)
      .sort({ savings_impact: -1 })
      .limit(SEARCH_LIMIT)
      .lean(),

    Announcement.find({ $or: [{ title: pattern }, { body: pattern }] })
      .select(ANNOUNCEMENT_FIELDS)
      .sort({ createdAt: -1 })
      .limit(SEARCH_LIMIT)
      .lean(),
  ]);

  return [
    group(
      "user",
      "Users",
      users.map((row, index) => ({
        key: `user-${index}`,
        title: row.name,
        subtitle: row.email,
        meta: [row.is_active ? "Active" : "Disabled", row.role === "admin" ? "Admin" : "Student"].join(
          " · ",
        ),
        link: `/admin/users?search=${encodeURIComponent(row.email)}`,
      })),
      `/admin/users?search=${encodeURIComponent(query)}`,
    ),
    group(
      "category",
      "Default categories",
      categories.map((row, index) => ({
        key: `admin-category-${index}`,
        title: row.name,
        subtitle: row.type === "income" ? "Income category" : "Expense category",
        link: `/admin/categories?search=${encodeURIComponent(row.name)}`,
      })),
      `/admin/categories?search=${encodeURIComponent(query)}`,
    ),
    group(
      "tip",
      "Tip templates",
      templates.map((row, index) => ({
        key: `tip-${index}`,
        title: clip(row.text, 90),
        subtitle: row.is_active ? row.key : `${row.key} · inactive`,
        link: `/admin/tips?search=${encodeURIComponent(row.key)}`,
      })),
      `/admin/tips?search=${encodeURIComponent(query)}`,
    ),
    group(
      "announcement",
      "Announcements",
      announcements.map((row, index) => ({
        key: `announcement-${index}`,
        title: clip(row.title, 80),
        subtitle: clip(row.body, 120),
        meta: row.active ? "" : "Hidden",
        link: `/admin/announcements?search=${encodeURIComponent(row.title)}`,
      })),
      `/admin/announcements?search=${encodeURIComponent(query)}`,
    ),
  ].filter(Boolean);
}

export function searchResponse(groups, query) {
  return {
    query,
    total: groups.reduce((sum, entry) => sum + entry.items.length, 0),
    groups,
  };
}