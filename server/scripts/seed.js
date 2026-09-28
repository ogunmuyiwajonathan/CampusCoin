// Seeds the demo dataset. Mirrors client/src/data/mockData.js so the app looks
// identical before and after the client is swapped onto the API.
//
// Idempotent by construction:
//   - users and categories upsert on their natural unique keys
//   - transactions, budgets and notifications are only inserted when that
//     student has none, so re-running never duplicates and never deletes
//     anything a student has since added by hand
//
// Run it twice: the second run must report the same counts as the first.
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { connectDb, disconnectDb } from "../src/config/db.js";
import { env } from "../src/config/env.js";
import {
  Budget,
  Category,
  Notification,
  TipTemplate,
  Transaction,
  User,
} from "../src/models/index.js";

const DEMO_STUDENT = {
  name: "Alex",
  email: "alex@example.com",
  academic_year: "Year 2",
  allowance_baseline: 20000,
  monthly_savings_goal: 15000,
  role: "student",
};

const DEMO_ADMIN = {
  name: "Campus Coin Admin",
  email: "admin@campuscoin.test",
  role: "admin",
};

// Documented in the submission as the credentials for each role.
const DEMO_PASSWORD = "CampusCoin2026!";
const ADMIN_PASSWORD = "AdminCampus2026!";

// name, type, is_default, color, icon - colours and icons are lifted from
// CATEGORY_COLORS / CATEGORY_ICONS in mockData.js.
const CATEGORIES = [
  { name: "Allowance", type: "income", is_default: true, color: null, icon: "wallet" },
  { name: "Scholarships", type: "income", is_default: true, color: null, icon: "graduation-cap" },
  { name: "Gigs", type: "income", is_default: false, color: null, icon: "briefcase" },
  { name: "Gifts", type: "income", is_default: true, color: null, icon: "gift" },
  { name: "Food", type: "expense", is_default: true, color: "#10b981", icon: "utensils" },
  { name: "Transport", type: "expense", is_default: true, color: "#3b82f6", icon: "bus" },
  { name: "Hostel/Rent", type: "expense", is_default: true, color: "#f59e0b", icon: "house" },
  { name: "Academics", type: "expense", is_default: true, color: "#eab308", icon: "book-open" },
  { name: "Subscriptions", type: "expense", is_default: false, color: "#8b5cf6", icon: "tv" },
  { name: "Entertainment", type: "expense", is_default: false, color: "#ec4899", icon: "gamepad-2" },
  { name: "Others", type: "expense", is_default: true, color: "#64748b", icon: "ellipsis" },
];

// category name, type, amount, description, date, is_recurring
const TRANSACTIONS = [
  ["Allowance", "income", 20000, "Allowance", "2026-09-20", true],
  ["Gigs", "income", 30000, "Part-time Gig", "2026-09-15", false],
  ["Scholarships", "income", 15000, "Scholarship Stipend", "2026-09-05", false],
  ["Gifts", "income", 10000, "Birthday Gift", "2026-09-01", false],
  ["Food", "expense", 5000, "Canteen Food", "2026-09-25", false],
  ["Food", "expense", 4400, "Groceries", "2026-09-18", false],
  ["Food", "expense", 2000, "Snacks & Drinks", "2026-09-12", false],
  ["Transport", "expense", 2500, "Uber to class", "2026-09-24", false],
  ["Transport", "expense", 1300, "Bus fare", "2026-09-17", false],
  ["Transport", "expense", 1000, "Bike to campus", "2026-09-10", false],
  ["Hostel/Rent", "expense", 3900, "Hostel share", "2026-09-01", false],
  ["Academics", "expense", 3000, "Textbook", "2026-09-18", false],
  ["Subscriptions", "expense", 1200, "Netflix", "2026-09-03", true],
  ["Subscriptions", "expense", 1200, "Data bundle", "2026-09-08", true],
  ["Entertainment", "expense", 1100, "Movie night", "2026-09-14", false],
  ["Entertainment", "expense", 1000, "Game credit", "2026-09-09", false],
  ["Others", "expense", 900, "Laundry", "2026-09-06", false],
  ["Others", "expense", 500, "Printing", "2026-09-11", false],
  ["Others", "expense", 1000, "Misc", "2026-09-16", false],
];

// category name -> month -> limit
const BUDGETS = {
  Food: { "2026-09": 12000, "2026-10": 12000 },
  Transport: { "2026-09": 4000, "2026-10": 4000 },
  "Hostel/Rent": { "2026-09": 5000, "2026-10": 5000 },
  Academics: { "2026-09": 6000, "2026-10": 6000 },
  Subscriptions: { "2026-09": 3000, "2026-10": 3000 },
  Entertainment: { "2026-09": 5000, "2026-10": 5000 },
  Others: { "2026-09": 2000, "2026-10": 2000 },
};

const NOTIFICATIONS = [
  {
    title: "New spending insight",
    body: "Food is your top spending category this month.",
    icon: "chart-column",
    to: "/insights",
    is_read: false,
    dedupe_key: "seed:insight",
  },
  {
    title: "Allowance received",
    body: "NGN 20,000 allowance logged on Sep 20.",
    icon: "wallet",
    to: "/",
    is_read: true,
    dedupe_key: "seed:allowance",
  },
  {
    title: "Fresh tip from Rix",
    body: "Ask your AI assistant for this week's money tip.",
    icon: "bot",
    to: "/assistant",
    is_read: true,
    dedupe_key: "seed:rix",
  },
];

const TIP_TEMPLATES = [
  {
    key: "top_category_share",
    text: "{category} is your biggest expense at {percentage}% of spending. A weekly cap of {weekly} keeps it in check.",
    rule: "category_share_above",
    threshold: 30,
    savings_impact: 90,
  },
  {
    key: "budget_near_limit",
    text: "You are at {percentage}% of your {category} budget. {remaining} left for the rest of the month.",
    rule: "budget_near_limit",
    threshold: 95,
    savings_impact: 80,
  },
  {
    key: "no_logging",
    text: "Log a few transactions and I will show you exactly where your money is going.",
    rule: "no_transactions",
    savings_impact: 10,
  },
];

async function upsertUser(details, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  return User.findOneAndUpdate(
    { email: details.email },
    { $set: { ...details, password_hash: passwordHash, is_active: true } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
}

async function seedCategories() {
  const byName = new Map();
  for (const category of CATEGORIES) {
    const doc = await Category.findOneAndUpdate(
      { user_id: null, name: category.name, type: category.type },
      { $set: { ...category, user_id: null } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    byName.set(category.name, doc);
  }
  return byName;
}

async function seedTransactions(userId, categoriesByName) {
  const existing = await Transaction.countDocuments({ user_id: userId });
  if (existing > 0) return 0;

  const rows = TRANSACTIONS.map(([categoryName, type, amount, description, date, isRecurring]) => ({
    user_id: userId,
    category_id: categoriesByName.get(categoryName)._id,
    type,
    amount,
    description,
    date,
    is_recurring: isRecurring,
    frequency: isRecurring ? "monthly" : null,
    next_run_at: isRecurring ? date : null,
  }));
  await Transaction.insertMany(rows);
  return rows.length;
}

async function seedBudgets(userId, categoriesByName) {
  const existing = await Budget.countDocuments({ user_id: userId });
  if (existing > 0) return 0;

  const rows = [];
  for (const [categoryName, months] of Object.entries(BUDGETS)) {
    for (const [month, limitAmount] of Object.entries(months)) {
      rows.push({
        user_id: userId,
        category_id: categoriesByName.get(categoryName)._id,
        month,
        limit_amount: limitAmount,
      });
    }
  }
  await Budget.insertMany(rows);
  return rows.length;
}

async function seedNotifications(userId) {
  const existing = await Notification.countDocuments({ user_id: userId });
  if (existing > 0) return 0;
  await Notification.insertMany(NOTIFICATIONS.map((n) => ({ ...n, user_id: userId })));
  return NOTIFICATIONS.length;
}

async function seedTipTemplates() {
  let created = 0;
  for (const template of TIP_TEMPLATES) {
    const result = await TipTemplate.updateOne(
      { key: template.key },
      { $set: template },
      { upsert: true, setDefaultsOnInsert: true },
    );
    if (result.upsertedCount > 0) created += 1;
  }
  return created;
}

export async function runSeed() {
  const student = await upsertUser(DEMO_STUDENT, DEMO_PASSWORD);
  const admin = await upsertUser(DEMO_ADMIN, ADMIN_PASSWORD);
  const categoriesByName = await seedCategories();

  const transactions = await seedTransactions(student._id, categoriesByName);
  const budgets = await seedBudgets(student._id, categoriesByName);
  const notifications = await seedNotifications(student._id);
  const templates = await seedTipTemplates();

  return { student, admin, transactions, budgets, notifications, templates };
}

async function main() {
  await connectDb();
  if (env.useMemoryDb) {
    console.log("\n  NOTE: MONGODB_URI is blank, so this seeded data is discarded");
    console.log("  when this process exits. Set MONGODB_URI to keep it.\n");
  }

  const result = await runSeed();

  console.log("\nseed summary");
  console.log(`  users             2  (${result.student.email}, ${result.admin.email})`);
  console.log(`  categories       ${CATEGORIES.length}`);
  console.log(`  transactions     ${result.transactions} inserted this run`);
  console.log(`  budgets          ${result.budgets} inserted this run`);
  console.log(`  notifications    ${result.notifications} inserted this run`);
  console.log(`  tip templates    ${result.templates} created this run`);
  console.log("\n  demo credentials");
  console.log(`    student  ${DEMO_STUDENT.email} / ${DEMO_PASSWORD}`);
  console.log(`    admin    ${DEMO_ADMIN.email} / ${ADMIN_PASSWORD}\n`);

  await disconnectDb();
}

// Only seed when run directly, so the idempotency test can import runSeed()
// without this firing underneath it.
const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (invokedDirectly) {
  main().catch(async (error) => {
    console.error("Seed failed:", error.message);
    await disconnectDb().catch(() => {});
    process.exit(1);
  });
}
