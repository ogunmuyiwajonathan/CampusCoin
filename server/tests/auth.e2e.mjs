import "dotenv/config";
import { resetTestDb, useTestDatabaseEnv } from "./helpers/testDb.js";

useTestDatabaseEnv();
process.env.CORS_ORIGIN = "http://localhost:5173";

const { connectDb, disconnectDb } = await import("../src/config/db.js");
const { User, ResetToken } = await import("../src/models/index.js");
const app = (await import("../src/app.js")).default;

const results = [];
function check(label, passed, detail = "") {
  results.push(passed);
  console.log(`${passed ? "  PASS" : "  FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

await connectDb();
await resetTestDb();

const server = app.listen(0);
await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

function client() {
  let cookie = "";
  const call = async function (path, { method = "GET", body, headers = {} } = {}) {
    const request = {
      method,
      headers: { ...(cookie ? { Cookie: cookie } : {}), ...headers },
      redirect: "manual",
    };
    if (method !== "GET" && body !== undefined) {
      request.headers["Content-Type"] = "application/json";
      request.body = JSON.stringify(body);
    }
    const res = await fetch(`${base}${path}`, request);
    const setCookie = res.headers.getSetCookie?.() ?? [];
    for (const raw of setCookie) {
      const pair = raw.split(";")[0];
      if (pair.startsWith("campuscoin.sid=")) cookie = pair;
    }
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, data, setCookie };
  };
  call.cookie = () => cookie;
  return call;
}

const anon = client();

console.log("\n1. registration");
let reg = await anon("/api/auth/register", {
  method: "POST",
  body: { name: "jamie tester", email: "Jamie@Test.COM", password: "GoodPass1" },
});
check("registers a new student", reg.status === 201, `status ${reg.status}`);
check("returns the user", reg.data?.user?.email === "jamie@test.com", JSON.stringify(reg.data?.user?.email));
check("capitalises the name server-side", reg.data?.user?.name === "Jamie Tester", reg.data?.user?.name);
check("never returns a password hash", reg.data?.user?.password_hash === undefined);
check("sets an httpOnly session cookie", reg.setCookie.some((c) => /HttpOnly/i.test(c)));
check("session cookie is SameSite=Lax", reg.setCookie.some((c) => /SameSite=Lax/i.test(c)));

console.log("\n2. duplicate registration is refused by name");
let dup = await anon("/api/auth/register", {
  method: "POST",
  body: { name: "Someone Else", email: "jamie@test.com", password: "GoodPass1" },
});
check("second registration is 409", dup.status === 409, `status ${dup.status}`);
check("the message names the problem", /already registered/i.test(dup.data?.error?.message ?? ""), reg.data?.error?.message);

console.log("\n3. validation names the offending field");
let weak = await anon("/api/auth/register", {
  method: "POST",
  body: { name: "A", email: "not-an-email", password: "short" },
});
check("weak input is 400", weak.status === 400, `status ${weak.status}`);
check("names the email field", "email" in (weak.data?.error?.details ?? {}), JSON.stringify(weak.data?.error?.details));
check("names the password field", "password" in (weak.data?.error?.details ?? {}));
check("names the name field", "name" in (weak.data?.error?.details ?? {}));

console.log("\n4. login never reveals whether an account exists");
const badPassword = await anon("/api/auth/login", {
  method: "POST",
  body: { email: "jamie@test.com", password: "WrongPass1" },
});
const noAccount = await anon("/api/auth/login", {
  method: "POST",
  body: { email: "ghost@nowhere.test", password: "WrongPass1" },
});
check("wrong password is 401", badPassword.status === 401, `status ${badPassword.status}`);
check("unknown email is 401", noAccount.status === 401, `status ${noAccount.status}`);
check(
  "both return an identical message",
  badPassword.data?.error?.message === noAccount.data?.error?.message,
  `${badPassword.data?.error?.message} vs ${noAccount.data?.error?.message}`,
);

console.log("\n5. a disabled account cannot log in");
const disabled = await User.create({
  name: "Disabled User",
  email: "disabled@test.com",
  password_hash: "$2a$10$abcdefghijklmnopqrstuv0123456789012345678901234567890",
  is_active: false,
});
const disabledLogin = await anon("/api/auth/login", {
  method: "POST",
  body: { email: "disabled@test.com", password: "GoodPass1" },
});
check("disabled account is refused", disabledLogin.status === 401, `status ${disabledLogin.status}`);
void disabled;

console.log("\n6. the session id rotates on every login");
const preLogin = client();
const firstLogin = await preLogin("/api/auth/login", {
  method: "POST",
  body: { email: "jamie@test.com", password: "GoodPass1" },
});
const firstCookie = preLogin.cookie();
check("login succeeds with the right password", firstLogin.status === 200, `status ${firstLogin.status}`);
check("a session cookie is issued", firstCookie.length > 0);

await preLogin("/api/auth/logout", { method: "POST" });
const secondLogin = await preLogin("/api/auth/login", {
  method: "POST",
  body: { email: "jamie@test.com", password: "GoodPass1" },
});
const secondCookie = preLogin.cookie();
check("a second login succeeds", secondLogin.status === 200, `status ${secondLogin.status}`);
check(
  "the session id is different after re-login",
  secondCookie.length > 0 && firstCookie !== secondCookie,
  `${firstCookie.slice(0, 24)}... vs ${secondCookie.slice(0, 24)}...`,
);

console.log("\n7. /me reflects the session");
const me = await preLogin("/api/auth/me");
check("me returns the signed-in user", me.data?.user?.email === "jamie@test.com", JSON.stringify(me.data?.user));
const meAnon = await client()("/api/auth/me");
check("me returns null when signed out", meAnon.status === 200 && meAnon.data?.user === null, JSON.stringify(meAnon.data));

console.log("\n8. a cookie alone is not enough to reach a protected route");
const jimmy = await User.findOne({ email: "jamie@test.com" });
await User.updateOne({ _id: jimmy._id }, { $set: { is_active: false } });
const afterDisable = await preLogin("/api/auth/me");
check("a disabled account loses access immediately", afterDisable.status === 401, `status ${afterDisable.status}`);
await User.updateOne({ _id: jimmy._id }, { $set: { is_active: true } });
const restored = await preLogin("/api/auth/me");
check("re-enabling restores access", restored.status === 200, `status ${restored.status}`);

console.log("\n9. logout clears the session");
const out = await preLogin("/api/auth/logout", { method: "POST" });
check("logout succeeds", out.status === 200, `status ${out.status}`);
const afterLogout = await preLogin("/api/auth/me");
check("no session after logout", afterLogout.data?.user === null, JSON.stringify(afterLogout.data));

console.log("\n10. password reset by email token");
const forgot = await anon("/api/auth/forgot-password", {
  method: "POST",
  body: { email: "jamie@test.com" },
});
check("forgot-password returns 200", forgot.status === 200, `status ${forgot.status}`);
const forgotGhost = await anon("/api/auth/forgot-password", {
  method: "POST",
  body: { email: "ghost@nowhere.test" },
});
check(
  "a known and an unknown email return the same body",
  JSON.stringify(forgot.data) === JSON.stringify(forgotGhost.data),
  `${JSON.stringify(forgot.data)} vs ${JSON.stringify(forgotGhost.data)}`,
);

const stored = await ResetToken.findOne({ user_id: jimmy._id }).sort({ createdAt: -1 });
check("a reset token row was created", Boolean(stored));
// auth.service.js stores `sha256(salt:code)` with a fresh 12-byte salt in front,
// so the value is 24 hex chars, a "$", then 64 hex chars. The old assertion
// expected a bare 64-character digest, which is not what the code produces.
check(
  "only a salted hash is stored, not the raw code",
  /^[0-9a-f]{24}\$[0-9a-f]{64}$/.test(stored.token_hash),
  `${stored.token_hash?.length ?? 0} chars`,
);
check(
  "the stored value is not the six-digit code",
  !/^\d{6}$/.test(stored.token_hash),
);

const badReset = await anon("/api/auth/reset-password", {
  method: "POST",
  body: { token: "f".repeat(64), password: "BrandNew1" },
});
check("a fabricated token is refused", badReset.status === 400, `status ${badReset.status}`);

await resetTestDb();
await disconnectDb();
server.close();

const failed = results.filter((passed) => !passed).length;
console.log(`\n${results.length - failed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
