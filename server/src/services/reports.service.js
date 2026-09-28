import mongoose from "mongoose";
import { Category, Transaction } from "../models/index.js";
import { visibleCategories } from "./ledger.service.js";

// `user_id` on every model is a virtual that stringifies _id, which is what the
// session and the JSON responses carry. find() casts that string back to an
// ObjectId for you; aggregate() does NOT cast anything, so a raw string in a
// $match silently matches zero rows. Every pipeline below goes through here.
function ownerId(userId) {
  return mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(String(userId))
    : userId;
}

// date is stored as a YYYY-MM-DD string, so a range filter is a plain string
// range: no date maths, no timezone, and it uses the user_id + date index.
function dateRange(from, to) {
  if (from && to) return { $gte: from, $lte: to };
  if (from) return { $gte: from };
  if (to) return { $lte: to };
  return null;
}

// One bucket key per granularity. %G-%V is the ISO week-year and week, which is
// what "weekly" means to a student, and it lines up with the Monday-start
// calendar they keep their budgets on.
const BUCKET_FORMAT = {
  day: "%Y-%m-%d",
  week: "%G-W%V",
  month: "%Y-%m",
};

// The stored string is turned back into a real date only so Mongo can bucket
// it. Every figure below still comes from one $group, never from summing rows
// the client already has.
function toDate() {
  return { $dateFromString: { dateString: "$date", onError: null, onNull: null } };
}

function matchFor(userId, from, to, categoryId) {
  const match = { user_id: ownerId(userId) };
  const range = dateRange(from, to);
  if (range) match.date = range;
  if (categoryId) match.category_id = new mongoose.Types.ObjectId(String(categoryId));
  return match;
}

export async function getReportTotals(userId, { from, to, categoryId }) {
  const rows = await Transaction.aggregate([
    { $match: matchFor(userId, from, to, categoryId) },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);
  const byType = Object.fromEntries(rows.map((r) => [r._id, r.total]));
  const counts = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  const income = byType.income ?? 0;
  const expense = byType.expense ?? 0;
  return {
    income,
    expense,
    net: income - expense,
    count: (counts.income ?? 0) + (counts.expense ?? 0),
  };
}

export async function getReportByCategory(userId, { from, to, categoryId }) {
  const rows = await Transaction.aggregate([
    { $match: matchFor(userId, from, to, categoryId) },
    {
      $group: {
        _id: { category_id: "$category_id", type: "$type" },
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ]);

  // Names are resolved in one read rather than a lookup per row.
  const ids = [...new Set(rows.map((r) => r._id.category_id).filter(Boolean))];
  const categories = await Category.find({ _id: { $in: ids } })
    .select("name type color icon_key")
    .lean();
  const byId = new Map(categories.map((c) => [String(c._id), c]));

  return rows.map((r) => {
    const category = byId.get(String(r._id.category_id));
    return {
      category_id: String(r._id.category_id),
      category: category?.name ?? "Uncategorised",
      type: r._id.type,
      color: category?.color ?? null,
      icon_key: category?.icon_key ?? null,
      total: r.total,
      count: r.count,
    };
  });
}

export async function getReportBuckets(userId, { from, to, categoryId, granularity }) {
  const format = BUCKET_FORMAT[granularity] ?? BUCKET_FORMAT.day;
  const rows = await Transaction.aggregate([
    { $match: matchFor(userId, from, to, categoryId) },
    { $addFields: { d: toDate() } },
    {
      $group: {
        _id: { key: { $dateToString: { format, date: "$d" } }, type: "$type" },
        total: { $sum: "$amount" },
      },
    },
    { $sort: { "_id.key": 1 } },
  ]);

  const buckets = new Map();
  for (const row of rows) {
    if (!row._id.key) continue;
    const entry = buckets.get(row._id.key) ?? { bucket: row._id.key, income: 0, expense: 0 };
    entry[row._id.type] += row.total;
    buckets.set(row._id.key, entry);
  }
  return [...buckets.values()].map((b) => ({ ...b, net: b.income - b.expense }));
}

// The trend chart always shows six months ending at the range the student is
// looking at, so the chart and the table can never disagree about "now".
export async function getReportTrend(userId, { to }) {
  const end = to ?? new Date().toISOString().slice(0, 10);
  const [year, month] = end.split("-").map(Number);
  const months = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(year, month - 1 - i, 1));
    months.push(d.toISOString().slice(0, 7));
  }
  const first = `${months[0]}-01`;

  const rows = await Transaction.aggregate([
    { $match: { user_id: ownerId(userId), date: { $gte: first, $lte: end } } },
    {
      $group: {
        _id: { key: { $substrBytes: ["$date", 0, 7] }, type: "$type" },
        total: { $sum: "$amount" },
      },
    },
  ]);

  const byMonth = new Map(months.map((m) => [m, { month: m, income: 0, expense: 0 }]));
  for (const row of rows) {
    const entry = byMonth.get(row._id.key);
    if (entry) entry[row._id.type] += row.total;
  }
  return [...byMonth.values()].map((m) => ({ ...m, net: m.income - m.expense }));
}

export async function buildReport(userId, query) {
  const [totals, byCategory, buckets, trend] = await Promise.all([
    getReportTotals(userId, query),
    getReportByCategory(userId, query),
    getReportBuckets(userId, query),
    getReportTrend(userId, query),
  ]);
  return { ...query, totals, byCategory, buckets, trend };
}

// Names for the category filter, scoped the same way as every other read.
export async function listReportCategories(userId) {
  return Category.find(visibleCategories(userId)).select("name type").sort({ name: 1 }).lean();
}
