import "dotenv/config";
import { useTestDatabaseEnv } from "./helpers/testDb.js";

useTestDatabaseEnv();

const { connectDb, disconnectDb } = await import("../src/config/db.js");
const { User, Category, Transaction, TransactionHistory } = await import("../src/models/index.js");
const ledger = await import("../src/services/ledger.service.js");
const { importTransactionsCsv, undoImportBatch } = await import("../src/services/import.service.js");
const ApiError = (await import("../src/utils/ApiError.js")).default;

let passed = 0;
let failed = 0;
const failures = [];

const check = (name, condition, detail = "") => {
  if (condition) {
    passed += 1;
    process.stdout.write(`  PASS  ${name}\n`);
  } else {
    failed += 1;
    failures.push(name);
    process.stdout.write(`  FAIL  ${name} ${detail}\n`);
  }
};

const throwsWith = async (name, status, fn) => {
  try {
    await fn();
    check(name, false, "did not throw");
  } catch (error) {
    check(name, error instanceof ApiError && error.status === status, `got ${error?.status}: ${error?.message}`);
  }
};

await connectDb();

const stamp = Date.now();
const user = await User.create({
  name: `Stage1 ${stamp}`,
  email: `stage1-${stamp}@campuscoin.test`,
  password_hash: "x",
  profileOnboarded: true,
});

const expenses = await Category.create([
  { name: `S1 Food ${stamp}`, type: "expense", is_default: false, user_id: user._id },
  { name: `S1 Transport ${stamp}`, type: "expense", is_default: false, user_id: user._id },
]);
const income = await Category.create({
  name: `S1 Allowance ${stamp}`,
  type: "income",
  is_default: false,
  user_id: user._id,
});

try {
  process.stdout.write("\n1. recurring entries actually generate the next occurrence\n");

  const monthly = await ledger.createTransaction(user._id, {
    category_id: expenses[0]._id,
    amount: 3000,
    description: "Monthly food plan",
    date: "2026-09-20",
    is_recurring: true,
  });
  check("a recurring row gets a next_run_at worked out for it", monthly.next_run_at === "2026-10-20", `got ${monthly.next_run_at}`);
  check("frequency defaults to monthly", monthly.frequency === "monthly", `got ${monthly.frequency}`);

  const before = await Transaction.countDocuments({ user_id: user._id });
  await ledger.listTransactions(user._id, "2026-10");
  const after = await Transaction.countDocuments({ user_id: user._id });
  check("nothing is generated before it is due", before === after, `${before} -> ${after}`);

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const pastDue = await Transaction.create({
    user_id: user._id,
    category_id: expenses[0]._id,
    type: "expense",
    amount: 3000,
    description: "Overdue rent",
    date: "2026-06-01",
    is_recurring: true,
    frequency: "monthly",
    next_run_at: "2026-07-01",
  });

  const generated = await ledger.materialiseRecurring(user._id);
  check("a due recurring row produces transactions", generated.length > 0, `generated ${generated.length}`);

  const afterDue = await Transaction.findOne({ user_id: user._id, date: "2026-07-01" });
  check("the next occurrence really exists in the database", Boolean(afterDue), "no row for 2026-07-01");
  check("the generated row copies the amount", afterDue?.amount === 3000, `got ${afterDue?.amount}`);
  check("the generated row is not itself recurring", afterDue?.is_recurring === false);
  check("the generated row points back at its parent", String(afterDue?.recurring_root) === String(pastDue._id));

  const advanced = await Transaction.findById(pastDue._id).lean();
  check("next_run_at moves into the future", advanced.next_run_at > today, `got ${advanced.next_run_at}`);

  await ledger.materialiseRecurring(user._id);
  await ledger.materialiseRecurring(user._id);
  const july = await Transaction.countDocuments({ user_id: user._id, date: "2026-07-01" });
  check("running it twice does not double the rows", july === 1, `found ${july} rows for 2026-07-01`);

  const weekly = await Transaction.create({
    user_id: user._id,
    category_id: expenses[1]._id,
    type: "expense",
    amount: 700,
    description: "Weekly bus pass",
    date: "2026-06-01",
    is_recurring: true,
    frequency: "weekly",
    next_run_at: "2026-06-08",
  });
  await ledger.materialiseRecurring(user._id);
  const week2 = await Transaction.findOne({ user_id: user._id, date: "2026-06-08" });
  check("a weekly row generates a week later", Boolean(week2), "no row for 2026-06-08");
  const weekNext = await Transaction.findById(weekly._id).lean();
  check("weekly next_run_at advances by 7 days", weekNext.next_run_at === "2026-06-15", `got ${weekNext.next_run_at}`);

  process.stdout.write("\n2. delete keeps the row recoverable\n");

  const toDelete = await ledger.createTransaction(user._id, {
    category_id: expenses[0]._id,
    amount: 1250,
    description: "Lunch I did not mean to log",
    date: "2026-09-21",
  });
  await ledger.deleteTransaction(user._id, toDelete._id);
  const gone = await Transaction.findById(toDelete._id).lean();
  check("the live transaction is gone", gone === null);
  const history = await ledger.listTransactionHistory(user._id);
  check("it shows up in the history list", history.length >= 1, `history ${history.length}`);
  check("history carries the category name", history[0]?.category?.name === `S1 Food ${stamp}`, JSON.stringify(history[0]?.category));
  check("history carries the amount", history[0]?.transaction?.amount === 1250);

  const restored = await ledger.restoreTransaction(user._id, history[0].history_id);
  check("restoring brings the row back", Boolean(await Transaction.findById(restored._id).lean()));
  const afterRestore = await ledger.listTransactionHistory(user._id);
  check("a restored row leaves the history list", afterRestore.length === history.length - 1, `${history.length} -> ${afterRestore.length}`);

  await throwsWith("restoring the same row twice is refused", 404, () =>
    ledger.restoreTransaction(user._id, history[0].history_id),
  );
  await throwsWith("deleting a row that is not there is a 404", 404, () =>
    ledger.deleteTransaction(user._id, toDelete._id),
  );

  process.stdout.write("\n3. CSV import validates every row and reports per row\n");

  const csv = [
    "date,description,amount,category,type",
    `2026-07-05,${`S1 Food ${stamp}`},450,${`S1 Food ${stamp}`},expense`,
    `2026-07-06,${`S1 Transport ${stamp}`},900,${`S1 Transport ${stamp}`},expense`,
    `2026-07-07,${`S1 Allowance ${stamp}`},20000,${`S1 Allowance ${stamp}`},income`,
    "not-a-date,Bad date,500,Food,expense",
    "2026-07-08,Zero row,0,Food,expense",
    "2026-07-09,Bad amount,abc,Food,expense",
    `2026-07-10,Unknown category,700,Sushi Palace,expense`,
    `2026-07-11,No category column,800,,expense`,
  ].join("\n");

  const beforeImport = await Transaction.countDocuments({ user_id: user._id });
  const result = await importTransactionsCsv(user._id, Buffer.from(csv, "utf8"));
  const afterImport = await Transaction.countDocuments({ user_id: user._id });

  check("the summary counts every data row", result.summary.total === 8, JSON.stringify(result.summary));
  check("valid rows are accepted", result.summary.accepted === 5, JSON.stringify(result.summary));
  check("invalid rows are rejected", result.summary.rejected === 3, JSON.stringify(result.summary));
  check("the accepted rows are really written", afterImport - beforeImport === 5, `${beforeImport} -> ${afterImport}`);
  check("every row appears in the report", result.rows.length === 8, `got ${result.rows.length}`);
  check("rows are reported in file order", result.rows.every((row, index) => row.row === index + 2), JSON.stringify(result.rows.map((r) => r.row)));

  const byRow = (row) => result.rows.find((entry) => entry.row === row);
  check("row 2 accepted with its category", byRow(2).status === "accepted" && byRow(2).category_name === `S1 Food ${stamp}`, JSON.stringify(byRow(2)));
  check("row 4 accepted as income from the category type", byRow(4).status === "accepted" && byRow(4).amount === 20000);
  check("a bad date is rejected with a reason", byRow(5).status === "rejected" && /date/i.test(byRow(5).reason), byRow(5).reason);
  check("a zero amount is rejected", byRow(6).status === "rejected" && /zero/i.test(byRow(6).reason), byRow(6).reason);
  check("a non-numeric amount is rejected", byRow(7).status === "rejected" && /number/i.test(byRow(7).reason), byRow(7).reason);
  check("an unknown category falls back rather than dropping the row", byRow(8).status === "accepted", JSON.stringify(byRow(8)));
  check("a blank category column is filled in", byRow(9).status === "accepted" && Boolean(byRow(9).category_name), JSON.stringify(byRow(9)));

  const imported = await Transaction.find({ user_id: user._id, import_batch_id: result.batch_id }).lean();
  check("accepted rows share the batch id", imported.length === 5, `got ${imported.length}`);
  check("the income row was stored as income", imported.filter((row) => row.type === "income").length === 1);
  check("every imported amount is positive", imported.every((row) => row.amount > 0));

  process.stdout.write("\n4. CSV import refuses files it cannot read\n");

  await throwsWith("a file with no rows is refused", 400, () =>
    importTransactionsCsv(user._id, Buffer.from("date,amount\n", "utf8")),
  );
  await throwsWith("a file with no header row is refused", 400, () =>
    importTransactionsCsv(user._id, Buffer.from("", "utf8")),
  );
  await throwsWith("a file missing the amount column is refused", 400, () =>
    importTransactionsCsv(user._id, Buffer.from("description,category\nLunch,Food\n", "utf8")),
  );
  await throwsWith("a file missing the date column is refused", 400, () =>
    importTransactionsCsv(user._id, Buffer.from("description,amount\nLunch,500\n", "utf8")),
  );

  const headerAliases = await importTransactionsCsv(
    user._id,
    Buffer.from("Date,Description,Amount\n2026-07-20,Alias header,300\n", "utf8"),
  );
  check("alternative header spellings are accepted", headerAliases.summary.accepted === 1, JSON.stringify(headerAliases.summary));

  const euro = await importTransactionsCsv(
    user._id,
    Buffer.from("date,description,amount\n20/07/2026,Day first,1,500.50\n", "utf8"),
  );
  check("a comma amount and day-first date are read", euro.rows[0].amount === 1500.5, JSON.stringify(euro.rows[0]));

  const quoted = await importTransactionsCsv(
    user._id,
    Buffer.from('date,description,amount\n2026-07-21,"Cafe, Main Hall",850\n', "utf8"),
  );
  check("a quoted comma does not split the row", quoted.summary.accepted === 1 && quoted.rows[0].description === "Cafe, Main Hall", JSON.stringify(quoted.rows[0]));

  process.stdout.write("\n5. a whole import can be undone\n");

  const batchRows = await Transaction.countDocuments({ user_id: user._id, import_batch_id: result.batch_id });
  const removedCount = await undoImportBatch(user._id, result.batch_id);
  const leftOver = await Transaction.countDocuments({ user_id: user._id, import_batch_id: result.batch_id });
  check("undo reports how many rows it removed", removedCount === batchRows, `${removedCount} vs ${batchRows}`);
  check("undo removes every row from the batch", leftOver === 0, `${leftOver} left`);
  await throwsWith("undoing a batch that is not there is a 404", 404, () =>
    undoImportBatch(user._id, result.batch_id),
  );

  process.stdout.write("\n6. one student's import cannot touch another's\n");

  const other = await User.create({
    name: `Stage1 Other ${stamp}`,
    email: `stage1-other-${stamp}@campuscoin.test`,
    password_hash: "x",
  });
  await importTransactionsCsv(other._id, Buffer.from("date,description,amount\n2026-07-15,Theirs,400\n", "utf8"));
  const mineAfter = await Transaction.countDocuments({ user_id: user._id, import_batch_id: result.batch_id });
  check("their import created nothing of mine", mineAfter === 0, `${mineAfter} rows of mine`);
  await throwsWith("I cannot undo their batch", 404, () => undoImportBatch(user._id, "507f1f77bcf86cd799439011"));

  process.stdout.write("\n7. recurring generation stays inside the reader's own data\n");

  const othersGenerated = await ledger.materialiseRecurring(other._id);
  check("another student's recurring rows are not touched", Array.isArray(othersGenerated));
  const leaked = await Transaction.countDocuments({ user_id: other._id, recurring_root: { $ne: null } });
  check("nothing I generated leaks into their ledger", leaked === 0, `${leaked} leaked`);

  await User.deleteOne({ _id: other._id });
  await Transaction.deleteMany({ user_id: other._id });
} finally {
  await Transaction.deleteMany({ user_id: user._id });
  await TransactionHistory.deleteMany({ user_id: user._id });
  await Category.deleteMany({ user_id: user._id });
  await User.deleteOne({ _id: user._id });
  await disconnectDb();
}

process.stdout.write(`\nstage1 ledger + import: ${passed} passed, ${failed} failed\n`);
if (failed) {
  process.stdout.write(`failing: ${failures.join(", ")}\n`);
  process.exitCode = 1;
}
