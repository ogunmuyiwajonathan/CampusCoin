const DATE_LOCALE = "en-US";

export function monthKey(isoDate) {
  return isoDate.slice(0, 7);
}

export function currentMonthKey(today = new Date()) {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(DATE_LOCALE, {
    month: "long",
    year: "numeric",
  });
}

/** Moves a "YYYY-MM" key by whole months; negative goes further back. */
export function shiftMonthKey(key, delta) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** "Apr - Sep 2026", or "Nov 2025 - Apr 2026" when the window spans two years. */
export function monthRangeShort(startKey, endKey) {
  const [startYear, startMonth] = startKey.split("-").map(Number);
  const [endYear, endMonth] = endKey.split("-").map(Number);
  const start = new Date(startYear, startMonth - 1, 1).toLocaleDateString(DATE_LOCALE, {
    month: "short",
  });
  const end = new Date(endYear, endMonth - 1, 1).toLocaleDateString(DATE_LOCALE, {
    month: "short",
  });
  if (startYear !== endYear) return `${start} ${startYear} – ${end} ${endYear}`;
  return `${start} – ${end} ${endYear}`;
}

/** "Sep 2026" - the "Joined" profile line until `created_at` exists. */
export function joinedLabel(today = new Date()) {
  return today.toLocaleDateString(DATE_LOCALE, { month: "short", year: "numeric" });
}

export function monthRange(key) {
  const [year, month] = key.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const startText = start.toLocaleDateString(DATE_LOCALE, { month: "short", day: "numeric" });
  const endText = end.toLocaleDateString(DATE_LOCALE, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startText} – ${endText}`;
}

export function formatDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(DATE_LOCALE, { month: "short", day: "numeric", year: "numeric" });
}

/** "Sep 26" — the phone-width date that keeps the transactions table on one line. */
export function formatDayMonth(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(DATE_LOCALE, { month: "short", day: "numeric" });
}

export function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
