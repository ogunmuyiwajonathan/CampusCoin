import "dotenv/config";
import { useTestDatabaseEnv } from "./helpers/testDb.js";

useTestDatabaseEnv();

const { connectDb, disconnectDb } = await import("../src/config/db.js");
const { User, Category, Transaction, TransactionHistory } = await import("../src/models/index.js");
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

const daysBetween = (from, to) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

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
    if (body !== undefined && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    const payload =
      body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body);
    const request = { method, headers };
    if (method !== "GET" && payload !== undefined) request.body = payload;
    const res = await fetch(`${base}${url}`, request);
    capture(res);
    return res;
  };

  return {
    get: (url, options) => call("GET", url, undefined, options),
    post: (url, body, options) => call("POST", url, body, options),
    patch: (url, body, options) => call("PATCH", url, body, options),
    delete: (url, options) => call("DELETE", url, undefined, options),
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  };
};

await connectDb();

const stamp = Date.now();
const email = `stage1http-${stamp}@campuscoin.test`;
let user = null;
let category = null;

const api = client(app);

try {
  process.stdout.write("\n1. the new routes are mounted and guarded\n");

  const noSession = await api.get("/api/transactions/history");
  check("history needs a session", noSession.status === 401, `got ${noSession.status}`);

  const noSessionRestore = await api.post("/api/transactions/history/507f1f77bcf86cd799439011/restore");
  check("restore needs a session", noSessionRestore.status === 401, `got ${noSessionRestore.status}`);

  const noSessionImport = await api.post("/api/transactions/import", new FormData());
  check("import needs a session", noSessionImport.status === 401, `got ${noSessionImport.status}`);

  const registered = await api.post("/api/auth/register", {
    name: `Stage1 Http ${stamp}`,
    email,
    password: "Stage1Pass!23",
  });
  const registerBody = await json(registered);
  check(
    "the test account registers",
    registered.status === 201 || registered.status === 200,
    `got ${registered.status} ${JSON.stringify(registerBody)}`,
  );

  user = await User.findOne({ email });
  check("the account exists in the database", Boolean(user), "no user row");

  category = await Category.create({
    name: `S1 Http Food ${stamp}`,
    type: "expense",
    is_default: false,
    user_id: user._id,
  });

  const me = await json(await api.get("/api/auth/me"));
  check("the session is genuinely signed in", me?.user?.email === email, JSON.stringify(me));

  process.stdout.write("\n2. CSV import over HTTP with a real multipart body\n");

  const form = new FormData();
  form.append(
    "file",
    new Blob(
      [
        `date,description,amount,category,type\n2026-07-05,Http Cafe,450,S1 Http Food ${stamp},expense\n2026-07-06,Bad row,abc,S1 Http Food ${stamp},expense\n2026-07-07,Http Bus,600,S1 Http Food ${stamp},expense\n`,
      ],
      { type: "text/csv" },
    ),
    "spending.csv",
  );
  const imported = await api.post("/api/transactions/import", form);
  const importBody = await json(imported);
  check("import answers 201", imported.status === 201, `got ${imported.status}`);
  check("the summary counts the rows", importBody?.summary?.total === 3, JSON.stringify(importBody?.summary));
  check("two rows imported", importBody?.summary?.accepted === 2, JSON.stringify(importBody?.summary));
  check("the bad row is rejected with a reason", importBody?.rows?.[1]?.status === "rejected" && Boolean(importBody?.rows?.[1]?.reason), JSON.stringify(importBody?.rows?.[1]));
  check("the good rows around it are accepted", importBody?.rows?.[0]?.status === "accepted" && importBody?.rows?.[2]?.status === "accepted", JSON.stringify(importBody?.rows?.map((r) => r.status)));
  check("a batch id comes back for undo", typeof importBody?.batch_id === "string", JSON.stringify(importBody?.batch_id));

  const listed = await json(await api.get("/api/transactions?month=2026-07"));
  const importedRows = (listed?.transactions ?? []).filter((row) => row.description.startsWith("Http"));
  check("the imported rows are in the ledger", importedRows.length === 2, `found ${importedRows.length}`);

  process.stdout.write("\n3. the whole import can be undone over HTTP\n");

  const undone = await json(await api.delete(`/api/transactions/import/${importBody.batch_id}`));
  check("undo answers 200", undone?.ok === true, JSON.stringify(undone));
  check("undo reports what it removed", undone?.removed === 2, JSON.stringify(undone));
  const afterUndo = await json(await api.get("/api/transactions?month=2026-07"));
  check("the rows are gone from the ledger", (afterUndo?.transactions ?? []).filter((row) => row.description.startsWith("Http")).length === 0);

  process.stdout.write("\n4. delete then restore over HTTP\n");

  const create = await api.post("/api/transactions", {
    category_id: category._id,
    amount: 950,
    description: "Http doomed row",
    date: "2026-07-09",
  });
  const created = await json(create);
  check("a transaction can be created", create.status === 201, `got ${create.status} ${JSON.stringify(created)}`);

  const removed = await api.delete(`/api/transactions/${created?.transaction?.transaction_id}`);
  check("delete answers 200", removed.status === 200, `got ${removed.status}`);
  const goneList = await json(await api.get("/api/transactions?month=2026-07"));
  check("it is no longer in the ledger", !(goneList?.transactions ?? []).some((row) => row.description === "Http doomed row"));

  const history = await json(await api.get("/api/transactions/history"));
  check("history lists it", (history?.history ?? []).some((row) => row.transaction?.description === "Http doomed row"), JSON.stringify(history?.history?.length));
  const entry = (history?.history ?? []).find((row) => row.transaction?.description === "Http doomed row");
  check("history includes the category name", Boolean(entry?.category?.name), JSON.stringify(entry?.category));

  const restoredRes = await api.post(`/api/transactions/history/${entry.history_id}/restore`);
  const restoredBody = await json(restoredRes);
  check("restore answers 201", restoredRes.status === 201, `got ${restoredRes.status}`);
  check("the restored row comes back whole", restoredBody?.transaction?.amount === 950, JSON.stringify(restoredBody?.transaction));
  const backList = await json(await api.get("/api/transactions?month=2026-07"));
  check("it is back in the ledger", (backList?.transactions ?? []).some((row) => row.description === "Http doomed row"));
  const historyAfter = await json(await api.get("/api/transactions/history"));
  check("it left the history list", !(historyAfter?.history ?? []).some((row) => row.history_id === entry.history_id));

  process.stdout.write("\n5. a recurring row generates through the real read endpoint\n");

  const recurring = await api.post("/api/transactions", {
    category_id: category._id,
    amount: 1200,
    description: "Http recurring",
    date: "2026-07-01",
    is_recurring: true,
    frequency: "weekly",
  });
  const recurringBody = await json(recurring);
  check("next_run_at was set by the server", recurringBody?.transaction?.next_run_at === "2026-07-08", JSON.stringify(recurringBody?.transaction?.next_run_at));

  await api.get("/api/transactions?month=2026-07");
  const july = await json(await api.get("/api/transactions?month=2026-07"));
  const generated = (july?.transactions ?? []).filter((row) => row.description === "Http recurring");
  check("every missed week was written", generated.length === 5, `found ${generated.length}: ${JSON.stringify(generated.map((r) => r.date))}`);
  check("one is dated 2026-07-08", generated.some((row) => row.date === "2026-07-08"), JSON.stringify(generated.map((r) => r.date)));
  const inOrder = [...generated].sort((a, b) => a.date.localeCompare(b.date));
  check("the weeks are 7 days apart", inOrder.every((row, index) => index === 0 || daysBetween(inOrder[index - 1].date, row.date) === 7), JSON.stringify(inOrder.map((r) => r.date)));

  process.stdout.write("\n6. bad uploads are refused with a message, not a crash\n");

  const noFile = await api.post("/api/transactions/import", new FormData());
  const noFileBody = await json(noFile);
  check("a request with no file is a 400", noFile.status === 400, `got ${noFile.status}`);
  check("it explains what is missing", typeof noFileBody?.error?.message === "string" && noFileBody.error.message.length > 0, JSON.stringify(noFileBody));

  const empty = new FormData();
  empty.append("file", new Blob([""], { type: "text/csv" }), "empty.csv");
  const emptyRes = await api.post("/api/transactions/import", empty);
  check("an empty file is a 400", emptyRes.status === 400, `got ${emptyRes.status}`);

  const noColumns = new FormData();
  noColumns.append("file", new Blob(["foo,bar\n1,2\n"], { type: "text/csv" }), "bad.csv");
  const noColumnsRes = await json(await api.post("/api/transactions/import", noColumns));
  check(
    "a file with no date or amount column is refused",
    noColumnsRes?.error?.message?.includes("date") && noColumnsRes?.error?.message?.includes("amount"),
    JSON.stringify(noColumnsRes?.error?.message),
  );

  const wrongType = new FormData();
  wrongType.append("file", new Blob(["date,amount\n2026-07-01,100\n"], { type: "image/png" }), "x.png");
  const wrongTypeRes = await json(await api.post("/api/transactions/import", wrongType));
  check("a non-CSV upload is refused", typeof wrongTypeRes?.error?.message === "string", JSON.stringify(wrongTypeRes));

  const { CSV_MAX_BYTES } = await import("../src/services/import.service.js");
  check("the import limit is 2 MB", CSV_MAX_BYTES === 2 * 1024 * 1024, `got ${CSV_MAX_BYTES}`);

  process.stdout.write("\n8. the request_id double-submit guard still works\n");

  const payload = {
    category_id: category._id,
    amount: 1750,
    description: "Http double click",
    date: "2026-07-11",
    request_id: "stage1-guard-check-0001",
  };
  const first = await api.post("/api/transactions", payload);
  const second = await api.post("/api/transactions", payload);
  const firstBody = await json(first);
  const secondBody = await json(second);
  check("both submissions succeed", first.status === 201 && second.status === 201, `${first.status} then ${second.status}`);
  check("they resolve to the same row", firstBody?.transaction?.transaction_id === secondBody?.transaction?.transaction_id, `${firstBody?.transaction?.transaction_id} vs ${secondBody?.transaction?.transaction_id}`);
  const doubleRows = await json(await api.get("/api/transactions?month=2026-07"));
  const doubleCount = (doubleRows?.transactions ?? []).filter((row) => row.description === "Http double click").length;
  check("only one row was written", doubleCount === 1, `found ${doubleCount}`);
  check(
    "the duplicate answer still carries a transaction_id",
    typeof secondBody?.transaction?.transaction_id === "string",
    JSON.stringify(secondBody?.transaction),
  );

  const withId = await api.post("/api/transactions", {
    category_id: category._id,
    amount: 400,
    description: "Http has an id",
    date: "2026-07-12",
    request_id: "stage1-guard-check-0002",
  });
  const withoutId = await api.post("/api/transactions", {
    category_id: category._id,
    amount: 500,
    description: "Http has no id",
    date: "2026-07-12",
  });
  check("a request with an id saves", withId.status === 201, `got ${withId.status}`);
  check("a request without one saves too", withoutId.status === 201, `got ${withoutId.status} ${JSON.stringify(await json(withoutId))}`);

  const anotherWithoutId = await api.post("/api/transactions", {
    category_id: category._id,
    amount: 600,
    description: "Http also has no id",
    date: "2026-07-12",
  });
  check("a second id-less request also saves", anotherWithoutId.status === 201, `got ${anotherWithoutId.status} ${JSON.stringify(await json(anotherWithoutId))}`);

  process.stdout.write("\n9. another student's history stays private\n");

  const other = await User.create({
    name: `Stage1 Http Other ${stamp}`,
    email: `stage1httpother-${stamp}@campuscoin.test`,
    password_hash: "x",
  });
  await TransactionHistory.create({
    user_id: other._id,
    transaction: { amount: 1, description: "not yours", type: "expense", date: "2026-07-01" },
    deleted_at: new Date(),
  });
  const stillMine = await json(await api.get("/api/transactions/history"));
  check("their history never appears in mine", !(stillMine?.history ?? []).some((row) => row.transaction?.description === "not yours"));
  const crossRestore = await api.post(`/api/transactions/history/507f1f77bcf86cd799439011/restore`);
  check("restoring a row I do not own is refused", crossRestore.status === 404, `got ${crossRestore.status}`);

  await TransactionHistory.deleteMany({ user_id: other._id });
  await User.deleteOne({ _id: other._id });
} finally {
  await api.close();
  if (user) {
    await Transaction.deleteMany({ user_id: user._id });
    await TransactionHistory.deleteMany({ user_id: user._id });
    await Category.deleteMany({ user_id: user._id });
    await User.deleteOne({ _id: user._id });
  }
  await disconnectDb();
}

process.stdout.write(`\nstage1 http routes: ${passed} passed, ${failed} failed\n`);
if (failed) {
  process.stdout.write(`failing: ${failures.join(", ")}\n`);
  process.exitCode = 1;
}
