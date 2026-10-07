import "dotenv/config";
import { useTestDatabaseEnv } from "./helpers/testDb.js";

useTestDatabaseEnv();
process.env.CORS_ORIGIN = "http://localhost:5173";
process.env.ADMIN_SEED_PASSWORD = "PanelPass!23";

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

await connectDb();

let student = null;
const asAdmin = client(app);
const asStudent = client(app);

try {
  process.stdout.write("\n1. the env password is the only credential\n");

  const wrong = await asAdmin.post("/api/admin/auth/login", { password: "NotThePassword!23" });
  const wrongBody = await json(wrong);
  check("a wrong password is 401", wrong.status === 401, `got ${wrong.status}`);
  check("it keeps the JSON error shape", errorShape(wrongBody), JSON.stringify(wrongBody));

  const missing = await asAdmin.post("/api/admin/auth/login", {});
  check("a missing password is 400", missing.status === 400, `got ${missing.status}`);

  const right = await asAdmin.post("/api/admin/auth/login", { password: "PanelPass!23" });
  const rightBody = await json(right);
  check("the env password signs in with 200", right.status === 200, `got ${right.status}`);
  check("the session reports role admin", rightBody?.user?.role === "admin", JSON.stringify(rightBody?.user));

  process.stdout.write("\n2. no admin account exists anywhere\n");

  const adminDocs = await User.countDocuments({ role: "admin" });
  check("the database holds zero admin users", adminDocs === 0, `got ${adminDocs}`);

  const me = await asAdmin.get("/api/auth/me");
  const meBody = await json(me);
  check("me answers 200 for the password session", me.status === 200, `got ${me.status}`);
  check("me reports role admin", meBody?.user?.role === "admin", JSON.stringify(meBody?.user));

  const users = await asAdmin.get("/api/admin/users");
  check("the password session reaches admin routes", users.status === 200, `got ${users.status}`);

  process.stdout.write("\n3. student accounts are unaffected\n");

  student = await User.create({
    name: `panel student ${stamp}`,
    email: `panel-student-${stamp}@campuscoin.test`,
    password_hash: await bcrypt.hash("PanelStudent!23", 10),
    role: "student",
  });

  const studentLogin = await asStudent.post("/api/auth/login", {
    email: `panel-student-${stamp}@campuscoin.test`,
    password: "PanelStudent!23",
  });
  check("a student still signs in", studentLogin.status === 200, `got ${studentLogin.status}`);

  const studentOnAdminLogin = await asStudent.post("/api/admin/auth/login", {
    password: "PanelStudent!23",
  });
  check("a student password is not an admin password", studentOnAdminLogin.status === 401, `got ${studentOnAdminLogin.status}`);

  const studentOnAdminRoute = await asStudent.get("/api/admin/users");
  check("a student is still 403 on admin routes", studentOnAdminRoute.status === 403, `got ${studentOnAdminRoute.status}`);

  process.stdout.write("\n4. logout drops the password session\n");

  const out = await asAdmin.post("/api/auth/logout");
  check("logout succeeds", out.status === 200, `got ${out.status}`);
  const afterOut = await asAdmin.get("/api/admin/users");
  check("the old cookie is refused with 401", afterOut.status === 401, `got ${afterOut.status}`);
} finally {
  await Promise.all([asAdmin.close(), asStudent.close()]);
  if (student) await User.deleteOne({ _id: student._id });
  await disconnectDb();
}

process.stdout.write(`\nadmin password: ${passed} passed, ${failed} failed\n`);
if (failed) {
  process.stdout.write(`failing: ${failures.join(", ")}\n`);
}
process.exit(failed === 0 ? 0 : 1);
