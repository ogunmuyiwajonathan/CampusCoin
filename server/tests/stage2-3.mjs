import "dotenv/config";
import { useTestDatabaseEnv } from "./helpers/testDb.js";

useTestDatabaseEnv();

const { connectDb, disconnectDb } = await import("../src/config/db.js");
const {
  User,
  Category,
  Transaction,
  Budget,
  Insight,
  Tip,
  TipTemplate,
  CategorySuggestion,
} = await import("../src/models/index.js");
const insights = await import("../src/services/insights.service.js");
const tips = await import("../src/services/tips.service.js");
const categorise = await import("../src/services/categorise.service.js");
const ledger = await import("../src/services/ledger.service.js");

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
const user = await User.create({
  name: `Alex Stage2 ${stamp}`,
  email: `stage2-${stamp}@campuscoin.test`,
  password_hash: "x",
  profileOnboarded: true,
  monthly_savings_goal: 20000,
});

// Upserted rather than created, because a previous run of this suite leaves the
// shared defaults behind and the unique index on (user_id, name, type) is right
// to refuse a second one.
const defaultCategory = (name, type) =>
  Category.findOneAndUpdate(
    { user_id: null, name, type },
    { $set: { is_default: true } },
    { upsert: true, returnDocument: "after" },
  ).then((doc) => doc);

const food = await defaultCategory("Food", "expense");
const transport = await defaultCategory("Transport", "expense");
await defaultCategory("Others", "expense");
const academics = await defaultCategory("Academics", "expense");
const entertainment = await defaultCategory("Entertainment", "expense");
const hostel = await defaultCategory("Hostel/Rent", "expense");
const subscriptions = await defaultCategory("Subscriptions", "expense");
const allowance = await defaultCategory("Allowance", "income");
const gigs = await defaultCategory("Gigs", "income");
const scholarships = await defaultCategory("Scholarships", "income");
const gifts = await defaultCategory("Gifts", "income");

const MONTH = "2026-09";
const PREV = "2026-08";

try {
  process.stdout.write("\n1. an Insight is generated and stored per month\n");

  check("no Insight exists before anything runs", (await Insight.countDocuments({ user_id: user._id })) === 0);

  const before = await Transaction.countDocuments({ user_id: user._id, month: undefined });
  const first = await insights.generateInsight(user._id, MONTH);
  check("generating returns an insight", Boolean(first?.insight_id), JSON.stringify(first));
  check("it is stored for that month", first?.month === MONTH, first?.month);
  check("it has a summary", typeof first?.summary_text === "string" && first.summary_text.length > 20, first?.summary_text);
  check("it has tip text", typeof first?.tip_text === "string" && first.tip_text.length > 10, first?.tip_text);
  check("it has a generated_at", Boolean(first?.generated_at));
  check("the stored count went up by one", (await Insight.countDocuments({ user_id: user._id })) === before + 1);

  process.stdout.write("\n2. the narrative reads the student's own numbers\n");

  await ledger.createTransaction(user._id, { category_id: allowance._id, amount: 80000, description: "Allowance", date: `${MONTH}-05` });
  await ledger.createTransaction(user._id, { category_id: food._id, amount: 24000, description: "Canteen", date: `${MONTH}-06` });
  await ledger.createTransaction(user._id, { category_id: transport._id, amount: 6000, description: "Bus", date: `${MONTH}-07` });
  await ledger.createTransaction(user._id, { category_id: food._id, amount: 5000, description: "Groceries", date: `${PREV}-06` });
  await ledger.createTransaction(user._id, { category_id: transport._id, amount: 20000, description: "Bus last month", date: `${PREV}-07` });

  const september = await insights.regenerateInsight(user._id, MONTH);
  check("the summary names the month", september.summary_text.includes(MONTH) || september.summary_text.includes("September"), september.summary_text);
  check("it mentions the biggest category", september.summary_text.includes("Food"), september.summary_text);
  check("it says how much was left over", /left over/.test(september.summary_text), september.summary_text);
  check("it reports a count of transactions", /\d+ transactions/.test(september.summary_text), september.summary_text);

  const august = await insights.getOrGenerateInsight(user._id, PREV);
  check("a different month gets its own insight", august.insight_id !== september.insight_id);
  check("the older month has its own numbers", /Transport/.test(august.summary_text), august.summary_text);
  check("two months are stored", (await Insight.countDocuments({ user_id: user._id })) === 2);

  process.stdout.write("\n3. the unique index keeps one Insight per month\n");

  const again = await insights.getOrGenerateInsight(user._id, MONTH);
  check("reading an existing month returns the same row", again.insight_id === september.insight_id, `${again.insight_id} vs ${september.insight_id}`);
  await Promise.all([
    insights.regenerateInsight(user._id, MONTH),
    insights.regenerateInsight(user._id, MONTH),
  ]);
  check("concurrent regeneration still leaves one row", (await Insight.countDocuments({ user_id: user._id, month: MONTH })) === 1);

  process.stdout.write("\n4. history lists the months newest first\n");

  const history = await insights.listInsights(user._id);
  check("history is newest month first", history[0].month === MONTH && history[1].month === PREV, JSON.stringify(history.map((i) => i.month)));
  check("history carries both texts", history.every((i) => i.summary_text && i.tip_text));

  process.stdout.write("\n5. tip templates are consumed and ranked\n");

  await TipTemplate.deleteMany({ key: { $in: ["top_category_share", "budget_near_limit", "no_logging"] } });
  await TipTemplate.create([
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
  ]);

  const generated = await tips.generateTips(user._id, MONTH).then(() => tips.listTips(user._id, MONTH));
  check("tips are generated from the templates", generated.length >= 1, `got ${generated.length}`);
  check("the top-category rule fired", generated.some((tip) => tip.text.includes("Food") && tip.text.includes("%")), JSON.stringify(generated.map((t) => t.text)));
  check("the placeholders are filled, not left raw", !generated.some((tip) => tip.text.includes("{")), JSON.stringify(generated.map((t) => t.text)));
  check("the no_transactions rule did not fire", !generated.some((tip) => tip.text.startsWith("Log a few")), JSON.stringify(generated.map((t) => t.text)));
  check("tips are stored for the month", (await Tip.countDocuments({ user_id: user._id, month: MONTH })) === generated.length);
  check("a template_key links each tip back to its template", generated.every((tip) => tip.template_key), JSON.stringify(generated.map((t) => t.template_key)));
  check("tips are ranked by savings impact", generated.every((tip, i) => i === 0 || generated[i - 1].savings_impact >= tip.savings_impact), JSON.stringify(generated.map((t) => t.savings_impact)));

  process.stdout.write("\n6. the budget rule only fires near the limit\n");

  await Budget.deleteMany({ user_id: user._id });
  await Budget.create({ user_id: user._id, category_id: transport._id, month: MONTH, limit_amount: 100000 });
  const early = await tips.listTips(user._id, MONTH);
  check("a far-from-limit budget raises no tip", !early.some((tip) => tip.template_key === "budget_near_limit"), JSON.stringify(early.map((t) => t.template_key)));

  await Budget.updateOne({ user_id: user._id }, { $set: { limit_amount: 6100 } });
  const late = await tips.listTips(user._id, MONTH);
  const budgetTip = late.find((tip) => tip.template_key === "budget_near_limit");
  check("a near-limit budget raises the tip", Boolean(budgetTip), JSON.stringify(late.map((t) => t.template_key)));
  check("the tip names the category and the percentage", budgetTip?.text.includes("Transport") && /\d+%/.test(budgetTip?.text ?? ""), budgetTip?.text);
  check("the tip is ranked above the lower-impact one", (late.find((t) => t.template_key === "top_category_share")?.savings_impact ?? 0) >= (budgetTip?.savings_impact ?? 0));

  process.stdout.write("\n7. pin and dismiss are real per-student state\n");

  const toPin = late.find((tip) => tip.template_key === "top_category_share");
  const toDismiss = late.find((tip) => tip.template_key === "budget_near_limit");
  const pinned = await tips.setTipPinned(user._id, toPin.tip_id, true);
  check("pinning works", pinned.is_pinned === true, JSON.stringify(pinned));
  const dismissed = await tips.dismissTip(user._id, toDismiss.tip_id);
  check("dismissing works", dismissed.is_dismissed === true && Boolean(dismissed.dismissed_at), JSON.stringify(dismissed));
  check("dismissing unpins it", dismissed.is_pinned === false);

  const listed = await tips.listTips(user._id, MONTH);
  check("the pinned tip comes first", listed[0].tip_id === toPin.tip_id, JSON.stringify(listed.map((t) => [t.template_key, t.is_pinned])));
  check("a dismissed tip is hidden from the list", !listed.some((tip) => tip.tip_id === toDismiss.tip_id), JSON.stringify(listed.map((t) => t.template_key)));

  const hidden = await tips.listDismissedTips(user._id, MONTH);
  check("a dismissed tip is still readable to undo it", hidden.some((tip) => tip.tip_id === toDismiss.tip_id), JSON.stringify(hidden.map((t) => t.template_key)));

  const restored = await tips.restoreTip(user._id, toDismiss.tip_id);
  check("restoring clears the dismissal", restored.is_dismissed === false && restored.dismissed_at === null, JSON.stringify(restored));
  const backAgain = await tips.listTips(user._id, MONTH);
  check("a restored tip is back in the list", backAgain.some((tip) => tip.tip_id === toDismiss.tip_id), JSON.stringify(backAgain.map((t) => t.template_key)));

  process.stdout.write("\n8. regeneration carries pin and dismiss state across\n");

  const regenerated = await tips.listTips(user._id, MONTH);
  check("a pinned tip is still pinned after regeneration", regenerated.some((tip) => tip.tip_id === toPin.tip_id && tip.is_pinned), JSON.stringify(regenerated.map((t) => [t.template_key, t.is_pinned])));

  await TipTemplate.updateOne({ key: "top_category_share" }, { $set: { text: "REWORDED by the admin: {category} is {percentage}% of your spending." } });
  const reworded = await tips.listTips(user._id, MONTH);
  const rewordedTip = reworded.find((tip) => tip.template_key === "top_category_share");
  check("an admin edit to a template reaches the student", rewordedTip?.text.startsWith("REWORDED"), rewordedTip?.text);
  check("the same row is updated, so the id is stable", rewordedTip?.tip_id === toPin.tip_id, `${rewordedTip?.tip_id} vs ${toPin.tip_id}`);
  check("the reworded tip is still pinned", rewordedTip?.is_pinned === true, JSON.stringify(rewordedTip?.is_pinned));
  await TipTemplate.updateOne({ key: "top_category_share" }, { $set: { text: "{category} is your biggest expense at {percentage}% of spending. A weekly cap of {weekly} keeps it in check." } });

  process.stdout.write("\n9. an inactive template stops producing tips\n");

  await TipTemplate.updateOne({ key: "top_category_share" }, { $set: { is_active: false } });
  const afterDeactivate = await tips.listTips(user._id, MONTH);
  check("the deactivated rule no longer fires", !afterDeactivate.some((tip) => tip.template_key === "top_category_share"), JSON.stringify(afterDeactivate.map((t) => t.template_key)));
  check("the still-active rule keeps firing", afterDeactivate.some((tip) => tip.template_key === "budget_near_limit"));
  await TipTemplate.updateOne({ key: "top_category_share" }, { $set: { is_active: true } });
  const reactivated = await tips.listTips(user._id, MONTH);
  check("reactivating brings the tip back", reactivated.some((tip) => tip.template_key === "top_category_share"), JSON.stringify(reactivated.map((t) => t.template_key)));

  process.stdout.write("\n10. an unknown rule is inert, not a crash\n");

  await TipTemplate.create({
    key: "stage2_mystery",
    text: "A rule the engine does not know.",
    rule: "phase_of_the_moon",
    savings_impact: 999,
  });
  const withUnknown = await tips.listTips(user._id, MONTH);
  check("an unrecognised rule is skipped", !withUnknown.some((tip) => tip.template_key === "stage2_mystery"), JSON.stringify(withUnknown.map((t) => t.template_key)));
  check("the known rules still work", withUnknown.some((tip) => tip.template_key === "budget_near_limit"));
  check("an unknown rule does not outrank the real ones", withUnknown[0]?.template_key !== "stage2_mystery", JSON.stringify(withUnknown[0]?.template_key));
  await TipTemplate.deleteOne({ key: "stage2_mystery" });

  process.stdout.write("\n11. a student with no transactions gets the nudge tip\n");

  const empty = await User.create({
    name: `Stage2 Empty ${stamp}`,
    email: `stage2empty-${stamp}@campuscoin.test`,
    password_hash: "x",
  });
  const emptyTips = await tips.listTips(empty._id, MONTH);
  check("the no_transactions rule fires for an empty ledger", emptyTips.some((tip) => tip.template_key === "no_logging"), JSON.stringify(emptyTips.map((t) => t.template_key)));
  check("the budget rule stays quiet without budgets", !emptyTips.some((tip) => tip.template_key === "budget_near_limit"));
  check("no category rule fires with no spending", !emptyTips.some((tip) => tip.template_key === "top_category_share"));
  await Tip.deleteMany({ user_id: empty._id });
  await User.deleteOne({ _id: empty._id });

  process.stdout.write("\n12. keyword suggestions work without the model\n");

  const campusCafe = await categorise.suggestCategory(user._id, "Campus Cafe");
  check("'Campus Cafe' suggests Food", campusCafe.category.name === "Food", JSON.stringify(campusCafe.category.name));
  check("it says it came from a keyword rule", campusCafe.source === "keyword", campusCafe.source);

  const busFare = await categorise.suggestCategory(user._id, "Bus fare");
  check("'Bus fare' suggests Transport", busFare.category.name === "Transport", busFare.category.name);

  const tuition = await categorise.suggestCategory(user._id, "School fees payment");
  check("'School fees payment' suggests Academics", tuition.category.name === "Academics", tuition.category.name);

  const nonsense = await categorise.suggestCategory(user._id, "...");
  check("an unrecognisable description falls back to Others", nonsense.category.name === "Others", nonsense.category.name);
  check("the fallback is marked as such", nonsense.source === "default", nonsense.source);
  check("the fallback is not confident", nonsense.confidence < 0.5, String(nonsense.confidence));

  process.stdout.write("\n12b. each seeded keyword rule resolves to a real category\n");

  const ruleChecks = [
    ["cafe latte", "Food", food],
    ["uber ride home", "Transport", transport],
    ["hostel rent September", hostel.name, hostel],
    ["past questions printing", "Academics", academics],
    ["netflix subscription", subscriptions.name, subscriptions],
    ["concert tickets", "Entertainment", entertainment],
    ["monthly allowance", allowance.name, allowance],
    ["freelance gig payment", gigs.name, gigs],
    ["bursary award", scholarships.name, scholarships],
    ["birthday gift", gifts.name, gifts],
  ];
  for (const [text, expected, category] of ruleChecks) {
    const got = await categorise.suggestCategory(user._id, text);
    check(`"${text}" -> ${expected}`, String(got.category._id) === String(category._id), `got ${got.category.name}`);
  }

  process.stdout.write("\n13. corrections are learned and outrank the rules\n");

  const myOthers = await Category.create({
    name: `S2 Snacks ${stamp}`,
    type: "expense",
    is_default: false,
    user_id: user._id,
  });
  await categorise.recordSuggestion(user._id, "Campus Cafe", myOthers._id);
  const afterOne = await categorise.suggestCategory(user._id, "Campus Cafe");
  check("one correction beats the keyword rule", afterOne.category._id && String(afterOne.category._id) === String(myOthers._id), JSON.stringify(afterOne.category.name));
  check("the source is recorded as learned", afterOne.source === "learned", afterOne.source);

  await categorise.recordSuggestion(user._id, "Campus Cafe", myOthers._id);
  await categorise.recordSuggestion(user._id, "Campus Cafe", myOthers._id);
  const afterThree = await categorise.suggestCategory(user._id, "Campus Cafe");
  check("repeated corrections raise the confidence", afterThree.confidence > afterOne.confidence, `${afterOne.confidence} -> ${afterThree.confidence}`);
  check("the hit_count accumulates", (await CategorySuggestion.findOne({ user_id: user._id, description_key: "campus" }).lean())?.hit_count >= 3, JSON.stringify(await CategorySuggestion.findOne({ user_id: user._id, description_key: "campus" }).lean()));

  const partial = await categorise.suggestCategory(user._id, "Campus Cafe main hall");
  check("a longer description still uses the learned fragment", String(partial.category._id) === String(myOthers._id), partial.category.name);

  process.stdout.write("\n14. learning is per student, never shared\n");

  const other = await User.create({
    name: `Stage2 Other ${stamp}`,
    email: `stage2other-${stamp}@campuscoin.test`,
    password_hash: "x",
  });
  const theirSuggestion = await categorise.suggestCategory(other._id, "Campus Cafe");
  check("another student gets the shared rule, not my correction", theirSuggestion.category.name === "Food", theirSuggestion.category.name);
  check("no suggestion rows are written for them", (await CategorySuggestion.countDocuments({ user_id: other._id })) === 0);

  const theirOwn = await categorise.suggestCategory(other._id, "jollof rice");
  check("the shared rules work for them too", theirOwn.category.name === "Food", theirOwn.category.name);

  process.stdout.write("\n15. income is suggested as income\n");

  check("'salary' suggests an income category", ["Gigs", "Allowance"].includes((await categorise.suggestCategory(user._id, "salary")).category.name), (await categorise.suggestCategory(user._id, "salary")).category.name);
  check("'scholarship' suggests income", (await categorise.suggestCategory(user._id, "scholarship")).category.name === "Scholarships" || (await categorise.suggestCategory(user._id, "scholarship")).category.type === "income", (await categorise.suggestCategory(user._id, "scholarship")).category.name);

  process.stdout.write("\n16. batch suggestion covers every row\n");

  const batch = await categorise.suggestBatch(user._id, [
    { row: 2, description: "Campus Cafe" },
    { row: 3, description: "Bus fare" },
    { row: 4, description: "" },
    { row: 5, description: "School fees" },
  ]);
  check("batch returns one entry per row", batch.length === 4, `got ${batch.length}`);
  check("row 2 uses the learned category", String(batch[0].category.category_id) === String(myOthers._id), batch[0].category.name);
  check("row 3 is Transport", batch[1].category.name === "Transport", batch[1].category.name);
  check("an empty row is skipped, not guessed", batch[2].category === null, JSON.stringify(batch[2]));
  check("row 5 is Academics", batch[3].category.name === "Academics", batch[3].category.name);
  check("each row keeps its row number", batch.every((entry, index) => entry.row === index + 2), JSON.stringify(batch.map((b) => b.row)));

  process.stdout.write("\n17. tips and insights never leak between students\n");

  const otherTips = await tips.listTips(other._id, MONTH);
  check("another student sees no tips of mine", !otherTips.some((tip) => tip.user_id && String(tip.user_id) === String(user._id)), JSON.stringify(otherTips.map((t) => t.template_key)));
  const otherInsights = await insights.listInsights(other._id);
  check("another student sees no insights of mine", otherInsights.length === 0, `got ${otherInsights.length}`);
  // Pinned here rather than reusing a tip from an earlier step, because a rule
  // that stops applying has its row removed, and that is the intended behaviour
  // rather than something to assert around.
  const mineNow = await tips.listTips(user._id, MONTH);
  const pinnedNow = mineNow.find((tip) => tip.template_key === "budget_near_limit");
  await tips.setTipPinned(user._id, pinnedNow.tip_id, true);

  const crossPin = await tips.setTipPinned(other._id, pinnedNow.tip_id, true);
  check("pinning my tip as them changes nothing", crossPin === null, JSON.stringify(crossPin));
  const crossDismiss = await tips.dismissTip(other._id, pinnedNow.tip_id);
  check("dismissing my tip as them changes nothing", crossDismiss === null);

  // Their read regenerates only their own month.
  await tips.listTips(other._id, MONTH);
  const stillMine = await Tip.findOne({ _id: pinnedNow.tip_id }).lean();
  check("my tip is still pinned", stillMine?.is_pinned === true, JSON.stringify(stillMine?.is_pinned));
  check("my tip was not dismissed by them", stillMine?.is_dismissed === false, JSON.stringify(stillMine?.is_dismissed));
  check("my tip still belongs to me", String(stillMine?.user_id) === String(user._id));

  const regeneratedAgain = await tips.listTips(user._id, MONTH);
  check("and it is still pinned after my own next read", regeneratedAgain.find((tip) => tip.tip_id === pinnedNow.tip_id)?.is_pinned === true, JSON.stringify(regeneratedAgain.map((t) => [t.template_key, t.is_pinned])));

  await Tip.deleteMany({ user_id: other._id });
  await Transaction.deleteMany({ user_id: other._id });
  await User.deleteOne({ _id: other._id });
} finally {
  await Tip.deleteMany({ user_id: user._id });
  await Insight.deleteMany({ user_id: user._id });
  await Budget.deleteMany({ user_id: user._id });
  await Transaction.deleteMany({ user_id: user._id });
  await CategorySuggestion.deleteMany({ user_id: user._id });
  await Category.deleteMany({ user_id: user._id });
  await User.deleteOne({ _id: user._id });
  await TipTemplate.deleteMany({ key: { $in: ["top_category_share", "budget_near_limit", "no_logging"] } });
  // The shared defaults were upserted, so a repeat run can use them again. They
  // are removed last because everything above depends on them.
  await disconnectDb();
}

process.stdout.write(`\nstage2 + stage3 engine: ${passed} passed, ${failed} failed\n`);
if (failed) {
  process.stdout.write(`failing: ${failures.join(", ")}\n`);
  process.exitCode = 1;
}
