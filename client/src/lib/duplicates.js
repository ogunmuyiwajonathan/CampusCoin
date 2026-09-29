// A duplicate here is a near-match, never a reason to block a save: same type,
// same amount, same category, and dates within three days of each other. The
// flag stays advisory because a genuinely repeated charge - two bus fares in a
// week, the same coffee twice - looks exactly like a double entry, and only the
// student knows which one they just made.
const WINDOW_DAYS = 3;

function dayNumber(isoDate) {
  const time = Date.parse(isoDate);
  return Number.isNaN(time) ? null : Math.round(time / 86400000);
}

export function isNearDuplicate(a, b) {
  if (a.transaction_id === b.transaction_id) return false;
  if (a.type !== b.type) return false;
  if (Number(a.amount) !== Number(b.amount)) return false;
  if (a.category_id !== b.category_id) return false;
  const dayA = dayNumber(a.date);
  const dayB = dayNumber(b.date);
  if (dayA == null || dayB == null) return false;
  return Math.abs(dayA - dayB) <= WINDOW_DAYS;
}

// One pass over every pair: an entry is flagged when it matched at least one
// other entry, so both sides of a pair light up in the list.
export function duplicateIds(items) {
  const flagged = new Set();
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      if (isNearDuplicate(items[i], items[j])) {
        flagged.add(items[i].transaction_id);
        flagged.add(items[j].transaction_id);
      }
    }
  }
  return flagged;
}

export function findDuplicateOf(item, items) {
  return items.find((other) => isNearDuplicate(item, other)) ?? null;
}
