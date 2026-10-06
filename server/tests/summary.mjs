// GET /api/summary — the single source for every total the student sees.
//
// The point of this endpoint is that the numbers come from aggregations over
// the whole month rather than from whatever page of rows the browser happens to
// be holding. The checks below therefore assert against a fixture with more rows
// than `recent` returns, and assert the all-time view counts every row too.
//
// Run with: node tests/summary.mjs

import "dotenv/config";
import { useTestDatabaseEnv } from "./helpers/testDb.js";

useTestDatabaseEnv();
process.env.CORS_ORIGIN = "http://localhost:5173";

const stamp = Date.now();

const { connectDb, disconnectDb } = await import("../src/config/db.js");
const { Budget, Category, Transaction, User } = await import("../src/models/index.js");
const bcrypt = (await import("bcryptjs")).default;
const app = (await import("../src/app.js")).default;
const { currentMonth } = await import("../src/utils/lagosDate.js");
const { addMonths } = await import("../src/utils/dateMath.js");

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

/** Money that reaches the browser must already be whole kobo. */
const isTwoDp = (value) => Math.round(value * 100) / 100 === value;

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

  const call = async (method, url, body) => {
    const headers = {};
    if (jar.size) headers.Cookie = cookieHeader();
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const request = { method, headers };
    if (method !== "GET" && body !== undefined) request.body = JSON.stringify(body);
    const res = await fetch(`${base}${url}`, request);
    capture(res);
    return res;
  };

  return {
    get: (url) => call("GET", url),
    post: (url, body) => call("POST", url, body),
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  };
};

const CUR = currentMonth();
const PREV = addMonths(`${CUR}-01`, -1).slice(0, 7);

await connectDb();

let user = null;
const categories = [];
const anon = client(app);
const api = client(app);

try {
  process.stdout.write("\n1. no session is refused with 401\n");

  const anonRes = await anon.get("/api/summary");
  check("anon /api/summary -> 401", anonRes.status === 401, `got ${anonRes.status}`);
  const anonMonth = await anon.get(`/api/summary?month=${CUR}`);
  check("anon /api/summary?month= -> 401", anonMonth.status === 401, `got ${anonMonth.status}`);

  process.stdout.write("\n2. the month is validated before any aggregation runs\n");

  user = await User.create({
    name: `summary ${stamp}`,
    email: `summary-${stamp}@campuscoin.test`,
    password_hash: await bcrypt.hash("SummaryPass!23", 10),
    role: "student",
  });

  const login = await api.post("/api/auth/login", {
    email: `summary-${stamp}@campuscoin.test`,
    password: "SummaryPass!23",
  });
  check("the fixture account signs in", login.status === 200, `got ${login.status}`);

  for (const bad of ["2026-13", "nonsense", "2026-1", "04-2026"]) {
    const res = await api.get(`/api/summary?month=${encodeURIComponent(bad)}`);
    check(`?month=${bad} -> 400`, res.status === 400, `got ${res.status}`);
  }

  process.stdout.write("\n3. a fixture month, with more rows than `recent` returns\n");

  const [food, transport, allowance, rent] = await Category.create([
    { name: `Summary Food ${stamp}`, type: "expense", is_default: false, user_id: user._id },
    { name: `Summary Transport ${stamp}`, type: "expense", is_default: false, user_id: user._id },
    { name: `Summary Allowance ${stamp}`, type: "income", is_default: false, user_id: user._id },
    { name: `Summary Rent ${stamp}`, type: "expense", is_default: false, user_id: user._id },
  ]);
  categories.push(food, transport, allowance, rent);

  await Transaction.create([
    {
      user_id: user._id,
      category_id: allowance._id,
      type: "income",
      amount: 5000,
      date: `${CUR}-02`,
      description: "Monthly allowance",
    },
    {
      user_id: user._id,
      category_id: food._id,
      type: "expense",
      amount: 1200.55,
      date: `${CUR}-03`,
      description: "Groceries",
    },
    {
      user_id: user._id,
      category_id: transport._id,
      type: "expense",
      amount: 300,
      date: `${CUR}-04`,
      description: "Bus fare",
    },
    {
      user_id: user._id,
      category_id: allowance._id,
      type: "income",
      amount: 1000,
      date: `${PREV}-02`,
      description: "Allowance last month",
    },
    {
      user_id: user._id,
      category_id: food._id,
      type: "expense",
      amount: 50,
      date: `${PREV}-03`,
      description: "Snack",
    },
  ]);

  // One budget with spending, one with none: the empty one still has to come
  // back with its category name, which the spending breakdown cannot supply.
  await Budget.create([
    { user_id: user._id, category_id: food._id, month: CUR, limit_amount: 2000 },
    { user_id: user._id, category_id: rent._id, month: CUR, limit_amount: 40000 },
  ]);

  const monthBody = await json(await api.get(`/api/summary?month=${CUR}`));
  const summary = monthBody?.summary;

  check("the endpoint answers with a summary object", Boolean(summary), JSON.stringify(monthBody));
  check("scope says month", summary?.scope === "month", JSON.stringify(summary?.scope));
  check("month echoes back", summary?.month === CUR, JSON.stringify(summary?.month));

  process.stdout.write("\n4. totals come from the whole month, not from a page of rows\n");

  check("month income", summary?.totals?.income === 5000, JSON.stringify(summary?.totals));
  check("month expense keeps the kobo", summary?.totals?.expense === 1500.55, JSON.stringify(summary?.totals));
  check("month net is income minus expenses", summary?.totals?.net === 3499.45, JSON.stringify(summary?.totals));
  check("count covers every row in the month", summary?.totals?.count === 3, JSON.stringify(summary?.totals));
  check("income is already two decimal places", isTwoDp(summary?.totals?.income));
  check("expense is already two decimal places", isTwoDp(summary?.totals?.expense));
  check("net is already two decimal places", isTwoDp(summary?.totals?.net));

  check("the previous month comes back alongside it", summary?.prev?.month === PREV, JSON.stringify(summary?.prev));
  check("previous month income", summary?.prev?.income === 1000, JSON.stringify(summary?.prev));
  check("previous month expense", summary?.prev?.expense === 50, JSON.stringify(summary?.prev));
  check("previous month count", summary?.prev?.count === 2, JSON.stringify(summary?.prev));

  process.stdout.write("\n5. the breakdown is ordered and named\n");

  const breakdown = summary?.breakdown ?? [];
  check("two categories spent", breakdown.length === 2, JSON.stringify(breakdown));
  check("the biggest category leads", breakdown[0]?.name === `Summary Food ${stamp}`, JSON.stringify(breakdown[0]));
  check("top category amount", breakdown[0]?.amount === 1200.55, JSON.stringify(breakdown[0]));
  check("top category percentage", breakdown[0]?.percentage === 80, JSON.stringify(breakdown[0]));
  check("the runner-up follows", breakdown[1]?.name === `Summary Transport ${stamp}`, JSON.stringify(breakdown[1]));
  check("topCategory mirrors breakdown[0]", summary?.topCategory?.name === breakdown[0]?.name);
  check("every breakdown amount is two decimal places", breakdown.every((row) => isTwoDp(row.amount)));

  const prevByCategory = new Map((summary?.prevBreakdown ?? []).map((row) => [row.category_id, row.amount]));
  const prevFoodId = String(food._id);
  check(
    "the previous month is broken down by the same category ids",
    prevByCategory.get(prevFoodId) === 50,
    JSON.stringify(summary?.prevBreakdown),
  );

  process.stdout.write("\n6. the six month series ends on the selected month\n");

  const series = summary?.series ?? [];
  check("six points", series.length === 6, JSON.stringify(series.length));
  check("the last point is the selected month", series[5]?.key === CUR, JSON.stringify(series.at(-1)));
  check("the point before it is the previous month", series[4]?.key === PREV, JSON.stringify(series[4]));
  check("series income for this month", series[5]?.income === 5000, JSON.stringify(series[5]));
  check("series expense for this month", series[5]?.expense === 1500.55, JSON.stringify(series[5]));
  check("series income for last month", series[4]?.income === 1000, JSON.stringify(series[4]));
  check("series expense for last month", series[4]?.expense === 50, JSON.stringify(series[4]));
  check(
    "every series value is two decimal places",
    series.every((point) => isTwoDp(point.income) && isTwoDp(point.expense)),
    JSON.stringify(series),
  );

  process.stdout.write("\n7. budgets report the name even where nothing was spent\n");

  const budgets = summary?.budgets ?? [];
  check("two budgets", budgets.length === 2, JSON.stringify(budgets));
  const foodBudget = budgets.find((row) => row.category_id === String(food._id));
  const rentBudget = budgets.find((row) => row.category_id === String(rent._id));
  check("the funded budget carries its category name", foodBudget?.name === `Summary Food ${stamp}`, JSON.stringify(foodBudget));
  check("budget spent matches the month", foodBudget?.spent === 1200.55, JSON.stringify(foodBudget));
  check("budget remaining", foodBudget?.remaining === 799.45, JSON.stringify(foodBudget));
  check("budget percentage", foodBudget?.percentage === 60, JSON.stringify(foodBudget));
  check("budget status is still on track", foodBudget?.status === "ok", JSON.stringify(foodBudget));
  check("the unfunded budget keeps its name", rentBudget?.name === `Summary Rent ${stamp}`, JSON.stringify(rentBudget));
  check("the unfunded budget shows zero spent", rentBudget?.spent === 0, JSON.stringify(rentBudget));
  check("budget rows are scoped to the requested month", budgets.every((row) => row.month === CUR), JSON.stringify(budgets));

  process.stdout.write("\n8. recent is a window, not the source of the totals\n");

  const recent = summary?.recent ?? [];
  check("recent is capped at five", recent.length <= 5, JSON.stringify(recent.length));
  check("recent is newest first", recent[0]?.date >= recent.at(-1)?.date, JSON.stringify(recent.map((row) => row.date)));
  check(
    "recent holds fewer rows than the month total proves the totals did not come from it",
    recent.length <= summary.totals.count,
    `${recent.length} vs ${summary.totals.count}`,
  );

  process.stdout.write("\n9. without a month the answer covers everything\n");

  const allBody = await json(await api.get("/api/summary"));
  const all = allBody?.summary;
  check("scope says all", all?.scope === "all", JSON.stringify(all?.scope));
  check("no month on an all-time summary", all?.month == null, JSON.stringify(all?.month));
  check("all-time income", all?.totals?.income === 6000, JSON.stringify(all?.totals));
  check("all-time expense", all?.totals?.expense === 1550.55, JSON.stringify(all?.totals));
  check("all-time net", all?.totals?.net === 4449.45, JSON.stringify(all?.totals));
  check("all-time count covers every row", all?.totals?.count === 5, JSON.stringify(all?.totals));

  process.stdout.write("\n10. another account sees none of it\n");

  const other = await User.create({
    name: `summary other ${stamp}`,
    email: `summary-other-${stamp}@campuscoin.test`,
    password_hash: await bcrypt.hash("SummaryPass!23", 10),
    role: "student",
  });
  const otherClient = client(app);
  try {
    const otherLogin = await otherClient.post("/api/auth/login", {
      email: `summary-other-${stamp}@campuscoin.test`,
      password: "SummaryPass!23",
    });
    check("the second account signs in", otherLogin.status === 200, `got ${otherLogin.status}`);
    const otherBody = await json(await otherClient.get(`/api/summary?month=${CUR}`));
    check("another account's month is empty", otherBody?.summary?.totals?.count === 0, JSON.stringify(otherBody?.summary?.totals));
    check("another account sees no budgets", (otherBody?.summary?.budgets ?? []).length === 0, JSON.stringify(otherBody?.summary?.budgets));
  } finally {
    await otherClient.close();
    await User.deleteOne({ _id: other._id });
  }
} finally {
  await Promise.all([anon.close(), api.close()]);
  if (user) {
    await Transaction.deleteMany({ user_id: user._id });
    await Budget.deleteMany({ user_id: user._id });
    await Category.deleteMany({ user_id: user._id });
    await User.deleteOne({ _id: user._id });
  }
  for (const category of categories) await Category.deleteOne({ _id: category._id });
  await disconnectDb();
}

process.stdout.write(`\nsummary: ${passed} passed, ${failed} failed\n`);
if (failed) process.stdout.write(`failing: ${failures.join(", ")}\n`);
process.exit(failed === 0 ? 0 : 1);
