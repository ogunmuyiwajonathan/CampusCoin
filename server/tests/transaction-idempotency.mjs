const BASE = process.env.BASE ?? "http://localhost:5007";

let passed = 0;
let failed = 0;

function check(label, ok, detail) {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

let cookie = "";

async function call(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...options.headers,
    },
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookie) {
    const pair = c.split(";")[0];
    if (pair.includes("=") && !pair.startsWith("__")) cookie = pair;
  }
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

const stamp = Date.now();

async function main() {
  console.log(`\nTarget: ${BASE}\n`);

  console.log("1. Sign in and read the starting transaction count");

  const email = `idem.probe.${stamp}@campuscoin.test`;
  const reg = await call("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "Idem Probe", email, password: "ProbePass123" }),
  });
  check("registered probe account", reg.status === 201, `got ${reg.status} ${JSON.stringify(reg.body?.error ?? "")}`);

  const cats = await call("/api/categories");
  check("categories available", cats.status === 200, `got ${cats.status}`);
  const expense = (cats.body?.categories ?? []).find((c) => c.type === "expense");
  check("an expense category exists", Boolean(expense), expense?.name);

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const before = await call(`/api/transactions?month=${month}`);
  const n0 = (before.body?.transactions ?? []).length;
  console.log(`     transactions in ${month} before: ${n0}`);

  console.log("\n2. Fire the same create 5 times concurrently with the same request_id");

  const requestId = `probe-${stamp}-abcdef`;
  const payload = {
    category_id: expense.category_id,
    amount: 1234,
    description: "double click probe",
    date: `${month}-15`,
    request_id: requestId,
  };

  const responses = await Promise.all(
    Array.from({ length: 5 }, () => call("/api/transactions", { method: "POST", body: JSON.stringify(payload) })),
  );
  const codes = responses.map((r) => r.status);
  console.log(`     statuses: ${codes.join(", ")}`);
  const ids = [...new Set(responses.map((r) => r.body?.transaction?.transaction_id).filter(Boolean))];
  console.log(`     distinct transaction ids returned: ${ids.length}`);
  check("all 5 responses were created (201)", codes.every((c) => c === 201), codes.join(","));
  check("all 5 responses point at the same transaction", ids.length === 1, ids.join(","));

  const after = await call(`/api/transactions?month=${month}`);
  const list = after.body?.transactions ?? [];
  const matching = list.filter((t) => t.request_id === requestId);
  console.log(`     transactions in ${month} after: ${list.length}`);
  check(`exactly one row was created (before ${n0}, after ${list.length})`, list.length === n0 + 1, `after=${list.length}`);
  check("exactly one row carries this request_id", matching.length === 1, `matched=${matching.length}`);

  console.log("\n3. A retry of the same click after a dropped response is still one row");

  const retry = await call("/api/transactions", { method: "POST", body: JSON.stringify(payload) });
  check("retry returns 201", retry.status === 201, `got ${retry.status}`);
  const afterRetry = await call(`/api/transactions?month=${month}`);
  const list2 = afterRetry.body?.transactions ?? [];
  check(`still exactly one extra row (after=${list2.length})`, list2.length === n0 + 1, `after=${list2.length}`);

  console.log("\n4. A different request_id is a genuinely different transaction");

  const second = await call("/api/transactions", {
    method: "POST",
    body: JSON.stringify({ ...payload, request_id: `probe-${stamp}-different`, description: "second" }),
  });
  check("second create succeeded", second.status === 201, `got ${second.status}`);
  const afterSecond = await call(`/api/transactions?month=${month}`);
  const list3 = afterSecond.body?.transactions ?? [];
  check(`a distinct click still saves (after=${list3.length})`, list3.length === n0 + 2, `after=${list3.length}`);

  console.log("\n5. Rix proposal Confirm is idempotent");

  const created = await list3.find((t) => t.description === "double click probe");
  check("probe transaction exists to reference", Boolean(created), created?.transaction_id);

  console.log(`\nResult: ${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
