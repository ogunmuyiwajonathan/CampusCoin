import "dotenv/config";
import { useTestDatabaseEnv } from "./helpers/testDb.js";

useTestDatabaseEnv();
process.env.CORS_ORIGIN = "http://localhost:5173";

const stamp = Date.now();
const adminEmail = `adminfix-${stamp}@campuscoin.test`;
process.env.ADMIN_EMAIL = adminEmail;

const { connectDb, disconnectDb } = await import("../src/config/db.js");
const { User, Category, Transaction, TransactionHistory } = await import("../src/models/index.js");
const app = (await import("../src/app.js")).default;

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

const client = (appInstance) => {
  const server = appInstance.listen(0);
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  const jar = new Map();

  const cookieHeader = () =>
    [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");

  const capture = (res) => {
    for (const raw of res.headers.getSetCookie?.() ?? []) {
      const [pair] = raw.split(";");
      const index = pair.indexOf("=");
      jar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
    }
  };

  const call = async (method, url, body, options = {}) => {
    const headers = { ...options.headers };
    if (jar.size) headers.Cookie = cookieHeader();
    if (body !== undefined && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    const payload =
      body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body);
    const request = { method, headers };
    if (method !== "GET" && payload !== undefined) request.body = payload;
    const res = await fetch(`${base}${url}`, request);
    capture(res);
    return res;
  };

  return {
    base,
    get: (url, options) => call("GET", url, undefined, options),
    post: (url, body, options) => call("POST", url, body, options),
    put: (url, body, options) => call("PUT", url, body, options),
    patch: (url, body, options) => call("PATCH", url, body, options),
    delete: (url, options) => call("DELETE", url, undefined, options),
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  };
};

await connectDb();

let admin = null;
let student = null;
const api = client(app);

try {
  process.stdout.write("\n1. a disabled student is signed out and blocked\n");

  const bcrypt = (await import("bcryptjs")).default;
  const studentPassword = "StudentPass!23";
  const adminPassword = "AdminPass!23";

  student = await User.create({
    name: `studentfix ${stamp}`,
    email: `studentfix-${stamp}@campuscoin.test`,
    password_hash: await bcrypt.hash(studentPassword, 10),
    role: "student",
  });
  admin = await User.create({
    name: `adminfix ${stamp}`,
    email: adminEmail,
    password_hash: await bcrypt.hash(adminPassword, 10),
    role: "admin",
  });

  const studentLogin = await api.post("/api/auth/login", {
    email: `studentfix-${stamp}@campuscoin.test`,
    password: studentPassword,
  });
  check("the student signs in", studentLogin.status === 200, `got ${studentLogin.status}`);

  const worksBefore = await api.get("/api/transactions");
  check("the student can read their ledger while active", worksBefore.status === 200, `got ${worksBefore.status}`);

  await User.updateOne({ _id: student._id }, { $set: { is_active: false } });
  const blocked = await api.get("/api/transactions");
  check("a disabled student is refused with 401", blocked.status === 401, `got ${blocked.status}`);
  const blockedBody = await json(blocked);
  check(
    "the message says the account is not active",
    /active/i.test(blockedBody?.error?.message ?? "") && !/password/i.test(blockedBody?.error?.message ?? ""),
    JSON.stringify(blockedBody),
  );

  const blockedLogin = await api.post("/api/auth/login", {
    email: `studentfix-${stamp}@campuscoin.test`,
    password: studentPassword,
  });
  check(
    "a disabled student cannot sign in again",
    blockedLogin.status === 403 || blockedLogin.status === 401,
    `got ${blockedLogin.status}`,
  );

  await User.updateOne({ _id: student._id }, { $set: { is_active: true } });
  const worksAfter = await api.get("/api/transactions");
  check("re-enabling at the database restores access", worksAfter.status === 200, `got ${worksAfter.status}`);

  process.stdout.write("\n2. the enable and disable routes both exist and are symmetric\n");

  const adminApi = client(app);
  const adminLogin = await adminApi.post("/api/admin/auth/login", {
    password: adminPassword,
  });
  check(
    "the admin signs in at the admin endpoint",
    adminLogin.status === 200,
    `got ${adminLogin.status} ${JSON.stringify(await json(adminLogin))}`,
  );

  const listUsers = await adminApi.get("/api/admin/users");
  const usersBody = await json(listUsers);
  check("the admin can list users", listUsers.status === 200 && Array.isArray(usersBody?.users), `got ${listUsers.status}`);

  const disabled = await adminApi.put(`/api/admin/users/${student._id}/disable`);
  const disabledBody = await json(disabled);
  check("the disable route answers 200", disabled.status === 200, `got ${disabled.status} ${JSON.stringify(disabledBody)}`);
  check("it reports the account as disabled", disabledBody?.user?.is_active === false, JSON.stringify(disabledBody));
  const inDb = await User.findById(student._id).select("is_active").lean();
  check("the database really says disabled", inDb.is_active === false, JSON.stringify(inDb));

  const enabled = await adminApi.put(`/api/admin/users/${student._id}/enable`);
  const enabledBody = await json(enabled);
  check("the enable route answers 200", enabled.status === 200, `got ${enabled.status} ${JSON.stringify(enabledBody)}`);
  check("it reports the account as enabled", enabledBody?.user?.is_active === true, JSON.stringify(enabledBody));
  const inDb2 = await User.findById(student._id).select("is_active").lean();
  check("the database really says enabled", inDb2.is_active === true, JSON.stringify(inDb2));

  process.stdout.write("\n3. the routes set a state rather than flipping it\n");

  await adminApi.put(`/api/admin/users/${student._id}/disable`);
  await adminApi.put(`/api/admin/users/${student._id}/disable`);
  const afterTwoDisables = await User.findById(student._id).select("is_active").lean();
  check("disabling twice leaves the account disabled", afterTwoDisables.is_active === false, JSON.stringify(afterTwoDisables));

  await adminApi.put(`/api/admin/users/${student._id}/enable`);
  await adminApi.put(`/api/admin/users/${student._id}/enable`);
  const afterTwoEnables = await User.findById(student._id).select("is_active").lean();
  check("enabling twice leaves the account enabled", afterTwoEnables.is_active === true, JSON.stringify(afterTwoEnables));

  process.stdout.write("\n4. the routes sign a disabled student out of their session\n");

  await adminApi.put(`/api/admin/users/${student._id}/disable`);
  const afterAdminDisable = await api.get("/api/transactions");
  check("the student's live session stops working at once", afterAdminDisable.status === 401, `got ${afterAdminDisable.status}`);

  await adminApi.put(`/api/admin/users/${student._id}/enable`);
  const afterAdminEnable = await api.get("/api/transactions");
  check("re-enabling makes them sign in again", afterAdminEnable.status === 401, `got ${afterAdminEnable.status}`);

  const relogin = await api.post("/api/auth/login", {
    email: `studentfix-${stamp}@campuscoin.test`,
    password: studentPassword,
  });
  check("and the student can sign in once more", relogin.status === 200, `got ${relogin.status}`);

  process.stdout.write("\n5. an admin account is out of reach\n");

  const disableSelf = await adminApi.put(`/api/admin/users/${admin._id}/disable`);
  check("an admin cannot be disabled", disableSelf.status === 400, `got ${disableSelf.status}`);
  const selfStill = await User.findById(admin._id).select("is_active").lean();
  check("the admin account is untouched", selfStill.is_active === true, JSON.stringify(selfStill));

  process.stdout.write("\n6. a student cannot reach the admin routes\n");

  const studentApi = client(app);
  const studentLogin2 = await studentApi.post("/api/auth/login", {
    email: `studentfix-${stamp}@campuscoin.test`,
    password: studentPassword,
  });
  check("the student signs in on their own session", studentLogin2.status === 200, `got ${studentLogin2.status}`);

  const asStudent = await studentApi.post("/api/admin/auth/login", {
    password: studentPassword,
  });
  check(
    "a student cannot use the admin login",
    asStudent.status === 401 || asStudent.status === 403,
    `got ${asStudent.status}`,
  );

  const wrongPassword = await studentApi.put(`/api/admin/users/${student._id}/disable`);
  check(
    "the admin routes are not open to a student",
    wrongPassword.status === 401 || wrongPassword.status === 403,
    `got ${wrongPassword.status}`,
  );

  const stillActive = await User.findById(student._id).select("is_active").lean();
  check(
    "the student account was not disabled by their own attempt",
    stillActive.is_active === true,
    JSON.stringify(stillActive),
  );

  await studentApi.close();
  await adminApi.close();

  process.stdout.write("\n7. the tips routes answer end to end\n");

  const MONTH = "2026-09";
  const food = await Category.findOneAndUpdate(
    { user_id: null, name: "Food", type: "expense" },
    { $set: { is_default: true } },
    { upsert: true, returnDocument: "after" },
  );
  await Category.findOneAndUpdate(
    { user_id: null, name: "Transport", type: "expense" },
    { $set: { is_default: true } },
    { upsert: true },
  );

  const { TipTemplate } = await import("../src/models/index.js");
  await TipTemplate.findOneAndUpdate(
    { key: "top_category_share" },
    {
      $set: {
        text: "{category} is your biggest expense at {percentage}% of spending. A weekly cap of {weekly} keeps it in check.",
        rule: "category_share_above",
        threshold: 30,
        savings_impact: 90,
        is_active: true,
      },
    },
    { upsert: true },
  );
  await Transaction.deleteMany({ user_id: student._id });
  await Transaction.create([
    { user_id: student._id, category_id: food._id, type: "expense", amount: 24000, description: "Canteen", date: `${MONTH}-06` },
    { user_id: student._id, category_id: food._id, type: "expense", amount: 6000, description: "Groceries", date: `${MONTH}-07` },
  ]);

  const noSession = client(app);
  const tipsAnon = await noSession.get(`/api/tips?month=${MONTH}`);
  check("tips need a session", tipsAnon.status === 401, `got ${tipsAnon.status}`);
  const dismissedAnon = await noSession.get(`/api/tips/dismissed?month=${MONTH}`);
  check("the dismissed list needs a session too", dismissedAnon.status === 401, `got ${dismissedAnon.status}`);
  await noSession.close();

  const loggedIn = await api.get("/api/auth/me");
  check("the student session is valid", loggedIn.status === 200, `got ${loggedIn.status}`);

  const tipsRes = await api.get(`/api/tips?month=${MONTH}`);
  const tipsBody = await json(tipsRes);
  check("the tips route answers 200", tipsRes.status === 200, `got ${tipsRes.status}`);
  check("it returns an array under tips", Array.isArray(tipsBody?.tips), JSON.stringify(tipsBody));

  const dismissedRes = await api.get(`/api/tips/dismissed?month=${MONTH}`);
  const dismissedBody = await json(dismissedRes);
  check("the dismissed route answers 200", dismissedRes.status === 200, `got ${dismissedRes.status}`);
  check("it returns an array too", Array.isArray(dismissedBody?.tips), JSON.stringify(dismissedBody));

  const live = tipsBody.tips[0];
  if (live) {
    const pinned = await json(await api.post(`/api/tips/${live.tip_id}/pin`));
    check("pinning answers 200", pinned?.tip?.is_pinned === true, JSON.stringify(pinned));
    const afterPin = await json(await api.get(`/api/tips?month=${MONTH}`));
    check("the pinned tip comes first", afterPin.tips[0]?.tip_id === live.tip_id, JSON.stringify(afterPin.tips.map((t) => [t.template_key, t.is_pinned])));
    const unpinned = await json(await api.post(`/api/tips/${live.tip_id}/unpin`));
    check("unpinning answers 200", unpinned?.tip?.is_pinned === false, JSON.stringify(unpinned));

    await api.post(`/api/tips/${live.tip_id}/dismiss`);
    const afterDismiss = await json(await api.get(`/api/tips?month=${MONTH}`));
    check("a dismissed tip leaves the live list", !afterDismiss.tips.some((t) => t.tip_id === live.tip_id), JSON.stringify(afterDismiss.tips.map((t) => t.template_key)));
    const hiddenNow = await json(await api.get(`/api/tips/dismissed?month=${MONTH}`));
    check("it appears in the dismissed list", hiddenNow.tips.some((t) => t.tip_id === live.tip_id), JSON.stringify(hiddenNow.tips.map((t) => t.template_key)));

    await api.post(`/api/tips/${live.tip_id}/restore`);
    const afterRestore = await json(await api.get(`/api/tips?month=${MONTH}`));
    check("restoring puts it back in the live list", afterRestore.tips.some((t) => t.tip_id === live.tip_id), JSON.stringify(afterRestore.tips.map((t) => t.template_key)));
  } else {
    check("a tip was generated to act on", false, "the engine produced nothing for this month");
  }

  process.stdout.write("\n9. the tips routes validate their input\n");

  const noMonth = await api.get("/api/tips");
  check("a missing month is a 400", noMonth.status === 400, `got ${noMonth.status}`);
  const badMonth = await api.get("/api/tips?month=nonsense");
  check("a malformed month is a 400", badMonth.status === 400, `got ${badMonth.status}`);
  const noId = await api.post("/api/tips/not-an-id/pin");
  check("a bad tip id is a 404 or 400", noId.status === 404 || noId.status === 400, `got ${noId.status}`);
  const missing = await api.post("/api/tips/507f1f77bcf86cd799439011/pin");
  check("a tip that does not exist is a 404", missing.status === 404, `got ${missing.status}`);

  process.stdout.write("\n10. the categorise routes answer end to end\n");

  const suggest = await api.get("/api/ai/categorise/suggest?q=Campus%20Cafe");
  const suggestBody = await json(suggest);
  check("suggesting a category answers 200", suggest.status === 200, `got ${suggest.status}`);
  check("it names a category", Boolean(suggestBody?.suggestion?.category_name), JSON.stringify(suggestBody));
  check("it says where the answer came from", ["keyword", "learned", "ai", "default"].includes(suggestBody?.suggestion?.source), JSON.stringify(suggestBody?.suggestion?.source));

  const noQuery = await api.get("/api/ai/categorise/suggest");
  check("a missing query is a 400", noQuery.status === 400, `got ${noQuery.status}`);

  const confirm = await api.post("/api/ai/categorise/confirm", {
    description: "Campus Cafe",
    category_id: food._id,
  });
  check("confirming a correction answers 201", confirm.status === 201, `got ${confirm.status}`);

  const afterConfirm = await json(await api.get("/api/ai/categorise/suggest?q=Campus%20Cafe"));
  check("the correction is learned", afterConfirm?.suggestion?.source === "learned", JSON.stringify(afterConfirm?.suggestion));

  const batch = await api.post("/api/ai/categorise/batch", {
    rows: [
      { row: 2, description: "Bus fare" },
      { row: 3, description: "Campus Cafe" },
    ],
  });
  const batchBody = await json(batch);
  check("a batch answers 200", batch.status === 200, `got ${batch.status}`);
  check("one suggestion per row", batchBody?.suggestions?.length === 2, JSON.stringify(batchBody?.suggestions?.length));
  const emptyBatch = await api.post("/api/ai/categorise/batch", { rows: [] });
  check("an empty batch is a 400", emptyBatch.status === 400, `got ${emptyBatch.status}`);

  process.stdout.write("\n11. the insight routes answer end to end\n");

  const insightsList = await api.get("/api/insights");
  check("listing insights answers 200", insightsList.status === 200, `got ${insightsList.status}`);
  const monthInsight = await api.get(`/api/insights/month?month=${MONTH}`);
  const insightBody = await json(monthInsight);
  check("asking for a month generates one", monthInsight.status === 200 && Boolean(insightBody?.insight?.summary_text), `got ${monthInsight.status} ${JSON.stringify(insightBody)}`);
  const again = await api.get(`/api/insights/month?month=${MONTH}`);
  check("asking again returns the same row", (await json(again))?.insight?.insight_id === insightBody?.insight?.insight_id);
  const regenerated = await api.post(`/api/insights/month?month=${MONTH}`);
  check("regenerating answers 200", regenerated.status === 200, `got ${regenerated.status}`);
  const noMonthInsight = await api.get("/api/insights/month");
  check("a missing month is a 400", noMonthInsight.status === 400, `got ${noMonthInsight.status}`);
} finally {
  await api.close();
  const { TipTemplate } = await import("../src/models/index.js");
  await TipTemplate.deleteOne({ key: "top_category_share" });
  if (student) {
    const { Tip, CategorySuggestion, Insight } = await import("../src/models/index.js");
    await Tip.deleteMany({ user_id: student._id });
    await Insight.deleteMany({ user_id: student._id });
    await CategorySuggestion.deleteMany({ user_id: student._id });
    await Transaction.deleteMany({ user_id: student._id });
    await TransactionHistory.deleteMany({ user_id: student._id });
    await User.deleteOne({ _id: student._id });
  }
  if (admin) await User.deleteOne({ _id: admin._id });
  await disconnectDb();
}

process.stdout.write(`\nadmin + tips end to end: ${passed} passed, ${failed} failed\n`);
if (failed) {
  process.stdout.write(`failing: ${failures.join(", ")}\n`);
  process.exitCode = 1;
}
