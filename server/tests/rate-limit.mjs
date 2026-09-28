const BASE = process.env.BASE ?? "http://localhost:5001";

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

// Each section sends its own X-Forwarded-For so it gets a clean limiter bucket.
// That also proves app.set("trust proxy", 1) is in effect: without it every
// request would look like one client and share a single bucket.
let ipCounter = 0;
const nextIp = () => `203.0.113.${(ipCounter += 1)}`;

async function post(path, body, ip) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": ip },
    body: JSON.stringify(body ?? {}),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

async function get(path, ip) {
  const res = await fetch(`${BASE}${path}`, { headers: { "X-Forwarded-For": ip } });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

const stamp = Date.now();

async function main() {
  console.log(`\nTarget: ${BASE}\n`);

  console.log("1. POST /api/auth/login — 10 failed attempts per 5 min, failures only");

  const ip1 = nextIp();
  const statuses = [];
  for (let i = 1; i <= 11; i += 1) {
    const r = await post(
      "/api/auth/login",
      { email: "student@campuscoin.test", password: `wrong-password-${i}` },
      ip1,
    );
    statuses.push(r.status);
  }
  console.log(`     statuses: ${statuses.join(", ")}`);
  check(
    "attempts 1-10 are not rate limited",
    statuses.slice(0, 10).every((s) => s !== 429),
  );
  check("the 11th failed attempt is 429", statuses[10] === 429, `got ${statuses[10]}`);

  const blocked = await post(
    "/api/auth/login",
    { email: "student@campuscoin.test", password: "wrong-again" },
    ip1,
  );
  console.log(`     429 body: ${JSON.stringify(blocked.json)}`);
  check(
    "429 uses the standard API error shape",
    typeof blocked.json?.error?.message === "string" &&
      blocked.json.error.message.length > 0,
    blocked.json?.error?.message,
  );
  check("no top-level message field leaks", blocked.json?.message === undefined);

  console.log("\n2. A normal request still passes while login is blocked");

  const ip2 = nextIp();
  const health = await get("/api/health", ip2);
  check("GET /api/health is 200", health.status === 200, `got ${health.status}`);

  const categories = await get("/api/categories", ip2);
  check(
    "GET /api/categories is 401 (not 429), so the global cap is not tripped",
    categories.status === 401,
    `got ${categories.status}`,
  );

  console.log("\n3. Successful logins do not consume the failure budget");

  const ip3 = nextIp();
  const email = `rl.probe.${stamp}@campuscoin.test`;
  const reg = await post(
    "/api/auth/register",
    { name: "Probe", email, password: "ProbePass123" },
    ip3,
  );
  check("register a probe account", reg.status === 201, `got ${reg.status} ${JSON.stringify(reg.json?.error ?? "")}`);

  const goodStatuses = [];
  for (let i = 0; i < 14; i += 1) {
    const r = await post("/api/auth/login", { email, password: "ProbePass123" }, ip3);
    goodStatuses.push(r.status);
  }
  console.log(`     14 valid logins -> ${goodStatuses.join(", ")}`);
  check(
    "14 valid logins are all accepted, so successes never counted against the 10",
    goodStatuses.every((s) => s === 200),
  );

  const stillOpen = await post(
    "/api/auth/login",
    { email, password: "ProbePass123" },
    ip3,
  );
  check(
    "after 14 successes a valid login is still not rate limited",
    stillOpen.status === 200,
    `got ${stillOpen.status}`,
  );

  console.log("\n4. POST /api/auth/register — 20 per hour");

  const ip4 = nextIp();
  const registerStatuses = [];
  for (let i = 0; i < 21; i += 1) {
    const r = await post(
      "/api/auth/register",
      { name: "Bulk Probe", email: `bulk.${stamp}.${i}@campuscoin.test`, password: "ProbePass123" },
      ip4,
    );
    registerStatuses.push(r.status);
  }
  console.log(`     statuses: ${registerStatuses.join(", ")}`);
  check(
    "the first 20 registrations are not rate limited",
    registerStatuses.slice(0, 20).every((s) => s !== 429),
  );
  check("the 21st registration is 429", registerStatuses[20] === 429, `got ${registerStatuses[20]}`);

  console.log("\n5. POST /api/auth/forgot-password — 5 per 15 min");

  const ip5 = nextIp();
  const forgot = [];
  for (let i = 0; i < 6; i += 1) {
    const r = await post("/api/auth/forgot-password", { email: "student@campuscoin.test" }, ip5);
    forgot.push(r.status);
  }
  console.log(`     statuses: ${forgot.join(", ")}`);
  check("the first 5 password resets are not rate limited", forgot.slice(0, 5).every((s) => s !== 429));
  check("the 6th password reset is 429", forgot[5] === 429, `got ${forgot[5]}`);

  console.log("\n6. POST /api/admin/auth/login — 5 per 15 min");

  const ip6 = nextIp();
  const admin = [];
  for (let i = 0; i < 6; i += 1) {
    const r = await post(
      "/api/admin/auth/login",
      { email: "admin@campuscoin.test", password: `wrong-admin-${i}` },
      ip6,
    );
    admin.push(r.status);
  }
  console.log(`     statuses: ${admin.join(", ")}`);
  check("the first 5 admin attempts are not rate limited", admin.slice(0, 5).every((s) => s !== 429));
  check("the 6th admin attempt is 429", admin[5] === 429, `got ${admin[5]}`);

  console.log("\n7. Per-IP isolation (trust proxy is honoured)");

  const ipA = nextIp();
  const ipB = nextIp();
  for (let i = 0; i < 11; i += 1) {
    await post("/api/auth/login", { email: "student@campuscoin.test", password: "nope" }, ipA);
  }
  const aBlocked = await post("/api/auth/login", { email: "student@campuscoin.test", password: "nope" }, ipA);
  const bFresh = await post("/api/auth/login", { email: "student@campuscoin.test", password: "nope" }, ipB);
  check("the exhausted IP is blocked", aBlocked.status === 429, `got ${aBlocked.status}`);
  check("a different IP is unaffected", bFresh.status !== 429, `got ${bFresh.status}`);

  console.log(`\nResult: ${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
