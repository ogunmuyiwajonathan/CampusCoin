// The single place a naira amount is turned from text into a number, so the
// transaction form, the budget form and the profile figures agree on what
// "2,500.50" means. The server has the same rules in validators/ledger.schema.js.

export const MAX_AMOUNT = 100_000_000;

export function round2(value) {
  return Math.round(value * 100) / 100;
}

/** "2,500.50" / "₦2500.5" / " 2500 " all become a number; anything else is null. */
export function parseAmountInput(raw) {
  const text = normaliseAmountInput(raw);
  if (!text) return null;
  if (!/^-?\d*(\.\d*)?$/.test(text)) return null;
  if (text === "-" || text === "." || text === "" || text === "-.") return null;
  const value = Number(text);
  if (!Number.isFinite(value)) return null;
  return round2(value);
}

function normaliseAmountInput(raw) {
  return String(raw ?? "")
    .trim()
    .replace(/^[₦n]\s*/, "")
    .replace(/[\s,]/g, "");
}

/**
 * Returns null when the amount is fine, or the message to show under the field.
 * Empty, zero, negative, non-numeric and absurd values are all rejected here and
 * again on the server, so neither side can save a bad figure on its own.
 */
export function validateAmount(raw, { label = "Amount" } = {}) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "Enter an amount.";

  const text = normaliseAmountInput(trimmed);
  if (text.startsWith("-")) return `${label} cannot be negative.`;
  if (!/^\d*(\.\d*)?$/.test(text) || text === "" || text === ".") {
    return `${label} must be a number, like 2500 or 2,500.50.`;
  }

  const value = round2(Number(text));
  if (!Number.isFinite(value)) return `${label} must be a number, like 2500 or 2,500.50.`;
  if (value <= 0) return `${label} must be greater than ₦0.`;
  if (value > MAX_AMOUNT) {
    return `${label} cannot be more than ₦${MAX_AMOUNT.toLocaleString("en-NG")}.`;
  }
  return null;
}
