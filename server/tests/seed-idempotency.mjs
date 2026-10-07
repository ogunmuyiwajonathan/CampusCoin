import "dotenv/config";
import { closeTestDb, connectTestDb, resetTestDb } from "./helpers/testDb.js";
import { runSeed } from "../scripts/seed.js";
import { addMonths, todayString } from "../src/utils/dateMath.js";
import {
  Budget,
  Category,
  Notification,
  TipTemplate,
  Transaction,
  User,
} from "../src/models/index.js";

// The seed refuses to touch a database without an explicit opt-in. The tests run
// against campuscoin_test, which is on the allowlist, but the flag is still
// required so the guard itself stays covered.
process.env.SEED_ALLOW = "true";

const results = [];
function check(label, passed, detail = "") {
  results.push(passed);
  console.log(`${passed ? "  PASS" : "  FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

async function countAll() {
  return {
    users: await User.countDocuments(),
    categories: await Category.countDocuments(),
    transactions: await Transaction.countDocuments(),
    budgets: await Budget.countDocuments(),
    notifications: await Notification.countDocuments(),
    tipTemplates: await TipTemplate.countDocuments(),
  };
}

await connectTestDb();
await resetTestDb();

const first = await runSeed();
const counts1 = await countAll();
const second = await runSeed();
const counts2 = await countAll();
const third = await runSeed();
const counts3 = await countAll();

console.log("\n1. the first run inserts the whole demo dataset");
const TRANSACTIONS_PER_MONTH = 19;
const SEEDED_MONTHS = 6;
const EXPECTED_TRANSACTIONS = TRANSACTIONS_PER_MONTH * SEEDED_MONTHS;
check(
  `${TRANSACTIONS_PER_MONTH} transactions x ${SEEDED_MONTHS} months = ${EXPECTED_TRANSACTIONS}`,
  first.transactions === EXPECTED_TRANSACTIONS,
  `got ${first.transactions}`,
);
check("14 budgets", first.budgets === 14, `got ${first.budgets}`);
check("3 notifications", first.notifications === 3, `got ${first.notifications}`);
check("3 tip templates", first.templates === 3, `got ${first.templates}`);
check("11 categories", counts1.categories === 11, `got ${counts1.categories}`);
check(
  "2 demo users (student, demo login)",
  counts1.users === 2,
  `got ${counts1.users}`,
);

console.log("\n2. the second and third runs insert nothing");
check("run 2 inserted no transactions", second.transactions === 0, `got ${second.transactions}`);
check("run 2 inserted no budgets", second.budgets === 0, `got ${second.budgets}`);
check("run 2 inserted no notifications", second.notifications === 0, `got ${second.notifications}`);
check("run 2 created no tip templates", second.templates === 0, `got ${second.templates}`);
check("run 3 inserted no transactions", third.transactions === 0, `got ${third.transactions}`);

console.log("\n3. row counts are identical after every run");
const same = (a, b) => Object.keys(a).every((key) => a[key] === b[key]);
check("run 1 counts == run 2 counts", same(counts1, counts2), JSON.stringify(counts2));
check("run 2 counts == run 3 counts", same(counts2, counts3), JSON.stringify(counts3));

console.log("\n4. the seeded dates are relative to today and match mockData.js");
const today = todayString();
const currentMonth = today.slice(0, 7);
const monthKeys = [];
let cursor = currentMonth;
for (let index = 0; index < SEEDED_MONTHS; index += 1) {
  monthKeys.push(cursor);
  cursor = addMonths(`${cursor}-01`, -1).slice(0, 7);
}

const currentTotals = await Transaction.aggregate([
  { $match: { date: { $regex: `^${currentMonth}-` } } },
  { $group: { _id: "$type", total: { $sum: "$amount" } } },
]);
const currentByType = Object.fromEntries(currentTotals.map((row) => [row._id, row.total]));
check(
  "current month income is 75000 (month factor 1, matches mockData.js)",
  currentByType.income === 75000,
  `got ${currentByType.income}`,
);
check(
  "current month expenses are 30000 (month factor 1, matches mockData.js)",
  currentByType.expense === 30000,
  `got ${currentByType.expense}`,
);

const totalRows = await Transaction.countDocuments();
check("every seeded row is accounted for", totalRows === EXPECTED_TRANSACTIONS, `got ${totalRows}`);

const futureRows = await Transaction.countDocuments({ date: { $gt: today } });
check("no row is dated in the future", futureRows === 0, `got ${futureRows}`);

for (const month of monthKeys) {
  const count = await Transaction.countDocuments({ date: { $regex: `^${month}-` } });
  check(`${month} holds ${TRANSACTIONS_PER_MONTH} transactions`, count === TRANSACTIONS_PER_MONTH, `got ${count}`);
}

const recurring = await Transaction.countDocuments({ is_recurring: true });
check(
  `${3 * SEEDED_MONTHS} transactions are recurring`,
  recurring === 3 * SEEDED_MONTHS,
  `got ${recurring}`,
);

console.log("\n5. ids are exposed under the snake_case names the client already uses");
const idContract = [
  [User, "user_id"],
  [Category, "category_id"],
  [Transaction, "transaction_id"],
  [Budget, "budget_id"],
];
for (const [Model, field] of idContract) {
  const doc = await Model.findOne();
  const expected = doc?._id.toString();
  check(`${Model.modelName} exposes ${field}`, doc?.[field] === expected, `${doc?.[field]} vs ${expected}`);
  const asJson = doc?.toJSON() ?? {};
  check(`${Model.modelName} serialises ${field}`, asJson[field] === expected, JSON.stringify(asJson[field]));
  check(`${Model.modelName} hides the raw _id`, asJson._id === undefined);
  check(`${Model.modelName} hides __v`, asJson.__v === undefined);
}

// resetTestDb() drops the database, indexes included. Ask mongoose to finish
// building them before asserting on uniqueness, otherwise this section races the
// background index build and passes or fails at random.
await Promise.all([Budget.init(), User.init()]);

console.log("\n6. the unique constraints the SRS relies on actually reject duplicates");

let budgetDuplicateRejected = false;
const anyBudget = await Budget.findOne();
try {
  await Budget.create({
    user_id: anyBudget.user_id,
    category_id: anyBudget.category_id,
    month: anyBudget.month,
    limit_amount: 999,
  });
} catch {
  budgetDuplicateRejected = true;
}
check("a duplicate budget for the same user/category/month is rejected", budgetDuplicateRejected);

let emailDuplicateRejected = false;
try {
  await User.create({ name: "Impostor", email: "alex@example.com", password_hash: "x" });
} catch {
  emailDuplicateRejected = true;
}
check("a duplicate email is rejected", emailDuplicateRejected);

await resetTestDb();
await closeTestDb();

const failed = results.filter((passed) => !passed).length;
console.log(`\n${results.length - failed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
