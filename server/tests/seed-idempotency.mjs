// Proves the seed is idempotent.
//
// Both runs have to hit the SAME database. A second `node scripts/seed.js` in
// in-memory mode would get a brand new empty database, insert 19 transactions
// again, and prove nothing at all - so all three runs happen inside this one
// process against one MongoMemoryServer.
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { runSeed } from "../scripts/seed.js";
import {
  Budget,
  Category,
  Notification,
  TipTemplate,
  Transaction,
  User,
} from "../src/models/index.js";

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

const server = await MongoMemoryServer.create();
await mongoose.connect(server.getUri(), { dbName: "campuscoin_idempotency" });

const first = await runSeed();
const counts1 = await countAll();
const second = await runSeed();
const counts2 = await countAll();
const third = await runSeed();
const counts3 = await countAll();

console.log("\n1. the first run inserts the whole demo dataset");
check("19 transactions", first.transactions === 19, `got ${first.transactions}`);
check("14 budgets", first.budgets === 14, `got ${first.budgets}`);
check("3 notifications", first.notifications === 3, `got ${first.notifications}`);
check("3 tip templates", first.templates === 3, `got ${first.templates}`);
check("11 categories", counts1.categories === 11, `got ${counts1.categories}`);
check("2 users", counts1.users === 2, `got ${counts1.users}`);

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

console.log("\n4. the seeded numbers match mockData.js");
const totals = await Transaction.aggregate([
  { $group: { _id: "$type", total: { $sum: "$amount" } } },
]);
const byType = Object.fromEntries(totals.map((row) => [row._id, row.total]));
check("income is 75000", byType.income === 75000, `got ${byType.income}`);
check("expenses are 30000", byType.expense === 30000, `got ${byType.expense}`);

const september = await Transaction.countDocuments({ date: /^2026-09-/ });
check("all 19 transactions are dated September 2026", september === 19, `got ${september}`);

const recurring = await Transaction.countDocuments({ is_recurring: true });
check("3 transactions are recurring", recurring === 3, `got ${recurring}`);

console.log("\n5. the unique constraints the SRS relies on actually reject duplicates");
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

await mongoose.connection.dropDatabase();
await mongoose.disconnect();
await server.stop();

const failed = results.filter((passed) => !passed).length;
console.log(`\n${results.length - failed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
