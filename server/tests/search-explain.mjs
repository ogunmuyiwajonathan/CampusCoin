import "dotenv/config";
import mongoose from "mongoose";
import { useTestDatabaseEnv } from "./helpers/testDb.js";

useTestDatabaseEnv();

const { connectDb, disconnectDb } = await import("../src/config/db.js");
const { searchStudentData, searchAdminData } = await import("../src/services/search.service.js");

/**
 * Prints the winning plan for every query the search service runs. Run against a
 * populated database - an empty collection answers COLLSCAN because there is
 * nothing to choose from, which is why this seeds its own rows first.
 */
const stamp = Date.now();

/**
 * Walks a winning plan for the deepest IXSCAN. A plan is a tree of stages
 * (PROJECTION_SIMPLE -> FETCH -> IXSCAN, or FETCH -> OR -> IXSCAN), so the scan
 * is found by descent rather than by a fixed depth. A COLLSCAN anywhere on the
 * path - or no IXSCAN at all - counts as a collection scan.
 */
function findScan(plan) {
  const indexes = [];
  const walks = [];
  const visit = (node, depth) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((entry) => visit(entry, depth));
      return;
    }
    if (node.stage === "IXSCAN") indexes.push(node.indexName ?? "(unnamed)");
    if (node.stage === "COLLSCAN") walks.push("COLLSCAN");
    if (node.stage && node.stage !== "IXSCAN" && node.stage !== "COLLSCAN") walks.push(node.stage);
    for (const value of Object.values(node)) visit(value, depth + 1);
  };
  visit(plan, 0);
  return { indexes, stages: walks };
}

function summarise(label, explain) {
  const plan =
    explain.queryPlanner?.winningPlan ?? explain.stages?.[0]?.$cursor?.queryPlanner?.winningPlan ?? null;
  const { indexes } = findScan(plan);
  const stats = explain.executionStats ?? explain.stages?.[0]?.$cursor?.executionStats ?? {};
  const docs = stats.totalDocsExamined ?? "?";
  const keys = stats.totalKeysExamined ?? "?";
  const scanned = indexes.length === 0;
  const scan = scanned ? "COLLSCAN" : `IXSCAN ${indexes.join("+")}`;
  console.log(`${label.padEnd(34)} ${scan.padEnd(52)} keys=${keys} docs=${docs}`);
  return !scanned;
}

function short(text, n) {
  const value = String(text ?? "");
  return value.length > n ? `${value.slice(0, n)}…` : value;
}

function flag(label, indexed) {
  console.log(`${indexed ? "  indexed " : "  scanned"}  ${label}`);
}

async function explain(label, model, filter, projection, sort) {
  const query = model.find(filter).select(projection);
  if (sort) query.sort(sort);
  const plan = await query.explain("executionStats");
  flag(label, summarise(label, plan));
}

await connectDb();
await mongoose.connection.dropDatabase();

const { User, Category, Transaction, Budget, Bookmark, Notification, TipTemplate } =
  await import("../src/models/index.js");
const { Announcement } = await import("../src/models/Announcement.js");

const admin = await User.create({
  name: "Search Admin",
  email: `explain.admin.${stamp}@campuscoin.test`,
  password_hash: "x",
  role: "admin",
  is_active: true,
  profileOnboarded: true,
});

const owner = await User.create({
  name: "Explain Owner",
  email: `explain.owner.${stamp}@campuscoin.test`,
  password_hash: "x",
  role: "student",
  is_active: true,
  profileOnboarded: true,
});

const food = await Category.create({ name: "Food", type: "expense", is_default: true });
const transport = await Category.create({ name: "Transport", type: "expense", is_default: true });

const rows = Array.from({ length: 400 }, (_, i) => ({
  user_id: owner._id,
  category_id: i % 2 === 0 ? food._id : transport._id,
  type: "expense",
  amount: 2000 + i * 10 + (i % 10) / 10,
  description: `Row ${i} canteen food`,
  date: `2026-0${(i % 9) + 1}-1${i % 9}`,
}));
rows.push({
  user_id: owner._id,
  category_id: food._id,
  type: "expense",
  amount: 2500.5,
  description: "Exactly the amount the spec names",
  date: "2026-09-30",
});
await Transaction.insertMany(rows);

await Budget.create({ user_id: owner._id, category_id: food._id, month: "2026-09", limit_amount: 30000 });
await Bookmark.create({ user_id: owner._id, month: "2026-09", note: "food term review" });
await Notification.create({
  user_id: owner._id,
  title: "Food budget alert",
  body: "You are close to your Food limit.",
  to: "/budgets",
  dedupe_key: `explain-${stamp}`,
});
await TipTemplate.create({ key: `explain_${stamp}`, text: "Cook at home to save on food.", rule: "manual" });
await Announcement.create({
  title: "Orientation week",
  body: "Come to the faculty orientation.",
  active: true,
  createdBy: admin._id,
});

console.log(`\nSeeded 400+ transactions for one student. Plans for q="food":\n`);

const OWNER_SCOPE = { user_id: owner._id };
const DATE_SORT = { date: -1, _id: -1 };
const RX = (field, value) => ({ [field]: { $regex: value, $options: "i" } });
const TEXT_FIELDS = "description amount type date category_id";

console.log("student (scoped by session user_id)");
await explain("transactions (description)", Transaction, { ...OWNER_SCOPE, $or: [RX("description", "food")] }, TEXT_FIELDS, DATE_SORT);
await explain("transactions (date text)", Transaction, { ...OWNER_SCOPE, $or: [RX("date", "2026-09")] }, TEXT_FIELDS, DATE_SORT);
await explain("categories (defaults + own)", Category, { $or: [{ user_id: null }, { user_id: owner._id }], ...RX("name", "food") }, "name type", { name: 1 });
await explain("category name map (by _id)", Category, { _id: { $in: [food._id] } }, "name type", null);
await explain("budgets", Budget, { ...OWNER_SCOPE, category_id: { $in: [food._id] } }, "month limit_amount category_id", { month: -1 });
await explain("bookmarks", Bookmark, { ...OWNER_SCOPE, ...RX("note", "food") }, "month note", { createdAt: -1 });
await explain("notifications", Notification, { ...OWNER_SCOPE, $or: [RX("title", "food"), RX("body", "food")] }, "title body to is_read", { is_read: 1, createdAt: -1 });

console.log('\nstudent amount prefix (q="2,500")');
await explain(
  "transactions (amount prefix)",
  Transaction,
  {
    ...OWNER_SCOPE,
    $or: [{ $expr: { $regexMatch: { input: { $toString: "$amount" }, regex: "^2500" } } }],
  },
  TEXT_FIELDS,
  DATE_SORT,
);

console.log("\nadmin");
await explain("users (name or email)", User, { $or: [RX("name", "owner"), RX("email", "owner")] }, "name email is_active role", { name: 1 });
await explain("default categories", Category, { is_default: true, ...RX("name", "food") }, "name type", { name: 1 });
await explain("tip templates", TipTemplate, { $or: [RX("text", "food"), RX("key", "food")] }, "key text savings_impact is_active", { savings_impact: -1 });
await explain("announcements", Announcement, { $or: [RX("title", "orientation"), RX("body", "orientation")] }, "title body active createdAt", { createdAt: -1 });

console.log("\nend-to-end result counts");
for (const q of ["food", "2,500", "2500", "2.5"]) {
  const groups = await searchStudentData(owner._id, q);
  const counts = groups.map((g) => `${g.label}:${g.items.length}`).join(" ");
  console.log(`  q=${JSON.stringify(q).padEnd(9)} ${counts || "(no groups)"}`);
}
const adminGroups = await searchAdminData(`explain.owner.${stamp}@campuscoin.test`);
console.log(`  admin user search -> ${short(JSON.stringify(adminGroups[0]?.items ?? []), 200)}`);

await mongoose.connection.dropDatabase();
await disconnectDb();