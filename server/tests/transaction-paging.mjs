// Transaction list paging tests.
//
// In-process against the test database: node tests/transaction-paging.mjs
//
// Root cause being covered: `listTransactions` used to run `find()` with no
// limit, so "All months" (which sends no month at all) pulled an entire
// history in one response. These assertions pin the paging contract and make
// sure a month-scoped list still comes back whole.

import "dotenv/config";
import { useTestDatabaseEnv, closeTestDb } from "./helpers/testDb.js";

useTestDatabaseEnv();

const { default: app } = await import("../src/app.js");
const { connectDb } = await import("../src/config/db.js");
const { Transaction, User, Category } = await import("../src/models/index.js");

let passed = 0;
let failed = 0;

function check(label, ok, detail) {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${label}${detail ? ` -> ${detail}` : ""}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${detail ? ` -> ${detail}` : ""}`);
  }
}

const stamp = Date.now();

class Session {
  constructor() {
    this.cookies = new Map();
  }

  header() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  capture(res) {
    for (const line of res.headers.getSetCookie?.() ?? []) {
      const pair = line.split(";")[0];
      const idx = pair.indexOf("=");
      if (idx > 0) this.cookies.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
    }
  }

  async call(path, { method = "GET", body } = {}) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        cookie: this.header(),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    this.capture(res);
    const text = await res.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { raw: text };
    }
    return { status: res.status, body: payload };
  }
}

let base = "";

async function main() {
  await connectDb();

  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  console.log(`\ntransaction-paging tests against ${base}\n`);

  const s = new Session();
  const email = `paging-${stamp}@campuscoin.test`;
  const reg = await s.call("/api/auth/register", {
    method: "POST",
    body: { name: `Paging ${stamp}`, email, password: "PagingPass123" },
  });
  check("probe account registers", reg.status === 201, `got ${reg.status}`);

  const user = await User.findOne({ email }).lean();
  const [category] = await Category.create([
    { name: `Paging Food ${stamp}`, type: "expense", is_default: false, user_id: user._id },
  ]);

  // 120 rows spread over 4 months: more than the 100 cap, so a single response
  // physically cannot return all of them.
  const MONTHS = ["2026-03", "2026-04", "2026-05", "2026-06"];
  const docs = [];
  for (let i = 0; i < 120; i += 1) {
    const month = MONTHS[i % MONTHS.length];
    const day = String((i % 27) + 1).padStart(2, "0");
    docs.push({
      user_id: user._id,
      category_id: category._id,
      type: "expense",
      amount: 100 + (i % 7),
      description: `paging row ${i}`,
      date: `${month}-${day}`,
      request_id: `paging-${stamp}-${i}`,
    });
  }
  await Transaction.insertMany(docs);
  const total = await Transaction.countDocuments({ user_id: user._id });
  check("120 rows seeded", total === 120, `got ${total}`);

  console.log("\n1. All months without paging params is paged, not unbounded");
  const all = await s.call("/api/transactions");
  check("all-months returns 200", all.status === 200, `got ${all.status}`);
  check("response is marked paged", all.body?.paged === true, String(all.body?.paged));
  check("default page size is 50", all.body?.limit === 50, String(all.body?.limit));
  check("page is 1", all.body?.page === 1, String(all.body?.page));
  check("total reports every row", all.body?.total === 120, String(all.body?.total));
  check(
    "only one page of rows came back",
    (all.body?.transactions ?? []).length === 50,
    `rows=${all.body?.transactions?.length}`,
  );

  console.log("\n2. limit is honoured up to the 100 cap");
  const small = await s.call("/api/transactions?limit=10");
  check("limit=10 returns 10 rows", (small.body?.transactions ?? []).length === 10, `rows=${small.body?.transactions?.length}`);
  check("limit echoed as 10", small.body?.limit === 10, String(small.body?.limit));

  const capped = await s.call("/api/transactions?limit=100");
  check("the maximum limit is accepted", capped.status === 200, `got ${capped.status}`);
  check("limit echoed as 100", capped.body?.limit === 100, String(capped.body?.limit));
  check("it returns 100 rows", (capped.body?.transactions ?? []).length === 100, `rows=${capped.body?.transactions?.length}`);

  console.log("\n3. Walking the pages covers every row exactly once");
  const seen = new Set();
  let overlaps = 0;
  for (let page = 1; page <= 3; page += 1) {
    const res = await s.call(`/api/transactions?limit=50&page=${page}`);
    for (const t of res.body?.transactions ?? []) {
      if (seen.has(t.request_id)) overlaps += 1;
      seen.add(t.request_id);
    }
  }
  check("120 distinct rows across 3 pages", seen.size === 120, `seen=${seen.size}`);
  check("no row appeared on two pages", overlaps === 0, `overlaps=${overlaps}`);

  const last = await s.call("/api/transactions?limit=50&page=3");
  check("the last page is the short one", (last.body?.transactions ?? []).length === 20, `rows=${last.body?.transactions?.length}`);

  const beyond = await s.call("/api/transactions?limit=50&page=99");
  check("a page past the end is empty, not an error", beyond.status === 200 && (beyond.body?.transactions ?? []).length === 0, `rows=${beyond.body?.transactions?.length}`);

  console.log("\n4. Pages do not overlap or skip at the boundary");
  const p1 = await s.call("/api/transactions?limit=50&page=1");
  const p2 = await s.call("/api/transactions?limit=50&page=2");
  const ids1 = new Set((p1.body?.transactions ?? []).map((t) => t.request_id));
  const shared = (p2.body?.transactions ?? []).filter((t) => ids1.has(t.request_id));
  check("page 1 and page 2 share nothing", shared.length === 0, `shared=${shared.length}`);

  console.log("\n5. Sort is stable and newest first");
  const sorted = await s.call("/api/transactions?limit=100");
  const dates = (sorted.body?.transactions ?? []).map((t) => t.date);
  const isDescending = dates.every((d, i) => i === 0 || dates[i - 1] >= d);
  check("rows come back newest first", isDescending, dates.slice(0, 3).join(", "));

  console.log("\n6. A month-scoped list is NOT paged");
  const march = await s.call("/api/transactions?month=2026-03");
  check("month list is 200", march.status === 200, `got ${march.status}`);
  check("month list is not paged", march.body?.paged === false, String(march.body?.paged));
  check(
    "month list returns every row in that month",
    (march.body?.transactions ?? []).length === 30,
    `rows=${march.body?.transactions?.length}`,
  );
  check(
    "every month row really is in 2026-03",
    (march.body?.transactions ?? []).every((t) => t.date.startsWith("2026-03")),
  );

  const marchCapped = await s.call("/api/transactions?month=2026-03&limit=5");
  check(
    "a month ignores limit so no row is hidden",
    (marchCapped.body?.transactions ?? []).length === 30,
    `rows=${marchCapped.body?.transactions?.length}`,
  );

  console.log("\n7. Bad paging input is rejected, not silently coerced");
  const badLimit = await s.call("/api/transactions?limit=0");
  check("limit=0 is rejected", badLimit.status === 400, `got ${badLimit.status}`);
  const hugeLimit = await s.call("/api/transactions?limit=100000");
  check("limit above 100 is rejected", hugeLimit.status === 400, `got ${hugeLimit.status}`);
  const badPage = await s.call("/api/transactions?page=0");
  check("page=0 is rejected", badPage.status === 400, `got ${badPage.status}`);
  const badPageType = await s.call("/api/transactions?page=abc");
  check("page=abc is rejected", badPageType.status === 400, `got ${badPageType.status}`);

  console.log("\n8. Another account cannot see these rows at all");
  const other = new Session();
  const reg2 = await other.call("/api/auth/register", {
    method: "POST",
    body: { name: `Other ${stamp}`, email: `paging-other-${stamp}@campuscoin.test`, password: "PagingPass123" },
  });
  check("second account registers", reg2.status === 201, `got ${reg2.status}`);
  const theirs = await other.call("/api/transactions?limit=100");
  check("the other account sees none of them", (theirs.body?.total ?? 0) === 0, `total=${theirs.body?.total}`);

  console.log("\n############ CLEANUP ############");
  await Transaction.deleteMany({ user_id: user._id });
  await Category.deleteMany({ user_id: user._id });
  await User.deleteMany({ _id: user._id });
  const otherUser = await User.findOne({ email: `paging-other-${stamp}@campuscoin.test` });
  if (otherUser) await User.deleteMany({ _id: otherUser._id });
  const left = await Transaction.countDocuments({ user_id: user._id });
  check("test data removed", left === 0, `left=${left}`);

  await new Promise((resolve) => server.close(resolve));
  await closeTestDb();

  console.log(`\n=============== RESULT: ${passed} passed, ${failed} failed ===============\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  await closeTestDb();
  process.exit(1);
});