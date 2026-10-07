import "dotenv/config";
import { closeTestDb, connectTestDb, resetTestDb, TEST_DB_NAME } from "./helpers/testDb.js";
import { assertSeedAllowed, runSeed } from "../scripts/seed.js";
import { listTransactions } from "../src/services/ledger.service.js";
import { todayString } from "../src/utils/dateMath.js";
import { Budget, Category, Notification, Transaction, User } from "../src/models/index.js";

const results = [];
function check(label, passed, detail = "") {
  results.push(passed);
  console.log(`${passed ? "  PASS" : "  FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

function throws(fn) {
  try {
    fn();
    return null;
  } catch (error) {
    return error;
  }
}

await connectTestDb();
await resetTestDb();

console.log("1. the seed refuses to run without an explicit opt-in");

delete process.env.SEED_ALLOW;
const noFlag = throws(() => assertSeedAllowed(TEST_DB_NAME));
check("SEED_ALLOW missing is refused", Boolean(noFlag), noFlag?.message);
check(
  "the refusal explains how to proceed",
  Boolean(noFlag) && /SEED_ALLOW=true/.test(noFlag.message),
  noFlag?.message,
);

process.env.SEED_ALLOW = "true";
const wrongDb = throws(() => assertSeedAllowed("production_cluster"));
check("an unexpected database name is refused", Boolean(wrongDb), wrongDb?.message);
check(
  "the refusal names the database",
  Boolean(wrongDb) && /production_cluster/.test(wrongDb.message),
  wrongDb?.message,
);
check(
  "the refusal lists the expected names",
  Boolean(wrongDb) && wrongDb.message.includes(TEST_DB_NAME),
  wrongDb?.message,
);
check("the expected database name is accepted", assertSeedAllowed(TEST_DB_NAME) === TEST_DB_NAME);

console.log("\n2. the seed only ever creates or updates the demo accounts");

const foreign = await User.create({
  name: "Real Student",
  email: "real.student@elsewhere.test",
  password_hash: "not-a-real-hash",
  role: "student",
});
const foreignCategory = await Category.create({
  user_id: foreign._id,
  name: "Thesis printing",
  type: "expense",
  is_default: false,
});
const foreignTransaction = await Transaction.create({
  user_id: foreign._id,
  category_id: foreignCategory._id,
  type: "expense",
  amount: 4200,
  description: "Binding and printing",
  date: todayString(),
});
const foreignBudget = await Budget.create({
  user_id: foreign._id,
  category_id: foreignCategory._id,
  month: todayString().slice(0, 7),
  limit_amount: 9000,
});
const foreignNotification = await Notification.create({
  user_id: foreign._id,
  title: "Do not touch me",
  body: "This row belongs to somebody who is not the demo student.",
  dedupe_key: "foreign:keep",
});

const beforeCounts = {
  users: await User.countDocuments(),
  transactions: await Transaction.countDocuments(),
  budgets: await Budget.countDocuments(),
  notifications: await Notification.countDocuments(),
};

const seeded = await runSeed();

const afterCounts = {
  users: await User.countDocuments(),
  transactions: await Transaction.countDocuments(),
  budgets: await Budget.countDocuments(),
  notifications: await Notification.countDocuments(),
};

check(
  "the seed created the demo rows",
  seeded.transactions > 0 && seeded.budgets > 0,
  `${seeded.transactions} transactions, ${seeded.budgets} budgets`,
);
check(
  "the other user's transaction survived",
  Boolean(await Transaction.findById(foreignTransaction._id)),
);
check(
  "the other user's budget survived",
  Boolean(await Budget.findById(foreignBudget._id)),
);
check(
  "the other user's notification survived",
  Boolean(await Notification.findById(foreignNotification._id)),
);
check(
  "the other user's category survived",
  Boolean(await Category.findById(foreignCategory._id)),
);
check(
  "the other user's account survived",
  Boolean(await User.findById(foreign._id)),
);
check(
  "nothing was deleted: only the demo rows were added",
  afterCounts.users === beforeCounts.users + 2 &&
    afterCounts.transactions === beforeCounts.transactions + seeded.transactions &&
    afterCounts.budgets === beforeCounts.budgets + seeded.budgets &&
    afterCounts.notifications === beforeCounts.notifications + seeded.notifications,
  JSON.stringify({ beforeCounts, afterCounts, seeded: seeded.transactions }),
);

console.log("\n3. re-running the seed writes the same rows again, not more of them");

const firstTotal = afterCounts.transactions;
const rerun = await runSeed();
const secondTotal = await Transaction.countDocuments();
check("a second run inserted no transactions", rerun.transactions === 0, `got ${rerun.transactions}`);
check("a second run inserted no budgets", rerun.budgets === 0, `got ${rerun.budgets}`);
check("a second run inserted no notifications", rerun.notifications === 0, `got ${rerun.notifications}`);
check("row counts are identical after the second run", secondTotal === firstTotal, `${firstTotal} -> ${secondTotal}`);

console.log("\n4. opening Transactions twice does not create extra rows");

const student = await User.findOne({ email: "alex@example.com" }).lean();
const month = seeded.monthKeys[0];
const beforeOpen = await Transaction.countDocuments({ user_id: student._id });
const incomeBefore = await Transaction.aggregate([
  { $match: { user_id: student._id, date: { $regex: `^${month}-` }, type: "income" } },
  { $group: { _id: null, total: { $sum: "$amount" } } },
]);

await listTransactions(student._id, month);
await listTransactions(student._id, month);

const afterOpen = await Transaction.countDocuments({ user_id: student._id });
const incomeAfter = await Transaction.aggregate([
  { $match: { user_id: student._id, date: { $regex: `^${month}-` }, type: "income" } },
  { $group: { _id: null, total: { $sum: "$amount" } } },
]);

check("two page loads added no rows", afterOpen === beforeOpen, `${beforeOpen} -> ${afterOpen}`);
check(
  "income did not gain a phantom allowance",
  (incomeAfter[0]?.total ?? 0) === (incomeBefore[0]?.total ?? 0),
  `${incomeBefore[0]?.total} -> ${incomeAfter[0]?.total}`,
);
check(
  "the current month income is the documented 75000",
  incomeAfter[0]?.total === 75000,
  `got ${incomeAfter[0]?.total}`,
);

console.log("\n5. a recurring row left pointing at its own date cannot duplicate itself");

// This is the exact shape the old seed wrote (next_run_at === date). The first
// list call used to insert a second copy of the source row.
const allowance = await Category.findOne({ user_id: null, name: "Allowance" }).lean();
const poison = await Transaction.create({
  user_id: student._id,
  category_id: allowance._id,
  type: "income",
  amount: 7777,
  description: "Recurring guard",
  date: todayString(),
  is_recurring: true,
  frequency: "monthly",
  next_run_at: todayString(),
});

await listTransactions(student._id, month);

const copies = await Transaction.countDocuments({
  user_id: student._id,
  date: todayString(),
  amount: 7777,
});
check("the source row was not copied", copies === 1, `got ${copies}`);
check("the overdue row was rescheduled into the future", (await Transaction.findById(poison._id)).next_run_at > todayString());

console.log(`\n${results.filter(Boolean).length} passed, ${results.filter((r) => !r).length} failed\n`);

await resetTestDb();
await closeTestDb();
process.exit(results.every(Boolean) ? 0 : 1);
