import "dotenv/config";
import { useTestDatabaseEnv } from "./helpers/testDb.js";

useTestDatabaseEnv();

const { connectDb, disconnectDb } = await import("../src/config/db.js");
const { User, Category, CategorySuggestion } = await import("../src/models/index.js");
const categorise = await import("../src/services/categorise.service.js");

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

await connectDb();

const stamp = Date.now();

const defaults = [
  { name: "Food", type: "expense" },
  { name: "Transport", type: "expense" },
  { name: "Academics", type: "expense" },
  { name: "Entertainment", type: "expense" },
  { name: "Allowance", type: "income" },
  { name: "Others", type: "expense" },
];
for (const entry of defaults) {
  const existing = await Category.findOne({ user_id: null, name: entry.name, type: entry.type });
  if (!existing) await Category.create({ ...entry, is_default: true, user_id: null });
}

const user = await User.create({
  name: `Stage3 ${stamp}`,
  email: `stage3-${stamp}@campuscoin.test`,
  password_hash: "x",
  profileOnboarded: true,
});

const own = await Category.create({
  name: `S3 Guitar Lessons ${stamp}`,
  type: "expense",
  is_default: false,
  user_id: user._id,
});

const other = await User.create({
  name: `Stage3 Other ${stamp}`,
  email: `stage3other-${stamp}@campuscoin.test`,
  password_hash: "x",
});

try {
  process.stdout.write("\n1. a description is categorised from its words\n");

  const cafe = await categorise.suggestCategory(user._id, "Campus Cafe");
  check("'Campus Cafe' is categorised", Boolean(cafe?.category), JSON.stringify(cafe));
  check("it lands on Food", cafe.category.name === "Food", `got ${cafe.category.name}`);
  check("the source is reported", cafe.source === "keyword", `got ${cafe.source}`);
  check("the matched word is reported", cafe.matched === "cafe", `got ${cafe.matched}`);
  check("confidence is between 0 and 1", cafe.confidence > 0 && cafe.confidence <= 1, `got ${cafe.confidence}`);

  const bus = await categorise.suggestCategory(user._id, "Bus fare to school");
  check("a transport phrase lands on Transport", bus.category.name === "Transport", `got ${bus.category.name}`);

  const tuition = await categorise.suggestCategory(user._id, "Second semester tuition");
  check("a tuition phrase lands on Academics", tuition.category.name === "Academics", `got ${tuition.category.name}`);

  const gig = await categorise.suggestCategory(user._id, "Freelance gig payout");
  check("income is categorised as income", gig.category.type === "income", `got ${gig.category.name}/${gig.category.type}`);

  check("punctuation and case do not matter", (await categorise.suggestCategory(user._id, "CAMPUS CAFE!!!")).category.name === "Food");
  check("a word inside a longer string still matches", (await categorise.suggestCategory(user._id, "spent at the cafeteria today")).category.name === "Food");

  process.stdout.write("\n2. something unrecognisable still gets an answer\n");

  const unknown = await categorise.suggestCategory(user._id, "zqxwv blorptastic");
  check("an unknown phrase still returns a category", Boolean(unknown?.category), JSON.stringify(unknown));
  check("it falls back rather than returning nothing", unknown.source === "default" || unknown.source === "ai", `got ${unknown.source}`);
  check("the fallback is an expense category", unknown.category.type === "expense", `got ${unknown.category.type}`);
  const empty = await categorise.suggestCategory(user._id, "   ");
  check("empty text still answers", Boolean(empty?.category), JSON.stringify(empty));

  process.stdout.write("\n3. a personal category is reachable\n");

  const named = await Category.create({
    name: `Violin ${stamp}`,
    type: "expense",
    is_default: false,
    user_id: user._id,
  });
  const byName = await categorise.suggestCategory(user._id, `Violin ${stamp}`);
  check("a personal category is found when its name is typed", byName.category.name === named.name, `got ${byName.category.name}`);

  const prefixed = await categorise.suggestCategory(user._id, `Guitar Lessons ${stamp}`);
  check("a prefixed name is not guessed from a partial match", prefixed.category.name !== own.name, `got ${prefixed.category.name}`);
  check("it still answers with something", Boolean(prefixed.category), JSON.stringify(prefixed));

  process.stdout.write("\n4. a correction is learned, and only for that student\n");

  const before = await categorise.suggestCategory(user._id, "harmattan market stalls");
  check("before the correction it is not the personal category", before.category.name !== own.name, `got ${before.category.name}`);

  await categorise.recordSuggestion(user._id, "harmattan market stalls", own._id);
  const after = await categorise.suggestCategory(user._id, "harmattan market stalls");
  check("after the correction it is the personal category", after.category.name === own.name, `got ${after.category.name}`);
  check("the source says it was learned", after.source === "learned", `got ${after.source}`);

  const rows = await CategorySuggestion.find({ user_id: user._id }).lean();
  check("the correction is stored", rows.length > 0, `found ${rows.length}`);
  check("the stored row points at the chosen category", rows.every((row) => String(row.category_id) === String(own._id)), JSON.stringify(rows.map((r) => String(r.category_id))));
  check("the stored key is lower case", rows.every((row) => row.description_key === row.description_key.toLowerCase()));

  await categorise.recordSuggestion(user._id, "harmattan market stalls", own._id);
  await categorise.recordSuggestion(user._id, "harmattan market stalls", own._id);
  const strengthened = await CategorySuggestion.findOne({ user_id: user._id, description_key: "harmattan" }).lean();
  check("repeating the correction raises the hit count", (strengthened?.hit_count ?? 0) >= 3, `got ${strengthened?.hit_count}`);
  check("repeating it does not duplicate the row", (await CategorySuggestion.countDocuments({ user_id: user._id, description_key: "harmattan" })) === 1);

  process.stdout.write("\n5. learning beats the shared rules for that student\n");

  const food = await Category.findOne({ user_id: null, name: "Food", type: "expense" });
  await categorise.recordSuggestion(user._id, "canteen lunch", own._id);
  const overridden = await categorise.suggestCategory(user._id, "Canteen Lunch");
  check("a learned pairing outranks the keyword rule", overridden.category.name === own.name, `got ${overridden.category.name}`);
  check("and it is reported as learned", overridden.source === "learned", `got ${overridden.source}`);
  const otherStudent = await categorise.suggestCategory(other._id, "Canteen Lunch");
  check("the same words still map to Food for another student", otherStudent.category.name === "Food", `got ${otherStudent.category.name}`);
  check("another student's answer is not learned", otherStudent.source !== "learned", `got ${otherStudent.source}`);
  void food;

  process.stdout.write("\n6. a learned pairing is per student and cannot be written for another\n");

  const mineOnly = await CategorySuggestion.find({ user_id: user._id }).lean();
  check("no learning rows exist for the other student", (await CategorySuggestion.countDocuments({ user_id: other._id })) === 0);
  check("every learned row is mine", mineOnly.every((row) => String(row.user_id) === String(user._id)));

  process.stdout.write("\n7. a category the student cannot see is refused\n");

  const theirCategory = await Category.create({
    name: `S3 Theirs ${stamp}`,
    type: "expense",
    is_default: false,
    user_id: other._id,
  });
  let refused = false;
  try {
    await categorise.recordSuggestion(user._id, "their thing", theirCategory._id);
  } catch (error) {
    refused = error.status === 400;
  }
  check("recording a category I do not own is refused", refused, "it was accepted");
  check("nothing was learned from the refused attempt", !(await CategorySuggestion.findOne({ user_id: user._id, description_key: "their" }).lean()));

  process.stdout.write("\n8. batch suggestions work per row, for CSV import\n");

  const batch = await categorise.suggestBatch(user._id, [
    { row: 2, description: "Campus Cafe" },
    { row: 3, description: "Bus fare" },
    { row: 4, description: "Harmattan Market Stalls" },
    { row: 5, description: "" },
    { row: 6, description: "zqxwv blorptastic" },
  ]);

  check("one answer per row", batch.length === 5, `found ${batch.length}`);
  check("the row number is echoed back", batch.map((entry) => entry.row).join(",") === "2,3,4,5,6", JSON.stringify(batch.map((e) => e.row)));
  check("row 2 is Food", batch[0].category?.name === "Food", JSON.stringify(batch[0]));
  check("row 3 is Transport", batch[1].category?.name === "Transport", JSON.stringify(batch[1]));
  check("row 4 uses what was learned", batch[2].category?.name === own.name, JSON.stringify(batch[2]));
  check("an empty row is skipped, not guessed", batch[3].category === null && batch[3].source === "skipped", JSON.stringify(batch[3]));
  check("an unknown row still gets a category", Boolean(batch[4].category), JSON.stringify(batch[4]));
  check("every category id is a real string", batch.filter((e) => e.category).every((e) => typeof e.category.category_id === "string"), JSON.stringify(batch.map((e) => e.category?.category_id)));
  check("every answer names its category type", batch.filter((e) => e.category).every((e) => ["income", "expense"].includes(e.category.type)), JSON.stringify(batch.map((e) => e.category?.type)));
  check("confidence is on every answered row", batch.filter((e) => e.category).every((e) => typeof e.confidence === "number"), JSON.stringify(batch.map((e) => e.confidence)));

  process.stdout.write("\n9. a student's own categories are not offered to anyone else\n");

  const theirBatch = await categorise.suggestBatch(other._id, [{ row: 1, description: `Guitar Lessons ${stamp}` }]);
  check("another student is never offered my category", theirBatch[0].category?.name !== own.name, JSON.stringify(theirBatch[0]));

  await Category.deleteOne({ _id: theirCategory._id });
  await Category.deleteOne({ _id: named._id });
} finally {
  await CategorySuggestion.deleteMany({ user_id: { $in: [user._id, other._id] } });
  await Category.deleteMany({ user_id: { $in: [user._id, other._id] } });
  await User.deleteMany({ _id: { $in: [user._id, other._id] } });
  await disconnectDb();
}

process.stdout.write(`\nstage3 categorise: ${passed} passed, ${failed} failed\n`);
if (failed) {
  process.stdout.write(`failing: ${failures.join(", ")}\n`);
  process.exitCode = 1;
}
