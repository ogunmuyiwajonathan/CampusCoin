// Proposal flow server tests.
//
// Covers the guarantees the Rix proposal flow has to hold up:
//   1. no transaction exists until the student explicitly confirms
//   2. two confirms sent at the same time create exactly one transaction
//   3. confirming or cancelling someone else's proposal is a 404 and saves nothing
//   4. a draft can only be built from valid fields (amount, type, category, date)
//   5. a reply that points at Confirm without a proposal is cleaned
//   6. cancel/recreate/expiry keep exactly one live draft
//
// Runs in-process against the test database: node tests/proposal-flow.mjs

import "dotenv/config";
import { useTestDatabaseEnv, closeTestDb } from "./helpers/testDb.js";

useTestDatabaseEnv();

const { default: app } = await import("../src/app.js");
const { connectDb } = await import("../src/config/db.js");
const { ChatMessage, Conversation, Transaction, User, Category } = await import(
  "../src/models/index.js"
);
const { parseProposal } = await import("../src/validators/ai.schema.js");
const { cleanProposallessReply } = await import("../src/utils/cleanReply.js");
const { todayString, APP_TIME_ZONE } = await import("../src/utils/lagosDate.js");

let passed = 0;
let failed = 0;
const failures = [];

const check = (name, ok, detail = "") => {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

const stamp = Date.now();

/** Minimal cookie-carrying client for the in-process server. */
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

const proposalOver = (conversationId, fields) =>
  ChatMessage.create({
    conversation_id: conversationId,
    role: "assistant",
    content: "",
    kind: "proposal",
    proposal: { status: "pending", ...fields },
  });

const txCount = (userId) => Transaction.countDocuments({ user_id: userId });

let base = "";

async function main() {
  await connectDb();

  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  console.log(`proposal-flow tests against ${base} (${process.env.MONGODB_URI?.split("/").pop()})\n`);

  const alice = new Session();
  const mallory = new Session();

  const regA = await alice.call("/api/auth/register", {
    method: "POST",
    body: {
      name: `Proposal Flow ${stamp}`,
      email: `proposal-flow-${stamp}@campuscoin.test`,
      password: "ProposalPass123",
    },
  });
  check("student A registers", regA.status === 201, `got ${regA.status}`);

  const regM = await mallory.call("/api/auth/register", {
    method: "POST",
    body: {
      name: `Proposal Other ${stamp}`,
      email: `proposal-other-${stamp}@campuscoin.test`,
      password: "ProposalPass123",
    },
  });
  check("student B registers", regM.status === 201, `got ${regM.status}`);

  const userA = await User.findOne({ email: `proposal-flow-${stamp}@campuscoin.test` }).lean();
  const userB = await User.findOne({ email: `proposal-other-${stamp}@campuscoin.test` }).lean();

  const [gift] = await Category.create([
    { name: `Gifts ${stamp}`, type: "income", is_default: false, user_id: userA._id },
  ]);
  const [food] = await Category.create([
    { name: `Food ${stamp}`, type: "expense", is_default: false, user_id: userA._id },
  ]);
  const [malloryFood] = await Category.create([
    { name: `Mallory Food ${stamp}`, type: "expense", is_default: false, user_id: userB._id },
  ]);

  const conversation = await Conversation.create({
    user_id: userA._id,
    title: "Birthday gift income",
    lastMessageAt: new Date(),
  });

  const today = todayString();

  console.log("\n1. nothing is saved until the student confirms");
  {
    const draft = await proposalOver(conversation._id, {
      type: "income",
      amount: 50000,
      description: "Birthday gift",
      category_id: gift._id,
      category_name: gift.name,
      date: today,
    });

    check("a draft alone creates no transaction", (await txCount(userA._id)) === 0);

    const cancel = await alice.call(`/api/ai/messages/${draft._id}/cancel`, { method: "POST" });
    check("canceling a draft keeps it out of the ledger", cancel.status === 200, `got ${cancel.status}`);
    check("still no transaction after cancel", (await txCount(userA._id)) === 0);

    const cancelAgain = await alice.call(`/api/ai/messages/${draft._id}/cancel`, { method: "POST" });
    const stored = await ChatMessage.findById(draft._id).lean();
    check(
      "a second cancel is idempotent",
      cancelAgain.status === 200 && stored.proposal.status === "cancelled",
      `status=${cancelAgain.status} stored=${stored.proposal.status}`,
    );
  }

  console.log("\n2. two confirms at the same time save exactly one transaction");
  {
    const draft = await proposalOver(conversation._id, {
      type: "income",
      amount: 50000,
      description: "Birthday gift",
      category_id: gift._id,
      category_name: gift.name,
      date: today,
    });

    const before = await txCount(userA._id);
    const [first, second] = await Promise.all([
      alice.call(`/api/ai/messages/${draft._id}/confirm`, { method: "POST", body: {} }),
      alice.call(`/api/ai/messages/${draft._id}/confirm`, { method: "POST", body: {} }),
    ]);
    const after = await txCount(userA._id);

    check("both confirms succeed", first.status < 400 && second.status < 400, `${first.status}/${second.status}`);
    check(`exactly one transaction was created (before ${before}, after ${after})`, after === before + 1);

    const ids = [
      first.body?.transaction?.transaction_id ?? first.body?.transaction_id,
      second.body?.transaction?.transaction_id ?? second.body?.transaction_id,
    ].filter(Boolean);
    check("both responses point at the same transaction", new Set(ids).size === 1, ids.join(","));

    const rows = await Transaction.find({ user_id: userA._id }).lean();
    check("the row is stored once", rows.length === 1, `rows=${rows.length}`);
    const row = rows[0];
    check("the row is income, not expense", row?.type === "income", `type=${row?.type}`);
    check("the row amount is 50,000", row?.amount === 50000, `amount=${row?.amount}`);
    check(
      "the row is keyed on the proposal id",
      row?.request_id === `ai-proposal:${draft._id}`,
      `request_id=${row?.request_id}`,
    );

    const stored = await ChatMessage.findById(draft._id).lean();
    check("the draft is marked confirmed", stored.proposal.status === "confirmed", stored.proposal.status);
    check("the draft remembers its transaction", String(stored.proposal.transaction_id) === String(row._id));

    const third = await alice.call(`/api/ai/messages/${draft._id}/confirm`, { method: "POST", body: {} });
    check(
      "a later retry is still idempotent",
      third.status < 400 && third.body?.already === true && (await txCount(userA._id)) === 1,
      `status=${third.status} already=${third.body?.already}`,
    );
  }

  console.log("\n3. another student cannot confirm or cancel someone else's draft");
  {
    const draft = await proposalOver(conversation._id, {
      type: "expense",
      amount: 1200,
      description: "Lunch",
      category_id: food._id,
      category_name: food.name,
      date: today,
    });

    const before = await txCount(userB._id);
    const confirm = await mallory.call(`/api/ai/messages/${draft._id}/confirm`, {
      method: "POST",
      body: {},
    });
    const cancel = await mallory.call(`/api/ai/messages/${draft._id}/cancel`, { method: "POST" });
    const after = await txCount(userB._id);

    check(
      "confirm is a 403/404 for someone else's draft",
      confirm.status === 403 || confirm.status === 404,
      `got ${confirm.status}`,
    );
    check(
      "cancel is a 403/404 for someone else's draft",
      cancel.status === 403 || cancel.status === 404,
      `got ${cancel.status}`,
    );
    check("no transaction is created for the attacker", before === after && after === 0);

    const stored = await ChatMessage.findById(draft._id).lean();
    check("the owner's draft is untouched", stored.proposal.status === "pending", stored.proposal.status);
    check("student A still has just the one row", (await txCount(userA._id)) === 1);
  }

  console.log("\n4. a draft can only be built from valid fields");
  {
    const cases = [
      ["missing amount", { type: "income", date: today, category: gift.name }, false],
      ["zero amount", { type: "income", amount: 0, date: today, category: gift.name }, false],
      ["negative amount", { type: "income", amount: -5, date: today, category: gift.name }, false],
      ["absurd amount", { type: "income", amount: 10 ** 12, date: today, category: gift.name }, false],
      ["not a date", { type: "income", amount: 50, date: "tomorrow", category: gift.name }, false],
      ["impossible date", { type: "income", amount: 50, date: "2026-02-30", category: gift.name }, false],
      ["two days ahead", { type: "income", amount: 50, date: plusDays(2), category: gift.name }, false],
      ["unknown type", { type: "money", amount: 50, date: today, category: gift.name }, false],
      [
        "complete income draft",
        { type: "income", amount: 50000, date: today, category: gift.name, description: "Birthday gift" },
        true,
      ],
      ["today is allowed", { type: "expense", amount: 900, date: today, category: food.name }, true],
      ["tomorrow is allowed", { type: "expense", amount: 900, date: plusDays(1), category: food.name }, true],
    ];

    for (const [label, input, shouldPass] of cases) {
      const result = parseProposal(input);
      check(`${label} ${shouldPass ? "is accepted" : "is rejected"}`, result.success === shouldPass, result.success ? "" : result.error?.issues?.[0]?.message);
    }

    check("today resolves in Africa/Lagos", /^\d{4}-\d{2}-\d{2}$/.test(today) && APP_TIME_ZONE === "Africa/Lagos", today);
  }

  console.log("\n5. a reply never claims a button or a draft that does not exist");
  {
    const stuck = [
      "I've proposed a ₦50,000 birthday income for today. Press Confirm to save it.",
      "Press Confirm to save it.",
      'I need you to press "Confirm" in the app to save the ₦50,000 birthday gift income. I can\'t save it myself.',
      "The birthday gift income of ₦50,000 has been proposed for today. You'll need to find the confirmation option in your app to save it.",
      "The birthday gift income of ₦50,000 has been proposed for today. Would you like me to confirm it?",
      "I've drafted your transport expense of ₦3,500 under Transport for today (2026-10-06).",
      "Your draft is ready to confirm.",
      "I have recorded this expense already. It is waiting for your confirmation.",
      "That's done — the entry has been created for today.",
    ];

    for (const line of stuck) {
      const cleaned = cleanProposallessReply(line);
      const stillLies =
        cleaned === null
          ? false
          : /\b(press|tap|click|find|confirm|confirmation option|can'?t save|drafted|proposed|recorded|ready|waiting)\b/i.test(
              cleaned,
            );
      check(
        `"${line.slice(0, 42)}…" keeps no promise of a button or draft`,
        !stillLies,
        `kept: ${cleaned}`,
      );
    }

    const plain = cleanProposallessReply("You spent ₦12,400 this month, mostly on Food.");
    check("an ordinary answer is left alone", plain === "You spent ₦12,400 this month, mostly on Food.");

    const mixed = cleanProposallessReply(
      "You spent ₦3,500 on transport today. I've drafted it under Transport for 2026-10-06.",
    );
    check(
      "only the false claim is dropped",
      mixed === "You spent ₦3,500 on transport today.",
      `kept: ${mixed}`,
    );
  }

  console.log("\n6. one live draft: recreate, expiry, supersede");
  {
    const old = await proposalOver(conversation._id, {
      type: "expense",
      amount: 1200,
      description: "Stale lunch",
      category_id: food._id,
      category_name: food.name,
      date: plusDays(-1),
    });
    // Bypass mongoose: its timestamps plugin will not rewrite createdAt, and
    // the expiry rule is measured from the moment the draft was created.
    await ChatMessage.collection.updateOne(
      { _id: old._id },
      { $set: { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) } },
    );

    const before = await txCount(userA._id);
    const expired = await alice.call(`/api/ai/messages/${old._id}/confirm`, { method: "POST", body: {} });
    const storedExpired = await ChatMessage.findById(old._id).lean();
    check("a draft older than 24 hours cannot be confirmed", expired.status === 400, `got ${expired.status}`);
    check("it is marked expired", storedExpired.proposal.status === "expired", storedExpired.proposal.status);
    check("an expired draft saves nothing", (await txCount(userA._id)) === before);

    const recreated = await alice.call(`/api/ai/messages/${old._id}/recreate`, { method: "POST" });
    const freshId = recreated.body?.message?.chat_message_id;
    const fresh = freshId ? await ChatMessage.findById(freshId).lean() : null;
    const source = await ChatMessage.findById(old._id).lean();

    check("'Create it again' returns a new pending draft", recreated.status === 201 && fresh?.proposal?.status === "pending", `status=${recreated.status} fresh=${fresh?.proposal?.status}`);
    check("the old draft steps aside", source.proposal.status === "superseded", source.proposal.status);
    check("the new draft keeps the same details", fresh?.proposal?.amount === 1200 && fresh?.proposal?.date === plusDays(-1) && fresh?.proposal?.type === "expense", JSON.stringify(fresh?.proposal ?? null));

    const pendingCount = await ChatMessage.countDocuments({
      conversation_id: conversation._id,
      "proposal.status": "pending",
    });
    check("exactly one live draft in the conversation", pendingCount === 1, `pending=${pendingCount}`);

    const confirmFresh = await alice.call(`/api/ai/messages/${freshId}/confirm`, { method: "POST", body: {} });
    check("the fresh draft confirms normally", confirmFresh.status < 400, `got ${confirmFresh.status}`);
    check("two rows now (income + expense)", (await txCount(userA._id)) === before + 1);

    const supersededConfirm = await alice.call(`/api/ai/messages/${old._id}/confirm`, { method: "POST", body: {} });
    check(
      "the replaced draft can never be confirmed",
      supersededConfirm.status === 400,
      `got ${supersededConfirm.status}`,
    );
    check("still exactly two rows", (await txCount(userA._id)) === before + 1);
  }

  console.log("\n7. another student's draft id");
  {
    const ghost = await alice.call("/api/ai/messages/000000000000000000000000/confirm", {
      method: "POST",
      body: {},
    });
    check("confirming an unknown draft id is a 404", ghost.status === 404, `got ${ghost.status}`);
    const malloryDraft = await proposalOver(conversation._id, {
      type: "expense",
      amount: 500,
      description: "Not yours",
      category_id: malloryFood._id,
      category_name: malloryFood.name,
      date: today,
    });
    const wrongOwner = await mallory.call(`/api/ai/messages/${malloryDraft._id}/confirm`, {
      method: "POST",
      body: {},
    });
    check("a draft in someone else's conversation is a 404 too", wrongOwner.status === 404, `got ${wrongOwner.status}`);
    check("mallory still has no transactions", (await txCount(userB._id)) === 0);
  }

  console.log("\n############ CLEANUP ############");
  await Transaction.deleteMany({ user_id: { $in: [userA._id, userB._id] } });
  await ChatMessage.deleteMany({ conversation_id: conversation._id });
  await Conversation.deleteMany({ user_id: { $in: [userA._id, userB._id] } });
  await Category.deleteMany({ user_id: { $in: [userA._id, userB._id] } });
  await User.deleteMany({ _id: { $in: [userA._id, userB._id] } });
  const leftovers = await Transaction.countDocuments({ user_id: { $in: [userA._id, userB._id] } });
  check("test data removed", leftovers === 0);

  console.log(`\n=============== RESULT: ${passed} passed, ${failed} failed ===============`);
  if (failures.length) console.log(`failures: ${failures.join(" | ")}`);

  server.close();
  await closeTestDb();
  process.exit(failed === 0 ? 0 : 1);
}

function plusDays(delta) {
  const [year, month, day] = todayString().split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + delta));
  return date.toISOString().slice(0, 10);
}

main().catch(async (error) => {
  console.error("SUITE CRASHED:", error);
  await closeTestDb().catch(() => {});
  process.exit(2);
});
