// Amount rules, server half. The browser repeats the same rules in
// client/src/lib/amount.js (see client/tests/amount.mjs), so a figure that one
// side lets through is still refused by the other.
//
// Run with: node tests/amount-validation.mjs

import { createBudgetSchema, createTransactionSchema } from "../src/validators/ledger.schema.js";

let passed = 0;
const failures = [];

function check(label, actual, expected) {
  const same =
    typeof expected === "object" && expected !== null
      ? JSON.stringify(actual) === JSON.stringify(expected)
      : Object.is(actual, expected);
  if (same) passed += 1;
  else failures.push(`${label}\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`);
}

function base(extra) {
  return {
    category_id: "food",
    date: "2026-10-04",
    amount: 2500,
    ...extra,
  };
}

function amountOf(body) {
  const result = createTransactionSchema.safeParse(base(body));
  return result.success ? { ok: true, amount: result.data.amount } : { ok: false, error: result.error.issues[0]?.message };
}

function errorOf(body) {
  const result = createTransactionSchema.safeParse(base(body));
  return result.success ? undefined : result.error.issues[0]?.message;
}

// --- accepted ---------------------------------------------------------------

check("plain number", amountOf({ amount: 2500 }), { ok: true, amount: 2500 });
check("decimal number", amountOf({ amount: 2500.5 }), { ok: true, amount: 2500.5 });
check("typed with separators", amountOf({ amount: "2,500.50" }), { ok: true, amount: 2500.5 });
check("naira symbol", amountOf({ amount: "₦2500" }), { ok: true, amount: 2500 });
check("spaces are ignored", amountOf({ amount: " 12 000 " }), { ok: true, amount: 12000 });
check("third decimal rounds, not rejects", amountOf({ amount: "2500.556" }), { ok: true, amount: 2500.56 });
check("at the cap", amountOf({ amount: 100_000_000 }), { ok: true, amount: 100_000_000 });
check("over the cap once rounded", amountOf({ amount: "100,000,000.999" }), { ok: false, error: "That amount is too large." });

// --- rejected ---------------------------------------------------------------

check("missing", amountOf({ amount: undefined }), { ok: false, error: "Enter an amount." });
check("null", amountOf({ amount: null }), { ok: false, error: "Enter an amount." });
check("empty string", amountOf({ amount: "" }), { ok: false, error: "Enter an amount." });
check("letters", amountOf({ amount: "abc" }), { ok: false, error: "Enter an amount." });
check("mixed text", amountOf({ amount: "12abc" }), { ok: false, error: "Enter an amount." });
check("boolean", amountOf({ amount: true }), { ok: false, error: "Enter an amount." });
check("object", amountOf({ amount: {} }), { ok: false, error: "Enter an amount." });
check("zero", amountOf({ amount: 0 }), { ok: false, error: "Amount must be greater than ₦0." });
check("zero as text", amountOf({ amount: "0" }), { ok: false, error: "Amount must be greater than ₦0." });
check("zero with decimals", amountOf({ amount: "0.00" }), { ok: false, error: "Amount must be greater than ₦0." });
check("sub-kobo rounds to zero", amountOf({ amount: 0.001 }), { ok: false, error: "Amount must be greater than ₦0." });
check("negative number", amountOf({ amount: -5 }), { ok: false, error: "Amount must be greater than ₦0." });
check("negative text", amountOf({ amount: "-5" }), { ok: false, error: "Amount must be greater than ₦0." });
check("over the cap", amountOf({ amount: 100_000_001 }), { ok: false, error: "That amount is too large." });
check("absurd but numeric", amountOf({ amount: "999999999999" }), { ok: false, error: "That amount is too large." });

check("a bad amount still reports the amount error first", errorOf({ amount: "", description: "x" }), "Enter an amount.");

// --- budgets use the same rule ---------------------------------------------

const budget = (limit) =>
  createBudgetSchema.safeParse({ category_id: "food", month: "2026-10", limit_amount: limit });

check("budget accepts a formatted limit", budget("1,500.50").success, true);
check("budget formatted limit is rounded", budget("1,500.50").data.limit_amount, 1500.5);
check("budget rejects zero", budget(0).success, false);
check("budget rejects a negative limit", budget(-1).success, false);
check("budget rejects an absurd limit", budget(100_000_001).success, false);

// --- report -----------------------------------------------------------------

const total = passed + failures.length;
if (failures.length) {
  console.error(`\namount-validation: ${failures.length} failed / ${total}`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log(`amount-validation: ${passed} passed / ${total}`);
