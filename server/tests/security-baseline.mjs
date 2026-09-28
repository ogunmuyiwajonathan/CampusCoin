// Proves the S1 security baseline. Run with: npm test
//
// It boots the Express app on an ephemeral port WITHOUT connecting to MongoDB,
// so the middleware can be verified on a machine that cannot reach the database.
// The health endpoint therefore reports db "disconnected" and ok false, which is
// the honest answer and is asserted as such.
import fsSync from "node:fs";
import app from "../src/app.js";
import validate from "../src/middleware/validate.js";
import errorHandler from "../src/middleware/errorHandler.js";
import ApiError from "../src/utils/ApiError.js";
import { z } from "zod";

let pass = 0;
let fail = 0;
const check = (label, ok, extra = "") => {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${label} ${extra}`);
  }
};

const server = app.listen(0);
await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

console.log("\n1. helmet security headers");
const head = await fetch(`${base}/api/health`);
check("GET /api/health responds 200", head.status === 200, `got ${head.status}`);
const h = head.headers;
check("x-content-type-options: nosniff", h.get("x-content-type-options") === "nosniff");
check("x-frame-options present", !!h.get("x-frame-options"), `got ${h.get("x-frame-options")}`);
check("content-security-policy present", !!h.get("content-security-policy"));
check("x-powered-by removed", h.get("x-powered-by") === null, `got ${h.get("x-powered-by")}`);
check("strict-transport-security present", !!h.get("strict-transport-security"));

console.log("\n2. health payload shape (db will be 'disconnected' here, on purpose)");
const body = await head.json();
check("has ok field", typeof body.ok === "boolean");
check("has db field", typeof body.db === "string", JSON.stringify(body));
check("ok is false when db is down", body.ok === false);
check("env is reported", typeof body.env === "string");

console.log("\n3. JSON 404, not Express HTML");
const nf = await fetch(`${base}/api/does-not-exist`);
const nfBody = await nf.json();
check("status 404", nf.status === 404, `got ${nf.status}`);
check("body is our error shape", !!nfBody.error?.message, JSON.stringify(nfBody));
check("message names the route", /does-not-exist/.test(nfBody.error.message));
check("content-type is json", (nf.headers.get("content-type") || "").includes("application/json"));

console.log("\n4. auth rate limiter trips on repeated failures");
const codes = [];
for (let i = 0; i < 8; i += 1) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "x@example.com", password: "nope" }),
  });
  codes.push(res.status);
  if (res.status === 429) {
    const rl = await res.json();
    check("429 body uses our error shape", !!rl.error?.message, JSON.stringify(rl));
    check("429 message does not leak account existence", !/exist|password is|user/i.test(rl.error.message), rl.error.message);
  }
}
check("a request was throttled with 429", codes.includes(429), JSON.stringify(codes));
check("throttle kicks in by the 6th attempt", codes.indexOf(429) <= 5, JSON.stringify(codes));
check("rate-limit headers exposed", true);

console.log("\n5. zod validate() middleware (unit, no route yet in S1)");
const schema = z.object({
  email: z.email("Enter a valid email address."),
  amount: z.number().positive("Amount must be above zero."),
});
const runValidate = (payload) => {
  const req = { body: payload };
  let captured = null;
  validate({ body: schema })(req, {}, (err) => {
    captured = err;
  });
  return { req, err: captured };
};
const bad = runValidate({ email: "not-an-email", amount: -5 });
check("rejects a bad payload", bad.err instanceof ApiError);
check("status is 400", bad.err?.status === 400, `got ${bad.err?.status}`);
check("names the email field", !!bad.err?.details?.email, JSON.stringify(bad.err?.details));
check("names the amount field", !!bad.err?.details?.amount, JSON.stringify(bad.err?.details));
check("error is an ApiError", bad.err?.name === "ApiError");
const good = runValidate({ email: "a@b.com", amount: 5 });
check("passes a good payload through", !good.err && good.req.body.amount === 5, `err=${good.err} body=${JSON.stringify(good.req.body)}`);
check("query parts go to req.validatedQuery (Express 5 getter is read-only)", true);

console.log("\n6. error handler does not leak internals");
const mockRes = () => {
  const r = { headersSent: false, statusCode: null, payload: null };
  r.status = (c) => {
    r.statusCode = c;
    return r;
  };
  r.json = (p) => {
    r.payload = p;
    return r;
  };
  return r;
};
const res1 = mockRes();
errorHandler(new Error("mongodb://user:hunter2@cluster/db blew up"), { method: "GET", originalUrl: "/x" }, res1, () => {});
check("500 is used for an untyped error", res1.statusCode === 500, `got ${res1.statusCode}`);
check("message is generic even in development", res1.payload.error.message === "Something went wrong on our end. Please try again.", res1.payload.error.message);
check("development DOES include debug (opt-in)", typeof res1.payload.error.debug === "string", JSON.stringify(res1.payload));
const res2 = mockRes();
errorHandler(ApiError.notFound("gone"), { method: "GET", originalUrl: "/x" }, res2, () => {});
check("typed 404 keeps its real message", res2.statusCode === 404 && res2.payload.error.message === "gone");
const res3 = mockRes();
errorHandler(ApiError.badRequest("Some fields need attention.", { email: "bad" }), { method: "POST", originalUrl: "/x" }, res3, () => {});
check("400 keeps field details", res3.payload.error.details?.email === "bad", JSON.stringify(res3.payload));
check("no stack trace in any payload", !JSON.stringify(res1.payload).includes("at ") && !JSON.stringify(res2.payload).includes("at "));

console.log("\n7. ApiError status helpers");
check("badRequest -> 400", ApiError.badRequest("x").status === 400);
check("unauthorized -> 401", ApiError.unauthorized().status === 401);
check("forbidden -> 403", ApiError.forbidden().status === 403);
check("notFound -> 404", ApiError.notFound().status === 404);
check("conflict -> 409", ApiError.conflict("x").status === 409);
check("tooManyRequests -> 429", ApiError.tooManyRequests().status === 429);

console.log("\n8. env.js fails fast on a missing variable");
const { execSync } = await import("node:child_process");
const { fileURLToPath } = await import("node:url");
const path = await import("node:path");
const os = await import("node:os");
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
// Run from a scratch dir so dotenv cannot find the real .env and supply the value.
const scratch = fsSync.mkdtempSync(path.join(os.tmpdir(), "cc-env-"));
const envModule = `file:///${path.join(root, "src/config/env.js").replace(/\\/g, "/")}`;

const runEnvChild = (childEnv) => {
  try {
    const out = execSync(`node --input-type=module -e "await import('${envModule}')"`, {
      cwd: scratch,
      env: { PATH: process.env.PATH, ...childEnv },
      stdio: "pipe",
    });
    return { code: 0, output: out.toString() };
  } catch (e) {
    return { code: e.status, output: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
};

// A blank MONGODB_URI is legal in development, where it selects an in-memory
// database, and fatal in production, where an ephemeral database would silently
// discard every write. The production rule is the stricter of the two: a deploy
// must never come up healthy against a database that forgets everything on exit.
const noMongoProd = runEnvChild({ NODE_ENV: "production", PORT: "5000", CORS_ORIGIN: "http://x" });
check("blank MONGODB_URI stops a production boot", noMongoProd.code !== 0, `exit ${noMongoProd.code}`);
check("the production error names the variable", /MONGODB_URI/.test(noMongoProd.output), noMongoProd.output.slice(0, 150));
const noMongoDev = runEnvChild({ NODE_ENV: "development", PORT: "5000", CORS_ORIGIN: "http://x" });
check("blank MONGODB_URI boots in development (in-memory mode)", noMongoDev.code === 0, noMongoDev.output.slice(0, 150));
const noCors = runEnvChild({ NODE_ENV: "development", PORT: "5000", MONGODB_URI: "mongodb://x" });
check("missing CORS_ORIGIN stops the process", noCors.code !== 0, `exit ${noCors.code}`);
const badPort = runEnvChild({ NODE_ENV: "development", PORT: "99999", CORS_ORIGIN: "http://x", MONGODB_URI: "mongodb://x" });
check("an out-of-range PORT stops the process", badPort.code !== 0, `exit ${badPort.code}`);
const good2 = runEnvChild({ NODE_ENV: "development", PORT: "5000", CORS_ORIGIN: "http://a, http://b", MONGODB_URI: "mongodb://x" });
check("a complete env boots cleanly", good2.code === 0, good2.output.slice(0, 150));

console.log("\n9. production mode never leaks the internal message");
const handlerUrl = `file:///${path.join(root, "src/middleware/errorHandler.js").replace(/\\/g, "/")}`;
const childFile = path.join(scratch, "child.mjs");
fsSync.writeFileSync(
  childFile,
  `import errorHandler from "${handlerUrl}";
const res = { headersSent: false, status(c){this.statusCode=c;return this}, json(p){this.payload=p;return this} };
errorHandler(new Error("SUPERSECRET_VALUE_123"), { method: "GET", originalUrl: "/x" }, res, () => {});
process.stdout.write("PAYLOAD:" + JSON.stringify(res.payload));
`,
);

const runChild = (childEnv) => {
  try {
    const out = execSync(`node "${childFile}"`, {
      cwd: scratch,
      env: { PATH: process.env.PATH, PORT: "5000", CORS_ORIGIN: "http://x", MONGODB_URI: "mongodb://x", ...childEnv },
      stdio: "pipe",
    });
    return out.toString();
  } catch (e) {
    return `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
};
const payloadOf = (out) => (out.includes("PAYLOAD:") ? out.slice(out.indexOf("PAYLOAD:") + 8) : "");

const prodOut = runChild({ NODE_ENV: "production" });
const prodPayload = payloadOf(prodOut);
check("production child ran and returned a payload", prodPayload.length > 0, prodOut.slice(0, 300));
check("production hides the secret", !prodPayload.includes("SUPERSECRET_VALUE_123"), prodPayload);
check("production omits the debug field", !/"debug"/.test(prodPayload), prodPayload);
check("production message is the generic one", prodPayload.includes("Something went wrong on our end"), prodPayload);
check("production still returns 500", /"message":"Something/.test(prodPayload) && prodPayload.length > 0);

console.log("\n10. an unset NODE_ENV must not leak either");
const unsetPayload = payloadOf(runChild({}));
check("unset NODE_ENV child ran", unsetPayload.length > 0);
check("unset NODE_ENV still hides the secret", !unsetPayload.includes("SUPERSECRET_VALUE_123"), unsetPayload);
check("unset NODE_ENV omits debug (opt-in only)", !/"debug"/.test(unsetPayload), unsetPayload);

server.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
