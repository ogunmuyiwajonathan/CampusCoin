import "dotenv/config";
import { useTestDatabaseEnv } from "./helpers/testDb.js";

useTestDatabaseEnv();
process.env.CORS_ORIGIN = "http://localhost:5173";

const stamp = Date.now();
const adminEmail = `admintips-${stamp}@campuscoin.test`;
process.env.ADMIN_EMAIL = adminEmail;

const { connectDb, disconnectDb } = await import("../src/config/db.js");
const { User, Category, Transaction, TipTemplate, Tip } = await import("../src/models/index.js");
const app = (await import("../src/app.js")).default;
const tipsEngine = await import("../src/services/tips.service.js");

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

const json = async (res) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

await connectDb();

const bcrypt = (await import("bcryptjs")).default;
const admin = await User.create({
  name: `admintips ${stamp}`,
  email: adminEmail,
  password_hash: await bcrypt.hash("AdminPass!23", 10),
  role: "admin",
});
const student = await User.create({
  name: `admintips student ${stamp}`,
  email: `admintipsstudent-${stamp}@campuscoin.test`,
  password_hash: await bcrypt.hash("StudentPass!23", 10),
});

const server = app.listen(0);
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;
let cookie = "";

const call = async (method, path, body) => {
  const headers = { ...(cookie ? { Cookie: cookie } : {}) };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const pair = raw.split(";")[0];
    if (pair.startsWith("campuscoin.sid=")) cookie = pair;
  }
  return res;
};

try {
  process.stdout.write("\n1. the rules the engine can run are published\n");

  const login = await call("POST", "/api/admin/auth/login", { password: "AdminPass!23" });
  check("the admin signs in", login.status === 200, `got ${login.status}`);

  const rulesRes = await call("GET", "/api/admin/tip-rules");
  const rulesBody = await json(rulesRes);
  check("the rules route answers 200", rulesRes.status === 200, `got ${rulesRes.status}`);
  check("it returns the three rules", rulesBody?.rules?.length === 3, JSON.stringify(rulesBody?.rules?.map((r) => r.rule)));
  check(
    "every rule carries a label and an explanation",
    rulesBody?.rules?.every((r) => r.label && r.description),
    JSON.stringify(rulesBody?.rules?.[0]),
  );
  check(
    "every rule says which placeholders it fills",
    rulesBody?.rules?.every((r) => Array.isArray(r.placeholders)),
  );
  check(
    "the rules match what the engine actually implements",
    rulesBody?.rules?.map((r) => r.rule).sort().join(",") ===
      "budget_near_limit,category_share_above,no_transactions",
    JSON.stringify(rulesBody?.rules?.map((r) => r.rule)),
  );

  process.stdout.write("\n2. a rule the engine cannot run is refused\n");

  const unknown = await call("POST", "/api/admin/tips", {
    key: "probe_unknown_rule",
    text: "A rule the engine has never heard of.",
    rule: "phase_of_the_moon",
    is_active: true,
  });
  const unknownBody = await json(unknown);
  check("an unknown rule is rejected", unknown.status === 400, `got ${unknown.status}`);
  check(
    "the field message names the rules that do work",
    /category is too big a share/i.test(unknownBody?.error?.details?.rule ?? ""),
    JSON.stringify(unknownBody?.error),
  );
  check(
    "nothing was written",
    (await TipTemplate.countDocuments({ key: "probe_unknown_rule" })) === 0,
  );

  const emptyRule = await call("POST", "/api/admin/tips", { key: "probe_no_rule", text: "No rule at all." });
  const emptyBody = await json(emptyRule);
  check("a tip with no rule is a 400, not a 500", emptyRule.status === 400, `got ${emptyRule.status}`);
  check(
    "and the message says a rule is required, in plain English",
    /required/i.test(emptyBody?.error?.details?.rule ?? "") &&
      /budget is close to its limit/i.test(emptyBody?.error?.details?.rule ?? ""),
    JSON.stringify(emptyBody?.error),
  );

  process.stdout.write("\n3. a valid template is accepted and reaches a student\n");

  const food = await Category.findOneAndUpdate(
    { user_id: null, name: "Food", type: "expense" },
    { $set: { is_default: true } },
    { upsert: true, returnDocument: "after" },
  );
  await Transaction.deleteMany({ user_id: student._id });
  await Transaction.create([
    { user_id: student._id, category_id: food._id, type: "expense", amount: 20000, description: "Canteen", date: "2026-09-06" },
  ]);

  const created = await call("POST", "/api/admin/tips", {
    key: "probe_share",
    text: "{category} is your biggest expense at {percentage}% of spending. A weekly cap of {weekly} keeps it in check.",
    rule: "category_share_above",
    threshold: 30,
    savings_impact: 90,
    is_active: true,
  });
  const createdBody = await json(created);
  check("a valid template is accepted", created.status === 201, `got ${created.status} ${JSON.stringify(createdBody)}`);
  check("it has an id the panel can use", Boolean(createdBody?.id ?? createdBody?.tip_template_id), JSON.stringify(Object.keys(createdBody ?? {})));

  const generated = await tipsEngine.generateTips(student._id, "2026-09");
  check("a student now gets the tip", generated.some((tip) => tip.template_key === "probe_share"), JSON.stringify(generated.map((t) => t.template_key)));
  check("the placeholders were filled in", !generated.some((tip) => tip.text.includes("{")), JSON.stringify(generated.map((t) => t.text)));

  process.stdout.write("\n4. a partial update works, which is what Turn off sends\n");

  const id = createdBody.id ?? createdBody.tip_template_id;
  const off = await call("PUT", `/api/admin/tips/${id}`, { is_active: false });
  const offBody = await json(off);
  check("turning one field off answers 200", off.status === 200, `got ${off.status} ${JSON.stringify(offBody)}`);
  check("the template really is off", offBody?.is_active === false, JSON.stringify(offBody?.is_active));

  const afterOff = await tipsEngine.generateTips(student._id, "2026-09");
  check("an inactive template stops reaching students", !afterOff.some((tip) => tip.template_key === "probe_share"), JSON.stringify(afterOff.map((t) => t.template_key)));

  const on = await call("PUT", `/api/admin/tips/${id}`, { is_active: true });
  check("turning it back on answers 200", on.status === 200, `got ${on.status}`);
  const afterOn = await tipsEngine.generateTips(student._id, "2026-09");
  check("and it reaches students again", afterOn.some((tip) => tip.template_key === "probe_share"), JSON.stringify(afterOn.map((t) => t.template_key)));

  process.stdout.write("\n5. the panel is told when wording and rule disagree\n");

  const badWord = await call("PUT", `/api/admin/tips/${id}`, {
    text: "You have {remaining} left this week.",
  });
  check("the server accepts any wording for now", badWord.status === 200, `got ${badWord.status}`);
  const stillFine = await tipsEngine.generateTips(student._id, "2026-09");
  const rendered = stillFine.find((tip) => tip.template_key === "probe_share");
  check(
    "an unfilled placeholder would reach the student, which the panel warns about",
    rendered?.text.includes("{remaining}"),
    rendered?.text,
  );

  process.stdout.write("\n6. a key cannot be changed into something unusable\n");

  const badKey = await call("POST", "/api/admin/tips", {
    key: "Not A Valid Key!",
    text: "Bad key.",
    rule: "no_transactions",
  });
  check("a key with capitals and punctuation is rejected", badKey.status === 400, `got ${badKey.status}`);

  const outOfRange = await call("POST", "/api/admin/tips", {
    key: "probe_range",
    text: "Out of range.",
    rule: "no_transactions",
    savings_impact: 500,
  });
  check("a priority above 100 is rejected", outOfRange.status === 400, `got ${outOfRange.status}`);

  process.stdout.write("\n7. the listing has everything the panel renders\n");

  const listed = await call("GET", "/api/admin/tips");
  const rows = await json(listed);
  const row = rows.find((entry) => entry.key === "probe_share");
  check("the list is an array", Array.isArray(rows), JSON.stringify(typeof rows));
  check("a row has an id", Boolean(row?.id ?? row?.tip_template_id), JSON.stringify(Object.keys(row ?? {})));
  check("a row has its rule back", row?.rule === "category_share_above", row?.rule);
  check("a row has its threshold back", row?.threshold === 30, JSON.stringify(row?.threshold));
  check("a row has its priority back", row?.savings_impact === 90, JSON.stringify(row?.savings_impact));
  check("a row has its active flag back", row?.is_active === true, JSON.stringify(row?.is_active));

  process.stdout.write("\n8. deleting a template takes it off the students' lists\n");

  const removed = await call("DELETE", `/api/admin/tips/${id}`);
  check("delete answers 200", removed.status === 200, `got ${removed.status}`);
  const afterDelete = await tipsEngine.generateTips(student._id, "2026-09");
  check("the tip is gone from the student's list", !afterDelete.some((tip) => tip.template_key === "probe_share"), JSON.stringify(afterDelete.map((t) => t.template_key)));
} finally {
  await Tip.deleteMany({ user_id: student._id });
  await Transaction.deleteMany({ user_id: student._id });
  await TipTemplate.deleteMany({ key: { $in: ["probe_share", "probe_unknown_rule", "probe_no_rule", "probe_range"] } });
  await User.deleteOne({ _id: student._id });
  await User.deleteOne({ _id: admin._id });
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await disconnectDb();
}

process.stdout.write(`\nadmin tips panel: ${passed} passed, ${failed} failed\n`);
if (failed) {
  process.stdout.write(`failing: ${failures.join(", ")}\n`);
  process.exitCode = 1;
}
