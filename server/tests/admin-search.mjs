import "dotenv/config";
import bcrypt from "bcryptjs";
import { resetTestDb, useTestDatabaseEnv } from "./helpers/testDb.js";

useTestDatabaseEnv();
process.env.CORS_ORIGIN = "http://localhost:5173";
process.env.ADMIN_SEED_PASSWORD = "AdminPass123";

const { connectDb, disconnectDb } = await import("../src/config/db.js");
const { User } = await import("../src/models/index.js");
const { escapeRegExp, normaliseSearch, MAX_SEARCH_LENGTH } = await import("../src/utils/regex.js");
const app = (await import("../src/app.js")).default;

const results = [];
function check(label, passed, detail = "") {
  results.push(passed);
  console.log(`${passed ? "  PASS" : "  FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

console.log("1. escapeRegExp neutralises every metacharacter");

check("a lone ( becomes \\(", escapeRegExp("(") === "\\(", escapeRegExp("("));
check(".* becomes \\..\\*", escapeRegExp(".*") === "\\.\\*", escapeRegExp(".*"));
check("[a-z] is escaped", escapeRegExp("[a-z]") === "\\[a-z\\]", escapeRegExp("[a-z]"));
check("a backslash is escaped", escapeRegExp("a\\b") === "a\\\\b", escapeRegExp("a\\b"));
check(
  "the escaped pattern still matches literally",
  new RegExp(escapeRegExp(".*")).test("a.*b") && !new RegExp(escapeRegExp(".*")).test("ab"),
);
check(
  "the escaped pattern is accepted by RegExp (no syntax error)",
  (() => {
    try {
      new RegExp(escapeRegExp("("));
      return true;
    } catch {
      return false;
    }
  })(),
);

console.log("\n2. the search input is trimmed and capped");

check("blank input becomes an empty string", normaliseSearch("   ") === "");
check("undefined becomes an empty string", normaliseSearch(undefined) === "");
check("surrounding space is trimmed", normaliseSearch("  pat  ") === "pat");
check(
  `input longer than ${MAX_SEARCH_LENGTH} is capped`,
  normaliseSearch("x".repeat(500)).length === MAX_SEARCH_LENGTH,
  `got ${normaliseSearch("x".repeat(500)).length}`,
);

console.log("\n3. the admin user search survives hostile input over HTTP");

await connectDb();
await resetTestDb();

const stamp = Date.now();
await User.create({
  name: "Pat Searchable",
  email: `pat.${stamp}@campuscoin.test`,
  password_hash: await bcrypt.hash("StudentPass123", 10),
  role: "student",
  is_active: true,
  profileOnboarded: true,
});
await User.create({
  name: "Ordinary Student",
  email: `ordinary.${stamp}@campuscoin.test`,
  password_hash: await bcrypt.hash("StudentPass123", 10),
  role: "student",
  is_active: true,
  profileOnboarded: true,
});

const server = app.listen(0);
await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

function client() {
  let cookie = "";
  const call = async function (path, { method = "GET", body } = {}) {
    const request = {
      method,
      headers: cookie ? { Cookie: cookie } : {},
      redirect: "manual",
    };
    if (method !== "GET" && body !== undefined) {
      request.headers["Content-Type"] = "application/json";
      request.body = JSON.stringify(body);
    }
    const res = await fetch(`${base}${path}`, request);
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
    return { status: res.status, data };
  };
  return call;
}

// Three separate jars: the admin, a student, and one that never signs in.
const adminApi = client();
const studentApi = client();
const anonApi = client();

const signIn = await adminApi("/api/admin/auth/login", {
  method: "POST",
  body: { password: "AdminPass123" },
});
check("the admin signs in", signIn.status === 200, `got ${signIn.status} ${JSON.stringify(signIn.data)}`);

await studentApi("/api/auth/login", {
  method: "POST",
  body: { email: `pat.${stamp}@campuscoin.test`, password: "StudentPass123" },
});

const guarded = await anonApi("/api/admin/users?search=Pat");
check("the route needs a session (401)", guarded.status === 401, `got ${guarded.status}`);

const forbidden = await studentApi("/api/admin/users?search=Pat");
check("a student is refused (403)", forbidden.status === 403, `got ${forbidden.status}`);

const normal = await adminApi(`/api/admin/users?search=Pat`);
check(
  "an ordinary search still finds the user",
  normal.status === 200 && (normal.data?.total ?? 0) >= 1,
  `status ${normal.status} total ${normal.data?.total}`,
);

const hostiles = [
  ["(", "an unmatched bracket"],
  [".*", "the match-everything wildcard"],
  ["[a-z", "an unterminated character class"],
  ["a\\", "a trailing backslash"],
  ["+", "a bare quantifier"],
  ["(?<x>", "a named group"],
  ["x".repeat(500), "five hundred characters"],
];

for (const [value, label] of hostiles) {
  const res = await adminApi(`/api/admin/users?search=${encodeURIComponent(value)}`);
  check(
    `search=${label} answers 200 instead of 500`,
    res.status === 200,
    `got ${res.status} ${JSON.stringify(res.data)}`,
  );
}

const wildcard = await adminApi("/api/admin/users?search=.*");
check(
  "search=.* no longer returns every user",
  wildcard.status === 200 && (wildcard.data?.total ?? 999) < 3,
  `total ${wildcard.data?.total}`,
);

const nothing = await adminApi("/api/admin/users?search=no-such-user-anywhere-xyz");
check("a non-matching search returns an empty page", nothing.data?.total === 0, `total ${nothing.data?.total}`);

console.log(`\n${results.filter(Boolean).length} passed, ${results.filter((r) => !r).length} failed\n`);

await resetTestDb();
await new Promise((resolve) => server.close(resolve));
await disconnectDb();
process.exit(results.every(Boolean) ? 0 : 1);
