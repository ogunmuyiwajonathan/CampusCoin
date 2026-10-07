import "dotenv/config";
import bcrypt from "bcryptjs";
import { resetTestDb, useTestDatabaseEnv } from "./helpers/testDb.js";

useTestDatabaseEnv();
process.env.CORS_ORIGIN = "http://localhost:5173";
process.env.ADMIN_SEED_PASSWORD = "SearchPass123";

const { connectDb, disconnectDb } = await import("../src/config/db.js");
const { User, Category, Transaction, Budget, Bookmark, Notification } =
  await import("../src/models/index.js");
const app = (await import("../src/app.js")).default;

const results = [];
function check(label, passed, detail = "") {
  results.push(passed);
  console.log(`${passed ? "  PASS" : "  FAIL"}  ${label}${detail ? ` - ` : ""}`);
}

await connectDb();
await resetTestDb();

const stamp = Date.now();
const password = await bcrypt.hash("SearchPass123", 10);

const studentA = await User.create({
  name: "Alpha Tester",
  email: `srch.alpha.${stamp}@campuscoin.test`,
  password_hash: password,
  role: "student",
  is_active: true,
  profileOnboarded: true,
});
const studentB = await User.create({
  name: "Bravo Tester",
  email: `srch.bravo.${stamp}@campuscoin.test`,
  password_hash: password,
  role: "student",
  is_active: true,
  profileOnboarded: true,
});

const food = await Category.create({ name: "Food", type: "expense", is_default: true });
const transport = await Category.create({ name: "Transport", type: "expense", is_default: true });

const amountRow = {
  user_id: studentA._id,
  category_id: transport._id,
  type: "expense",
  amount: 2500.5,
  description: "Amount probe row",
  date: "2026-09-24",
};

await Transaction.create([
  { ...amountRow, _id: undefined, description: "Canteen food run" },
  {
    user_id: studentA._id,
    category_id: food._id,
    type: "expense",
    amount: 120,
    description: "Groceries",
    date: "2026-09-18",
  },
  {
    user_id: studentB._id,
    category_id: food._id,
    type: "expense",
    amount: 999,
    description: "Bravo only canteen snack",
    date: "2026-09-19",
  },
]);

await Budget.create({
  user_id: studentA._id,
  category_id: food._id,
  month: "2026-09",
  limit_amount: 40000,
});
await Bookmark.create({ user_id: studentA._id, month: "2026-09", note: "alpha food review" });
await Notification.create({
  user_id: studentA._id,
  title: "Food is close to its limit",
  body: "You have used 92% of this month's Food limit.",
  to: "/budgets",
  dedupe_key: `srch-${stamp}-a`,
});
await Notification.create({
  user_id: studentB._id,
  title: "Bravo notification",
  body: "Nothing about food here.",
  to: "/budgets",
  dedupe_key: `srch-${stamp}-b`,
});

const server = app.listen(0);
await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

function client() {
  let cookie = "";
  const call = async function (path) {
    const res = await fetch(`${base}${path}`, {
      headers: cookie ? { Cookie: cookie } : {},
      redirect: "manual",
    });
    for (const raw of res.headers.getSetCookie?.() ?? []) {
      const pair = raw.split(";")[0];
      if (pair.startsWith("campuscoin.sid=")) cookie = pair;
    }
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, data, headers: res.headers };
  };
  return {
    call,
    async signInAdmin(password) {
      const res = await fetch(`${base}/api/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
        body: JSON.stringify({ password }),
      });
      for (const raw of res.headers.getSetCookie?.() ?? []) {
        const pair = raw.split(";")[0];
        if (pair.startsWith("campuscoin.sid=")) cookie = pair;
      }
      return res.status;
    },
    async signIn(email) {
      const res = await fetch(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
        body: JSON.stringify({ email, password: "SearchPass123" }),
      });
      for (const raw of res.headers.getSetCookie?.() ?? []) {
        const pair = raw.split(";")[0];
        if (pair.startsWith("campuscoin.sid=")) cookie = pair;
      }
      return res.status;
    },
  };
}

const adminApi = client();
const alphaApi = client();
const bravoApi = client();
const anonApi = client();

await adminApi.signInAdmin("SearchPass123");
await alphaApi.signIn(studentA.email);
await bravoApi.signIn(studentB.email);

const q = (value) => `/api/search?q=${encodeURIComponent(value)}`;
const titles = (res) =>
  (res.data?.groups ?? []).flatMap((g) => g.items.map((item) => item.title)).join(" | ");
const groupNames = (res) => (res.data?.groups ?? []).map((g) => g.label).join(", ");

console.log("1. The student search is scoped to the signed-in account");

const alphaFood = await alphaApi.call(q("food"));
check(
  "student A searching \"food\" gets their own transactions and the Food category",
  alphaFood.status === 200 &&
    groupNames(alphaFood).includes("Transactions") &&
    groupNames(alphaFood).includes("Categories") &&
    titles(alphaFood).includes("Canteen food run") &&
    titles(alphaFood).includes("Food"),
  `${alphaFood.status} groups=[${groupNames(alphaFood)}]`,
);

const alphaOnBravoWord = await alphaApi.call(q("Bravo"));
check(
  "student A cannot find student B's transaction description",
  alphaOnBravoWord.status === 200 && (alphaOnBravoWord.data?.total ?? -1) === 0,
  `total ${alphaOnBravoWord.data?.total}`,
);

const alphaOnBravoEmail = await alphaApi.call(q(studentB.email));
check(
  "student A cannot find student B by email",
  (alphaOnBravoEmail.data?.total ?? -1) === 0,
  `total ${alphaOnBravoEmail.data?.total}`,
);

const alphaOnBravoBookmark = await alphaApi.call(q("alpha food review"));
const bravoOnAlphaBookmark = await bravoApi.call(q("alpha food review"));
check(
  "a bookmark note belongs to its owner only",
  (alphaOnBravoBookmark.data?.total ?? -1) > 0 && (bravoOnAlphaBookmark.data?.total ?? -1) === 0,
  `A total ${alphaOnBravoBookmark.data?.total}, B total ${bravoOnAlphaBookmark.data?.total}`,
);

const bravoOwn = await bravoApi.call(q("Bravo"));
check(
  "student B still sees their own row",
  bravoOwn.status === 200 && titles(bravoOwn).includes("Bravo only canteen snack"),
  titles(bravoOwn),
);

const anon = await anonApi.call(q("food"));
check("no session is 401", anon.status === 401, `got ${anon.status}`);

console.log("\n2. The admin search is behind requireAdmin and returns no financial data");

const adminFood = await adminApi.call("/api/admin/search?q=food");
check(
  "an admin searching \"food\" sees no transactions and no budgets",
  adminFood.status === 200 && !groupNames(adminFood).includes("Transactions") && !groupNames(adminFood).includes("Budgets"),
  `groups=[${groupNames(adminFood)}]`,
);

const adminBody = JSON.stringify(adminFood.data ?? {});
const leakedAmounts = ["2500", "120", "999", "40000", "40000.5"].filter((n) => adminBody.includes(n));
check(
  "no student amount appears anywhere in an admin response",
  leakedAmounts.length === 0,
  leakedAmounts.join(", "),
);
check("no password hash or session material leaks", !/password_hash|passwordhash/i.test(adminBody));
const studentEmailLeak = studentA.email.includes("@") && adminBody.includes(studentA.email);
check(
  "no student email appears unless it matched the query",
  studentEmailLeak === false || q("food").includes(studentA.email),
  studentEmailLeak ? "student email present in a non-matching search" : "",
);

const studentOnAdmin = await alphaApi.call("/api/admin/search?q=food");
check("a student on the admin endpoint is 403", studentOnAdmin.status === 403, `got ${studentOnAdmin.status}`);
check(
  "the 403 body uses the standard error shape",
  typeof studentOnAdmin.data?.error?.message === "string",
  studentOnAdmin.data?.error?.message,
);

const anonOnAdmin = await anonApi.call("/api/admin/search?q=food");
check("an anonymous caller on the admin endpoint is 401", anonOnAdmin.status === 401, `got ${anonOnAdmin.status}`);

const adminByEmail = await adminApi.call(
  `/api/admin/search?q=${encodeURIComponent(studentB.email.slice(0, 14))}`,
);
check(
  "an admin finds a student by part of their email",
  adminByEmail.status === 200 && titles(adminByEmail).includes(studentB.name),
  `status ${adminByEmail.status} titles=${titles(adminByEmail)}`,
);
check(
  "that admin user result still shows no money",
  !["Transactions", "Budgets"].some((label) => groupNames(adminByEmail).includes(label)),
  `groups=[${groupNames(adminByEmail)}]`,
);

console.log("\n3. Amount matching: \"2,500\" and \"2500\" both find 2,500.50");

for (const term of ["2,500", "2500"]) {
  const res = await alphaApi.call(q(term));
  const amounts = (res.data?.groups ?? [])
    .flatMap((g) => g.items)
    .map((item) => item.amount)
    .filter((value) => typeof value === "number");
  check(
    `q=${term} returns the 2,500.50 row`,
    amounts.includes(2500.5),
    `amounts=${JSON.stringify(amounts)}`,
  );
}

console.log("\n4. Hostile input answers 200 with sane results, never 500");

// Each of these is 2+ characters, so it clears the length floor and actually
// reaches the database. The rule that matters is that none of them is an
// invalid regex (which would throw and become a 500) and none of them silently
// becomes a wildcard (which would return everything).
const hostiles = [
  [".*", "the match-everything wildcard"],
  ['"a', "a leading double quote"],
  ["[a-z", "an unterminated character class"],
  ["a\\", "a trailing backslash"],
  ["a+", "a bare quantifier"],
  ["(?<x>", "a named group"],
  ["a^", "a caret"],
  ["a$", "a dollar"],
  ["{}*", "a brace wildcard"],
  ["a{1,", "an unterminated brace"],
  ["\\b", "a backspace escape"],
];

for (const [value, label] of hostiles) {
  const res = await alphaApi.call(q(value));
  const sane = res.status === 200 && Array.isArray(res.data?.groups);
  check(`q=${label} answers 200`, sane, `got ${res.status} ${JSON.stringify(res.data).slice(0, 90)}`);
}

// "(" and "\" on their own are one character, so the length floor answers 400
// before the pattern is ever built. Either way the requirement holds: never a
// 500. Asserted explicitly so the two rules cannot be confused later.
for (const [value, label] of [["(", "a lone bracket"], ["\\", "a lone backslash"], ['"', "a lone quote"]]) {
  const res = await alphaApi.call(q(value));
  check(
    `q=${label} is answered without a 500`,
    res.status !== 500 && [200, 400].includes(res.status),
    `got ${res.status}`,
  );
}

const wildcard = await alphaApi.call(q(".*"));
check(
  "q=.* does not leak another student's rows",
  !titles(wildcard).includes("Bravo only canteen snack"),
  titles(wildcard),
);

const adminWildcard = await adminApi.call(`/api/admin/search?q=${encodeURIComponent(".*")}`);
check(
  "admin q=.* returns at most 5 per group, not every row",
  (adminWildcard.data?.groups ?? []).every((g) => g.items.length <= 5),
  (adminWildcard.data?.groups ?? []).map((g) => `${g.label}:${g.items.length}`).join(" "),
);

console.log("\n5. The query bounds are enforced with zod");

const tooShort = await alphaApi.call(q("a"));
check("a 1 character query is 400", tooShort.status === 400, `got ${tooShort.status}`);
check(
  "the 400 body uses the standard error shape",
  typeof tooShort.data?.error?.message === "string" && tooShort.data.error.message.length > 0,
  tooShort.data?.error?.message,
);

const tooLong = await alphaApi.call(q("x".repeat(61)));
check("a 61 character query is 400", tooLong.status === 400, `got ${tooLong.status}`);

const trimmed = await alphaApi.call(`/api/search?q=${encodeURIComponent("   food   ")}`);
check(
  "surrounding whitespace is trimmed rather than rejected",
  trimmed.status === 200 && titles(trimmed).includes("Canteen food run"),
  `${trimmed.status} ${titles(trimmed)}`,
);

const missing = await alphaApi.call("/api/search");
check("a missing q is 400", missing.status === 400, `got ${missing.status}`);

const exactTwo = await alphaApi.call(q("fo"));
check("exactly 2 characters is accepted", exactTwo.status === 200, `got ${exactTwo.status}`);

console.log("\n6. Rate limiting answers 429 with a readable message");

// Two fresh accounts. The limiter keys on the session user id, so these two must
// hold separate budgets - checked before either is exhausted, while the numbers
// mean something, and again afterwards.
const makeAccount = async (label) => {
  const user = await User.create({
    name: `Probe ${label}`,
    email: `srch.${label}.${stamp}@campuscoin.test`,
    password_hash: password,
    role: "student",
    is_active: true,
    profileOnboarded: true,
  });
  const api = client();
  await api.signIn(user.email);
  return api;
};

const budgetApi = await makeAccount("budget");
const neighbourApi = await makeAccount("neighbour");

const fresh = await Promise.all([
  budgetApi.call(q("food")),
  neighbourApi.call(q("food")),
]);
check(
  "two fresh accounts are both served",
  fresh.every((r) => r.status === 200),
  fresh.map((r) => String(r.status)).join(" "),
);

// Fired concurrently on purpose. This database is remote, so a sequential loop
// would take longer than the 60s window and slide past it before the budget ran
// out - the limiter would then look broken when it is not.
const burst = await Promise.all(Array.from({ length: 70 }, () => budgetApi.call(q("food"))));
const statuses = burst.map((r) => r.status);
const allowed = statuses.filter((s) => s === 200).length;
const blocked = statuses.filter((s) => s === 429).length;

check("no 500 appeared under the burst", !statuses.includes(500), `statuses ${[...new Set(statuses)].join(",")}`);
// The exact split depends on how many of the 70 land inside the same 60s window
// on a remote database, so this asserts the budget rather than a fixed count:
// never more than 60 served, and the surplus refused rather than answered.
check(
  `the budget is 60 per minute (served ${allowed}, refused ${blocked})`,
  allowed > 0 && allowed <= 60 && blocked === 70 - allowed,
  `served ${allowed} refused ${blocked}`,
);

const blockedBody = burst.find((r) => r.status === 429)?.data;
check(
  "the 429 body uses the standard error shape and reads as English",
  typeof blockedBody?.error?.message === "string" &&
    blockedBody.error.message.length > 0 &&
    !blockedBody.message,
  blockedBody?.error?.message,
);
check(
  "the 429 message does not mention internal detail",
  !/stack|at |mongo|node_modules/i.test(blockedBody?.error?.message ?? ""),
  blockedBody?.error?.message,
);

// This is the assertion that caught the real bug: while searchLimiter silently
// dropped its keyGenerator, both accounts shared one IP-sized bucket and the
// second one was refused here.
const neighbour = await neighbourApi.call(q("food"));
check(
  "the other account is still served after its neighbour exhausted the budget",
  neighbour.status === 200,
  `got ${neighbour.status} - ${JSON.stringify(neighbour.data?.error ?? "")}`,
);

const stillBlocked = await budgetApi.call(q("food"));
check("the exhausted account stays blocked", stillBlocked.status === 429, `got ${stillBlocked.status}`);
console.log("\n7. The response shape stays small and leak-free");

const shape = await alphaApi.call(q("food"));
const keys = new Set(
  (shape.data?.groups ?? []).flatMap((g) => g.items.flatMap((item) => Object.keys(item))),
);
check(
  "each result carries only the dropdown fields",
  [...keys].every((k) => ["key", "title", "subtitle", "meta", "amount", "link"].includes(k)),
  [...keys].join(","),
);
check(
  "no raw Mongo _id is sent to the browser",
  !JSON.stringify(shape.data ?? {}).includes(String(amountRow._id ?? " ")) &&
    !/"_id"/.test(JSON.stringify(shape.data ?? {})),
);
check(
  "every group has a see-all link with the query applied",
  (shape.data?.groups ?? []).every((g) => typeof g.seeAll === "string" && g.seeAll.includes("q=")),
  (shape.data?.groups ?? []).map((g) => g.seeAll).join(" "),
);

console.log(`\n${results.filter(Boolean).length} passed, ${results.filter((r) => !r).length} failed\n`);

await resetTestDb();
await new Promise((resolve) => server.close(resolve));
await disconnectDb();
process.exit(results.every(Boolean) ? 0 : 1);