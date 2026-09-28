// Proves the database layer against a real MongoDB server, not a stub.
// Separate from `npm test` because the first run needs a mongod binary and is
// therefore slower. Run it with `npm run test:db`.
//
// Forces in-memory mode before anything reads the environment, so the result
// never depends on whether a developer happens to have MONGODB_URI filled in.
// The imports below are dynamic for that reason: a static import would be
// evaluated before this assignment runs.
process.env.MONGODB_URI = "";

const mongoose = (await import("mongoose")).default;
const { connectDb, disconnectDb } = await import("../src/config/db.js");
const { env } = await import("../src/config/env.js");

const results = [];
function check(label, passed, detail = "") {
  results.push({ label, passed, detail });
  console.log(`${passed ? "  PASS" : "  FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

console.log(`\ndatabase smoke test (${env.useMemoryDb ? "in-memory mode" : "external URI"})\n`);

await connectDb();

const build = await mongoose.connection.db.admin().command({ buildInfo: 1 });
check("connected to a real mongod", Boolean(build.version), `server version ${build.version}`);

const Probe = mongoose.model(
  "Probe",
  new mongoose.Schema(
    { label: { type: String, required: true }, amount: { type: Number, index: true } },
    { collection: "probe_smoke" },
  ),
);
await Probe.deleteMany({});
await Probe.syncIndexes();

await Probe.create([
  { label: "food", amount: 100 },
  { label: "food", amount: 50 },
  { label: "bus", amount: 20 },
]);

check("reads back what it wrote", (await Probe.countDocuments()) === 3);

const grouped = await Probe.aggregate([
  { $group: { _id: "$label", total: { $sum: "$amount" } } },
  { $sort: { total: -1 } },
]);
check(
  "aggregation pipeline computes correct totals",
  grouped.length === 2 && grouped[0]._id === "food" && grouped[0].total === 150,
  JSON.stringify(grouped),
);

const indexed = await Probe.collection.indexes();
const hasAmountIndex = indexed.some((ix) => ix.key && ix.key.amount === 1);
check("indexes are actually created", hasAmountIndex, `${indexed.length} index(es)`);

const required = new mongoose.Schema({ label: { type: String, required: true } }, {
  collection: "probe_required",
});
const Required = mongoose.model("ProbeRequired", required);
let rejected = false;
try {
  await Required.create({ label: "" });
} catch {
  rejected = true;
}
check("schema validation is enforced by the server", rejected);

await Probe.deleteMany({});
await Required.deleteMany({});
await mongoose.connection.dropDatabase();

await disconnectDb();

const failed = results.filter((r) => !r.passed).length;
console.log(`\n${results.length - failed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
