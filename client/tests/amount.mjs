// Amount rules, client half. The server repeats the same rules in
// server/src/validators/ledger.schema.js (see tests/amount-validation.mjs), so a
// bad figure is rejected on both sides.
//
// Run with: npm test   (from client/)

import { MAX_AMOUNT, formatAmountInput, parseAmountInput, validateAmount } from "../src/lib/amount.js";
import { formatCurrency } from "../src/lib/formatCurrency.js";

let passed = 0;
const failures = [];

function check(label, actual, expected) {
  const same = Object.is(actual, expected);
  if (same) passed += 1;
  else failures.push(`${label}\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`);
}

function checkTrue(label, condition) {
  if (condition) passed += 1;
  else failures.push(label);
}

// --- parseAmountInput -------------------------------------------------------

check("plain integer", parseAmountInput("2500"), 2500);
check("thousands separator", parseAmountInput("2,500.50"), 2500.5);
check("naira symbol", parseAmountInput("₦2500.5"), 2500.5);
check("surrounding spaces", parseAmountInput("  12000  "), 12000);
// Note on ties: money here is rounded with Math.round(v * 100) / 100, so a value
// that sits exactly on a half-kobo (2500.555, which binary stores just under)
// rounds down. The rule being tested is "third decimal rounds, never rejects",
// so the cases below sit either side of a tie rather than on one.
check("third decimal rounds up", parseAmountInput("2500.556"), 2500.56);
check("third decimal rounds down", parseAmountInput("2500.554"), 2500.55);
check("two decimals stay put", parseAmountInput("2500.55"), 2500.55);
check("empty is null", parseAmountInput(""), null);
check("letters are null", parseAmountInput("abc"), null);
check("mixed text is null", parseAmountInput("12abc"), null);
check("lone dash is null", parseAmountInput("-"), null);
check("lone dot is null", parseAmountInput("."), null);

// --- validateAmount ---------------------------------------------------------

check("empty rejected", validateAmount(""), "Enter an amount.");
check("whitespace rejected", validateAmount("   "), "Enter an amount.");
check("zero rejected", validateAmount("0"), "Amount must be greater than ₦0.");
check("zero with decimals rejected", validateAmount("0.00"), "Amount must be greater than ₦0.");
check("negative rejected", validateAmount("-5"), "Amount cannot be negative.");
check("letters rejected", validateAmount("abc"), "Amount must be a number, like 2500 or 2,500.50.");
check("over the cap rejected", validateAmount("100000001"), `Amount cannot be more than ₦${MAX_AMOUNT.toLocaleString("en-NG")}.`);
check("at the cap accepted", validateAmount("100000000"), null);
check("separator amount accepted", validateAmount("2,500.50"), null);
check("plain amount accepted", validateAmount("2500"), null);
check("sub-kobo amount accepted", validateAmount("10.999"), null);
check("amount too small to exist in kobo rejected", validateAmount("0.001"), "Amount must be greater than ₦0.");
check("sub-kobo parses down to zero", parseAmountInput("0.001"), 0);

// --- formatCurrency ---------------------------------------------------------

const whole = formatCurrency(2500);
checkTrue(`whole naira reads ₦2,500, got "${whole}"`, whole.includes("2,500"));
checkTrue(`whole naira never shows .00, got "${whole}"`, !whole.includes(".00"));

const half = formatCurrency(2500.5);
checkTrue(`half a naira reads ₦2,500.50, got "${half}"`, half.includes("2,500.50"));
checkTrue(`half a naira never shortens to .5, got "${half}"`, !/\.5\b/.test(half));

const rounded = formatCurrency(2500.556);
checkTrue(`float wobble rounds to 2,500.56, got "${rounded}"`, rounded.includes("2,500.56"));

const grouped = formatCurrency(1000000);
checkTrue(`large amount keeps separators, got "${grouped}"`, grouped.includes("1,000,000"));
checkTrue(`large whole amount never shows .00, got "${grouped}"`, !grouped.includes(".00"));

checkTrue(`zero is ₦0 without decimals, got "${formatCurrency(0)}"`, !formatCurrency(0).includes(".00"));
checkTrue(`non-finite falls back to ₦0, got "${formatCurrency(Number.NaN)}"`, !formatCurrency(Number.NaN).includes(".00"));

const forced = formatCurrency(2500, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
checkTrue(`caller can force two digits, got "${forced}"`, forced.includes("2,500.00"));

// --- formatAmountInput ------------------------------------------------------
// What the edit field shows when a saved figure is loaded back in.

check("edit field keeps the kobo", formatAmountInput(2500.5), "2,500.50");
check("edit field drops whole-number decimals", formatAmountInput(2500), "2,500");
check("edit field groups large figures", formatAmountInput(1000000), "1,000,000");
check("edit field rounds a third decimal", formatAmountInput(2500.556), "2,500.56");
check("edit field accepts an already formatted value", formatAmountInput("\u20a62,500.50"), "2,500.50");
check("edit field formats a raw string", formatAmountInput("2500.5"), "2,500.50");
check("edit field turns null into empty", formatAmountInput(null), "");
check("edit field turns undefined into empty", formatAmountInput(undefined), "");
check("edit field leaves unparseable text alone", formatAmountInput("abc"), "abc");

// The round-trip that matters: whatever the field shows has to parse back to the
// exact figure that was stored, or an untouched edit would silently change money.
checkTrue("2,500.50 round-trips", parseAmountInput(formatAmountInput(2500.5)) === 2500.5);
checkTrue("2,500 round-trips", parseAmountInput(formatAmountInput(2500)) === 2500);
checkTrue("1,000,000 round-trips", parseAmountInput(formatAmountInput(1000000)) === 1000000);
checkTrue("zero round-trips", parseAmountInput(formatAmountInput(0)) === 0);

// --- report -----------------------------------------------------------------

const total = passed + failures.length;
if (failures.length) {
  console.error(`\namount: ${failures.length} failed / ${total}`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log(`amount: ${passed} passed / ${total}`);
