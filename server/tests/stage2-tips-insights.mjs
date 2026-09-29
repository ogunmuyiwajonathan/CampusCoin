import "dotenv/config";
import { useTestDatabaseEnv } from "./helpers/testDb.js";

useTestDatabaseEnv();

const { connectDb, disconnectDb } = await import("../src/config/db.js");
const { User, Category, Transaction, Budget, Insight, Tip, TipTemplate } = await import(
  "../src/models/index.js"
);
const insights = await import("../src/services/insights.service.js");
const tips = await import("../src/services/tips.service.js");

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
const month = "2026-07";
const prev = "2026-06";

const user = await User.create({
  name: `Stage2 ${stamp}`,
  email: `stage2-${stamp}@campuscoin.test`,
  password_hash: "x",
  profileOnboarded: true,
  monthly_savings_goal: 20000,
});

const food = await Category.create({
  name: `S2 Food ${stamp}`,
  type: "expense",
  is_default: false,
  user_id: user._id,
  color: "#10b981",
});
const transport = await Category.create({
  name: `S2 Transport ${stamp}`,
  type: "expense",
  is_default: false,
  user_id: user._id,
});
const allowance = await Category.create({
  name: `S2 Allowance ${stamp}`,
  type: "income",
  is_default: false,
  user_id: user._id,
});

const TEMPLATES = [
  {
    key: `s2_top_${stamp}`,
    text: "{category} is your biggest expense at {percentage}% of spending. A weekly cap of {weekly} keeps it in check.",
    rule: "category_share_above",
    threshold: 30,
    savings_impact: 90,
  },
  {
    key: `s2_budget_${stamp}`,
    text: "You are at {percentage}% of your {category} budget. {remaining} left for the rest of the month.",
    rule: "budget_near_limit",
    threshold: 95,
    savings_impact: 80,
  },
  {
    key: `s2_none_${stamp}`,
    text: "Log a few transactions and I will show you exactly where your money is going.",
    rule: "no_transactions",
    savings_impact: 10,
  },
  {
    key: `s2_unknown_${stamp}`,
    text: "This rule does not exist.",
    rule: "not_a_real_rule",
    savings_impact: 99,
  },
];

try {
  for (const template of TEMPLATES) await TipTemplate.create(template);

  process.stdout.write("\n1. an insight is generated and stored for a month\n");

  await Transaction.create([
    { user_id: user._id, category_id: food._id, type: "expense", amount: 3000, description: "Canteen", date: `${month}-05` },
    { user_id: user._id, category_id: transport._id, type: "expense", amount: 500, description: "Bus", date: `${month}-06` },
    { user_id: user._id, category_id: allowance._id, type: "income", amount: 40000, description: "Allowance", date: `${month}-01` },
  ]);

  const generated = await insights.generateInsight(user._id, month);
  check("generateInsight returns a row", Boolean(generated?.insight_id), JSON.stringify(generated));
  check("it is for the month asked for", generated?.month === month, `got ${generated?.month}`);
  check("a summary was written", typeof generated?.summary_text === "string" && generated.summary_text.length > 0, JSON.stringify(generated?.summary_text));
  check("a tip was written", typeof generated?.tip_text === "string" && generated.tip_text.length > 0, JSON.stringify(generated?.tip_text));
  check("generated_at was stamped", Boolean(generated?.generated_at), JSON.stringify(generated?.generated_at));

  const stored = await Insight.findOne({ user_id: user._id, month });
  check("the row really is in the database", Boolean(stored));
  check("the summary names a real category", stored.summary_text.includes(food.name), stored.summary_text);
  check("the summary uses a naira amount", /N[\d,]+/.test(stored.summary_text), stored.summary_text);
  check("the summary reports real spending", /3,500/.test(stored.summary_text), stored.summary_text);
  check("it says money was saved", /saved/i.test(stored.summary_text), stored.summary_text);
  check("it mentions the savings goal", /20,000/.test(stored.summary_text), stored.summary_text);

  process.stdout.write("\n2. the same month is regenerated, not duplicated\n");

  const again = await insights.generateInsight(user._id, month);
  check("it returns the same insight id", again.insight_id === generated.insight_id, `${again.insight_id} vs ${generated.insight_id}`);
  const count = await Insight.countDocuments({ user_id: user._id, month });
  check("only one row exists for the month", count === 1, `found ${count}`);
  check("a plain re-read keeps the narrative the student already read", again.summary_text === generated.summary_text, "cached text changed without being asked");

  await Transaction.create({
    user_id: user._id,
    category_id: food._id,
    type: "expense",
    amount: 700,
    description: "Late canteen",
    date: `${month}-28`,
  });
  const refreshed = await insights.regenerateInsight(user._id, month);
  check("regenerating rewrites the summary in place", refreshed.insight_id === generated.insight_id, `${refreshed.insight_id} vs ${generated.insight_id}`);
  check("the new numbers reach the summary", refreshed.summary_text !== stored.summary_text, "summary did not change");
  check("the new total is quoted", /4,200/.test(refreshed.summary_text), refreshed.summary_text);
  check("still one row after regenerating", (await Insight.countDocuments({ user_id: user._id, month })) === 1);

  process.stdout.write("\n3. month-over-month comparison is real\n");

  await Transaction.create([
    { user_id: user._id, category_id: food._id, type: "expense", amount: 1000, description: "Snack", date: `${prev}-05` },
    { user_id: user._id, category_id: allowance._id, type: "income", amount: 20000, description: "Allowance", date: `${prev}-01` },
  ]);
  const compared = await insights.regenerateInsight(user._id, month);
  check("a month-on-month change is reported in words", /last month/i.test(compared.summary_text), compared.summary_text);

  process.stdout.write("\n4. history is browsable by month\n");

  await insights.regenerateInsight(user._id, prev);
  const history = await insights.listInsights(user._id);
  check("history lists both months", history.length === 2, `found ${history.length}`);
  check("history is newest first", history[0].month === month, JSON.stringify(history.map((r) => r.month)));
  check("each history row has a summary", history.every((row) => row.summary_text?.length > 0));

  const one = await insights.getOrGenerateInsight(user._id, prev);
  check("a past month reads back", one.month === prev, `got ${one.month}`);
  check("a past month keeps its own numbers", one.summary_text !== compared.summary_text, one.summary_text);

  process.stdout.write("\n5. the tips engine reads TipTemplate and ranks by savings\n");

  const generated2 = await tips.listTips(user._id, month);
  check("tips are produced", generated2.length > 0, `found ${generated2.length}`);
  const topKey = `s2_top_${stamp}`;
  const topTip = generated2.find((tip) => tip.template_key === topKey);
  check("the top-category template fired", Boolean(topTip), JSON.stringify(generated2.map((t) => t.template_key)));
  check("its text is the admin's wording with numbers filled in", /biggest expense at \d+% of spending/.test(topTip?.text ?? ""), topTip?.text);
  check("the real category name is in it", topTip?.text.includes(food.name), topTip?.text);
  check("a weekly figure was substituted", !topTip?.text.includes("{weekly}"), topTip?.text);
  check("no placeholder is left behind", !/\{/.test(topTip?.text ?? ""), topTip?.text);
  check("the template with no real rule produced nothing", !generated2.some((tip) => tip.template_key === `s2_unknown_${stamp}`), JSON.stringify(generated2.map((t) => t.template_key)));
  check("the no_transactions template did not fire when there are transactions", !generated2.some((tip) => tip.template_key === `s2_none_${stamp}`));

  check("tips are ordered by savings impact", (() => {
    const impacts = generated2.map((tip) => tip.savings_impact);
    return impacts.every((value, index) => index === 0 || impacts[index - 1] >= value);
  })(), JSON.stringify(generated2.map((t) => [t.template_key, t.savings_impact])));

  process.stdout.write("\n6. the budget template fires on real budget data\n");

  await Budget.create({
    user_id: user._id,
    category_id: food._id,
    month,
    limit_amount: 3500,
  });
  const withBudget = await tips.listTips(user._id, month);
  const budgetTip = withBudget.find((tip) => tip.template_key === `s2_budget_${stamp}`);
  check("the budget template fired", Boolean(budgetTip), JSON.stringify(withBudget.map((t) => t.template_key)));
  check("it names the budgeted category", budgetTip?.text.includes(food.name), budgetTip?.text);
  check("it quotes the real percentage", /9[0-9]%|100%/.test(budgetTip?.text ?? ""), budgetTip?.text);
  check("the remaining figure is filled in", !budgetTip?.text.includes("{remaining}"), budgetTip?.text);

  process.stdout.write("\n7. pin and dismiss are real per-user state\n");

  const pinTarget = generated2[0];
  const pinned = await tips.setTipPinned(user._id, pinTarget.tip_id, true);
  check("pinning works", pinned?.is_pinned === true, JSON.stringify(pinned));
  const afterPin = await tips.listTips(user._id, month);
  check("a pinned tip sorts first", afterPin[0].tip_id === pinTarget.tip_id, `first is ${afterPin[0].template_key}`);
  check("it survives a regeneration", (await tips.listTips(user._id, month))[0].tip_id === pinTarget.tip_id);

  const un = await tips.setTipPinned(user._id, pinTarget.tip_id, false);
  check("unpinning works", un?.is_pinned === false, JSON.stringify(un));

  const dismissTarget = afterPin.find((tip) => tip.tip_id !== pinTarget.tip_id);
  const dismissed = await tips.dismissTip(user._id, dismissTarget.tip_id);
  check("dismissing works", dismissed?.is_dismissed === true, JSON.stringify(dismissed));
  const afterDismiss = await tips.listTips(user._id, month);
  check("a dismissed tip is gone from the list", !afterDismiss.some((tip) => tip.tip_id === dismissTarget.tip_id), JSON.stringify(afterDismiss.map((t) => t.template_key)));
  const dismissedList = await tips.listDismissedTips(user._id, month);
  check("it is readable again from the dismissed list", dismissedList.some((tip) => tip.tip_id === dismissTarget.tip_id), JSON.stringify(dismissedList.map((t) => t.template_key)));
  check("a dismissed tip stays dismissed after a regeneration", !(await tips.listTips(user._id, month)).some((tip) => tip.tip_id === dismissTarget.tip_id));

  const restoredTip = await tips.restoreTip(user._id, dismissTarget.tip_id);
  check("restoring a dismissed tip works", restoredTip?.is_dismissed === false, JSON.stringify(restoredTip));
  check("it is back in the list", (await tips.listTips(user._id, month)).some((tip) => tip.tip_id === dismissTarget.tip_id));

  process.stdout.write("\n8. an admin edit reaches the student, a deactivation stops it\n");

  await TipTemplate.updateOne(
    { key: topKey },
    { $set: { text: "REVISED: {category} is {percentage}% of your spending." } },
  );
  const afterEdit = await tips.listTips(user._id, month);
  check("the new wording reaches the student", (afterEdit.find((tip) => tip.template_key === topKey)?.text ?? "").startsWith("REVISED"), afterEdit.find((tip) => tip.template_key === topKey)?.text);

  await TipTemplate.updateOne({ key: topKey }, { $set: { is_active: false } });
  const afterOff = await tips.listTips(user._id, month);
  check("a deactivated template stops producing tips", !afterOff.some((tip) => tip.template_key === topKey), JSON.stringify(afterOff.map((t) => t.template_key)));

  process.stdout.write("\n9. one student's tips and insights are private\n");

  const other = await User.create({
    name: `Stage2 Other ${stamp}`,
    email: `stage2other-${stamp}@campuscoin.test`,
    password_hash: "x",
  });
  const otherCategory = await Category.create({
    name: `S2 Other ${stamp}`,
    type: "expense",
    is_default: false,
    user_id: other._id,
  });
  await Transaction.create({
    user_id: other._id,
    category_id: otherCategory._id,
    type: "expense",
    amount: 9000,
    description: "Theirs",
    date: `${month}-04`,
  });

  const theirTips = await tips.listTips(other._id, month);
  check("they get their own tips", theirTips.length > 0, `found ${theirTips.length}`);
  check("their tip names their category", theirTips.some((tip) => tip.text.includes(otherCategory.name)), JSON.stringify(theirTips.map((t) => t.text)));
  const myTipsAfter = await tips.listTips(user._id, month);
  check("my tips are unaffected by theirs", !myTipsAfter.some((tip) => tip.text.includes(otherCategory.name)));
  check("their tip count on my ledger did not grow", (await Tip.countDocuments({ user_id: user._id })) === myTipsAfter.length);

  const theirInsights = await insights.listInsights(other._id);
  check("their insight history is their own", theirInsights.every((row) => row.month === month || row.month === prev));
  check("I cannot read their insight rows", (await insights.listInsights(user._id)).every((row) => row.summary_text !== theirInsights[0]?.summary_text || theirInsights.length === 0));

  check("pinning someone else's tip fails", (await tips.setTipPinned(user._id, theirTips[0].tip_id, true)) === null);
  check("dismissing someone else's tip fails", (await tips.dismissTip(user._id, theirTips[0].tip_id)) === null);

  process.stdout.write("\n10. a month with no activity still answers sensibly\n");

  const emptyMonth = "2026-01";
  const empty = await insights.regenerateInsight(user._id, emptyMonth);
  check("an empty month still gets a stored insight", Boolean(empty.insight_id), JSON.stringify(empty));
  check("it says there is nothing to compare", /nothing/i.test(empty.summary_text), empty.summary_text);
  const emptyTips = await tips.listTips(user._id, emptyMonth);
  check("the no_transactions tip fires for an empty month", emptyTips.some((tip) => tip.template_key === `s2_none_${stamp}`), JSON.stringify(emptyTips.map((t) => t.template_key)));

  await Transaction.deleteMany({ user_id: other._id });
  await Tip.deleteMany({ user_id: other._id });
  await Insight.deleteMany({ user_id: other._id });
  await Budget.deleteMany({ user_id: other._id });
  await Category.deleteMany({ user_id: other._id });
  await User.deleteOne({ _id: other._id });
} finally {
  await Transaction.deleteMany({ user_id: user._id });
  await Tip.deleteMany({ user_id: user._id });
  await Insight.deleteMany({ user_id: user._id });
  await Budget.deleteMany({ user_id: user._id });
  await Category.deleteMany({ user_id: user._id });
  await User.deleteOne({ _id: user._id });
  await TipTemplate.deleteMany({ key: { $in: TEMPLATES.map((template) => template.key) } });
  await disconnectDb();
}

process.stdout.write(`\nstage2 tips + insights: ${passed} passed, ${failed} failed\n`);
if (failed) {
  process.stdout.write(`failing: ${failures.join(", ")}\n`);
  process.exitCode = 1;
}
