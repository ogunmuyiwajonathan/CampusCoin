import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDb, disconnectDb } from "../src/config/db.js";
import { env } from "../src/config/env.js";
import {
  addMonths,
  daysInMonth,
  nextRunFrom,
  todayString,
} from "../src/utils/dateMath.js";
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
  academic_year: "200 Level",
  allowance_baseline: 20000,
  monthly_savings_goal: 15000,
  role: "student",
  profileOnboarded: true,
};

const DEMO_PASSWORD = "CampusCoin2026!";

const DEMO_LOGIN = {
  name: "Student",
  email: "student@campuscoin.test",
  academic_year: "100 Level",
  allowance_baseline: 20000,
  monthly_savings_goal: 10000,
  role: "student",
  profileOnboarded: true,
};

const DEMO_LOGIN_PASSWORD = "12345678";

const SEED_MONTHS = 6;
const BUDGET_MONTHS = 2;

const MONTH_FACTORS = [1, 0.94, 1.08, 0.88, 1.12, 0.97];

const SEED_DATABASES = [
  "campuscoin",
  "campuscoin_dev",
  "campuscoin_development",
  "campuscoin_test",
];

const CATEGORIES = [
  { name: "Allowance", type: "income", is_default: true, color: null, icon: "wallet", icon_key: "wallet" },
  { name: "Scholarships", type: "income", is_default: true, color: null, icon: "graduation-cap", icon_key: "graduation-cap" },
  { name: "Gigs", type: "income", is_default: false, color: null, icon: "briefcase", icon_key: "briefcase" },
  { name: "Gifts", type: "income", is_default: true, color: null, icon: "gift", icon_key: "gift" },
  { name: "Food", type: "expense", is_default: true, color: "#10b981", icon: "utensils", icon_key: "utensils" },
  { name: "Transport", type: "expense", is_default: true, color: "#3b82f6", icon: "bus", icon_key: "bus" },
  { name: "Hostel/Rent", type: "expense", is_default: true, color: "#f59e0b", icon: "house", icon_key: "house" },
  { name: "Academics", type: "expense", is_default: true, color: "#eab308", icon: "book-open", icon_key: "book-open" },
  { name: "Subscriptions", type: "expense", is_default: false, color: "#8b5cf6", icon: "tv", icon_key: "repeat" },
  { name: "Entertainment", type: "expense", is_default: false, color: "#ec4899", icon: "gamepad-2", icon_key: "gamepad-2" },
  { name: "Others", type: "expense", is_default: true, color: "#64748b", icon: "ellipsis", icon_key: "more-horizontal" },
];

const TRANSACTIONS = [
  ["Allowance", "income", 20000, "Allowance", 20, true],
  ["Gigs", "income", 30000, "Part-time Gig", 15, false],
  ["Scholarships", "income", 15000, "Scholarship Stipend", 5, false],
  ["Gifts", "income", 10000, "Birthday Gift", 1, false],
  ["Food", "expense", 5000, "Canteen Food", 25, false],
  ["Food", "expense", 4400, "Groceries", 18, false],
  ["Food", "expense", 2000, "Snacks & Drinks", 12, false],
  ["Transport", "expense", 2500, "Uber to class", 24, false],
  ["Transport", "expense", 1300, "Bus fare", 17, false],
  ["Transport", "expense", 1000, "Bike to campus", 10, false],
  ["Hostel/Rent", "expense", 3900, "Hostel share", 1, false],
  ["Academics", "expense", 3000, "Textbook", 18, false],
  ["Subscriptions", "expense", 1200, "Netflix", 3, true],
  ["Subscriptions", "expense", 1200, "Data bundle", 8, true],
  ["Entertainment", "expense", 1100, "Movie night", 14, false],
  ["Entertainment", "expense", 1000, "Game credit", 9, false],
  ["Others", "expense", 900, "Laundry", 6, false],
  ["Others", "expense", 500, "Printing", 11, false],
  ["Others", "expense", 1000, "Misc", 16, false],
];

const BUDGETS = [
  ["Food", 12000],
  ["Transport", 4000],
  ["Hostel/Rent", 5000],
  ["Academics", 6000],
  ["Subscriptions", 3000],
  ["Entertainment", 5000],
  ["Others", 2000],
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

const pad2 = (value) => String(value).padStart(2, "0");
const round2 = (value) => Math.round(value * 100) / 100;

export function assertSeedAllowed(dbName = mongoose.connection.name) {
  if (env.useMemoryDb) return dbName;
  if (process.env.SEED_ALLOW !== "true") {
    throw new Error(
      "Refusing to seed: set SEED_ALLOW=true to confirm you mean this database. " +
        "The seed only creates or updates the demo accounts and their own data, but it " +
        "does overwrite that demo student's rows every run.",
    );
  }
  if (!SEED_DATABASES.includes(dbName)) {
    throw new Error(
      `Refusing to seed database "${dbName}". Expected one of: ${SEED_DATABASES.join(", ")}. ` +
        "If this really is a CampusCoin database, add its name to SEED_DATABASES in scripts/seed.js.",
    );
  }
  return dbName;
}

function seedMonthKeys(today = todayString()) {
  const current = today.slice(0, 7);
  return Array.from({ length: SEED_MONTHS }, (_, offset) =>
    addMonths(`${current}-01`, -offset).slice(0, 7),
  );
}

function firstRunAfterToday(date, frequency, today) {
  let next = nextRunFrom(date, frequency);
  let guard = 0;
  while (next <= today && guard < 1200) {
    next = nextRunFrom(next, frequency);
    guard += 1;
  }
  return next;
}

function buildTransactionRows(monthKeys, userId, categoriesByName, today) {
  const todayDay = Number(today.slice(8, 10)) || 1;
  const rows = [];

  monthKeys.forEach((month, monthOffset) => {
    const [year, monthNumber] = month.split("-").map(Number);
    const maxDay =
      monthOffset === 0
        ? Math.max(1, Math.min(todayDay, daysInMonth(year, monthNumber)))
        : daysInMonth(year, monthNumber);

    TRANSACTIONS.forEach(([categoryName, type, base, description, day, recurring], index) => {
      const date = `${month}-${pad2(Math.min(day, maxDay))}`;
      const frequency = recurring ? "monthly" : null;
      rows.push({
        user_id: userId,
        category_id: categoriesByName.get(categoryName)._id,
        type,
        amount: round2(base * MONTH_FACTORS[monthOffset]),
        description,
        date,
        is_recurring: recurring,
        frequency,
        next_run_at: recurring ? firstRunAfterToday(date, frequency, today) : null,
        request_id: `seed:${month}:${index}`,
      });
    });
  });

  return rows;
}

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

async function seedTransactions(rows) {
  if (rows.length === 0) return 0;
  const result = await Transaction.bulkWrite(
    rows.map((row) => ({
      updateOne: {
        filter: { user_id: row.user_id, request_id: row.request_id },
        update: { $set: row },
        upsert: true,
      },
    })),
    { ordered: false },
  );
  return result.upsertedCount ?? 0;
}

async function seedBudgets(userId, categoriesByName, monthKeys) {
  const rows = [];
  for (const month of monthKeys.slice(0, BUDGET_MONTHS)) {
    for (const [categoryName, limit] of BUDGETS) {
      rows.push({
        user_id: userId,
        category_id: categoriesByName.get(categoryName)._id,
        month,
        limit_amount: limit,
      });
    }
  }
  const result = await Budget.bulkWrite(
    rows.map((row) => ({
      updateOne: {
        filter: { user_id: row.user_id, category_id: row.category_id, month: row.month },
        update: { $set: { limit_amount: row.limit_amount } },
        upsert: true,
      },
    })),
    { ordered: false },
  );
  return result.upsertedCount ?? 0;
}

function shortDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

async function seedNotifications(userId, transactionRows, monthKeys) {
  const currentMonth = monthKeys[0];
  const allowance = transactionRows.find(
    (row) => row.description === "Allowance" && row.date.startsWith(currentMonth),
  );
  const allowanceDate = allowance ? shortDate(allowance.date) : shortDate(`${currentMonth}-01`);

  const rows = [
    {
      title: "New spending insight",
      body: "Food is your top spending category this month.",
      icon: "chart-column",
      to: "/insights",
      is_read: false,
      read_at: null,
      dedupe_key: "seed:insight",
    },
    {
      title: "Allowance received",
      body: `NGN 20,000 allowance logged on ${allowanceDate}.`,
      icon: "wallet",
      to: "/",
      is_read: true,
      read_at: new Date(),
      dedupe_key: "seed:allowance",
    },
    {
      title: "Fresh tip from Rix",
      body: "Ask your AI assistant for this week's money tip.",
      icon: "bot",
      to: "/assistant",
      is_read: true,
      read_at: new Date(),
      dedupe_key: "seed:rix",
    },
  ];

  const result = await Notification.bulkWrite(
    rows.map((row) => ({
      updateOne: {
        filter: { user_id: userId, dedupe_key: row.dedupe_key },
        update: { $set: { ...row, user_id: userId } },
        upsert: true,
      },
    })),
    { ordered: false },
  );
  return result.upsertedCount ?? 0;
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
  assertSeedAllowed();

  const today = todayString();
  const monthKeys = seedMonthKeys(today);

  const student = await upsertUser(DEMO_STUDENT, DEMO_PASSWORD);
  const demoLogin = await upsertUser(DEMO_LOGIN, DEMO_LOGIN_PASSWORD);
  const categoriesByName = await seedCategories();

  const rows = buildTransactionRows(monthKeys, student._id, categoriesByName, today);
  const transactions = await seedTransactions(rows);
  const budgets = await seedBudgets(student._id, categoriesByName, monthKeys);
  const notifications = await seedNotifications(student._id, rows, monthKeys);
  const templates = await seedTipTemplates();

  return {
    student,
    demoLogin,
    transactions,
    budgets,
    notifications,
    templates,
    monthKeys,
    totalTransactions: rows.length,
  };
}

async function main() {
  await connectDb();

  try {
    assertSeedAllowed();
  } catch (error) {
    console.error(`Seed aborted: ${error.message}`);
    console.error("Run it as:  SEED_ALLOW=true npm run seed");
    await disconnectDb();
    process.exit(1);
  }

  if (env.useMemoryDb) {
    console.log("\n  NOTE: MONGODB_URI is blank, so this seeded data is discarded");
    console.log("  when this process exits. Set MONGODB_URI to keep it.\n");
  }

  let result;
  try {
    result = await runSeed();
  } catch (error) {
    console.error(`Seed failed: ${error.message}`);
    await disconnectDb().catch(() => {});
    process.exit(1);
  }

  console.log("\nseed summary");
  console.log(`  database        ${mongoose.connection.name}`);
  console.log(`  months          ${result.monthKeys.join(", ")}`);
  console.log(`  users           2  (${result.student.email}, ${result.demoLogin.email})`);
  console.log(`  categories      ${CATEGORIES.length}`);
  console.log(`  transactions    ${result.transactions} created this run (${result.totalTransactions} seeded rows in total)`);
  console.log(`  budgets         ${result.budgets} created this run`);
  console.log(`  notifications   ${result.notifications} created this run`);
  console.log(`  tip templates   ${result.templates} created this run`);
  console.log("\n  demo credentials");
  console.log(`    student  ${DEMO_STUDENT.email} / ${DEMO_PASSWORD}`);
  console.log(`    demo     ${DEMO_LOGIN.email} / ${DEMO_LOGIN_PASSWORD}\n`);

  await disconnectDb();
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (invokedDirectly) {
  main().catch(async (error) => {
    console.error("Seed failed:", error.message);
    await disconnectDb().catch(() => {});
    process.exit(1);
  });
}
