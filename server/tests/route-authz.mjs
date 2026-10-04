import "dotenv/config";
import { useTestDatabaseEnv } from "./helpers/testDb.js";

useTestDatabaseEnv();
process.env.CORS_ORIGIN = "http://localhost:5173";

const stamp = Date.now();

const { connectDb, disconnectDb } = await import("../src/config/db.js");
const { User } = await import("../src/models/index.js");
const bcrypt = (await import("bcryptjs")).default;
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
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const request = { method, headers };
    if (method !== "GET" && body !== undefined) request.body = JSON.stringify(body);
    const res = await fetch(`${base}${url}`, request);
    capture(res);
    return res;
  };

  return {
    get: (url, options) => call("GET", url, undefined, options),
    post: (url, body, options) => call("POST", url, body, options),
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  };
};

const errorShape = (body) =>
  body &&
  typeof body === "object" &&
  typeof body.error?.message === "string" &&
  Object.keys(body.error).length === 1;

const ANON_ROUTES = [
  "/api/admin/users",
  "/api/admin/stats",
  "/api/admin/categories",
  "/api/admin/tips",
  "/api/admin/announcements",
  "/api/transactions",
  "/api/budgets",
  "/api/insights",
  "/api/reports",
  "/api/bookmarks",
  "/api/notifications",
  "/api/tips",
];

const STUDENT_FORBIDDEN = [
  "/api/admin/users",
  "/api/admin/stats",
  "/api/admin/categories",
  "/api/admin/tips",
  "/api/admin/announcements",
];

await connectDb();

let student = null;
let admin = null;
const anon = client(app);
const asStudent = client(app);
const asAdmin = client(app);

try {
  process.stdout.write("\n1. no session is refused with 401\n");

  for (const route of ANON_ROUTES) {
    const res = await anon.get(route);
    const body = await json(res);
    check(`anon ${route} -> 401`, res.status === 401, `got ${res.status}`);
    check(`anon ${route} keeps the JSON error shape`, errorShape(body), JSON.stringify(body));
    check(
      `anon ${route} does not leak a role message`,
      !/administrator/i.test(body?.error?.message ?? ""),
      JSON.stringify(body),
    );
  }

  process.stdout.write("\n2. a student session is refused with 403 on admin routes\n");

  student = await User.create({
    name: `authz student ${stamp}`,
    email: `authz-student-${stamp}@campuscoin.test`,
    password_hash: await bcrypt.hash("AuthzPass!23", 10),
    role: "student",
  });
  admin = await User.create({
    name: `authz admin ${stamp}`,
    email: `authz-admin-${stamp}@campuscoin.test`,
    password_hash: await bcrypt.hash("AuthzPass!23", 10),
    role: "admin",
  });

  const studentLogin = await asStudent.post("/api/auth/login", {
    email: `authz-student-${stamp}@campuscoin.test`,
    password: "AuthzPass!23",
  });
  check("the student signs in", studentLogin.status === 200, `got ${studentLogin.status}`);

  for (const route of STUDENT_FORBIDDEN) {
    const res = await asStudent.get(route);
    const body = await json(res);
    check(`student ${route} -> 403`, res.status === 403, `got ${res.status}`);
    check(`student ${route} keeps the JSON error shape`, errorShape(body), JSON.stringify(body));
  }

  const studentLedger = await asStudent.get("/api/transactions");
  check(
    "the same student session still reaches student data",
    studentLedger.status === 200,
    `got ${studentLedger.status}`,
  );

  process.stdout.write("\n3. an admin session reaches the same admin routes\n");

  const adminLogin = await asAdmin.post("/api/auth/login", {
    email: `authz-admin-${stamp}@campuscoin.test`,
    password: "AuthzPass!23",
  });
  check("the admin signs in", adminLogin.status === 200, `got ${adminLogin.status}`);

  for (const route of STUDENT_FORBIDDEN) {
    const res = await asAdmin.get(route);
    check(`admin ${route} -> 200`, res.status === 200, `got ${res.status}`);
  }

  process.stdout.write("\n4. logout drops the session on the very next request\n");

  const out = await asAdmin.post("/api/auth/logout");
  check("logout succeeds", out.status === 200, `got ${out.status}`);
  const afterOut = await asAdmin.get("/api/admin/users");
  check("the old admin cookie is refused with 401", afterOut.status === 401, `got ${afterOut.status}`);

  process.stdout.write("\n5. a disabled account is treated as signed out\n");

  await User.updateOne({ _id: student._id }, { $set: { is_active: false } });
  const disabledMe = await asStudent.get("/api/auth/me");
  check("me reports 401 for a disabled account", disabledMe.status === 401, `got ${disabledMe.status}`);
  const disabledAdmin = await asStudent.get("/api/admin/users");
  check("a disabled admin-role cookie is refused", disabledAdmin.status === 401, `got ${disabledAdmin.status}`);

  await User.updateOne({ _id: student._id }, { $set: { is_active: true } });
  const backMe = await asStudent.get("/api/auth/me");
  check("re-enabling restores the session", backMe.status === 200, `got ${backMe.status}`);
} finally {
  await Promise.all([anon.close(), asStudent.close(), asAdmin.close()]);
  if (student) await User.deleteOne({ _id: student._id });
  if (admin) await User.deleteOne({ _id: admin._id });
  await disconnectDb();
}

process.stdout.write(`\nroute authz: ${passed} passed, ${failed} failed\n`);
if (failed) {
  process.stdout.write(`failing: ${failures.join(", ")}\n`);
}
process.exit(failed === 0 ? 0 : 1);
