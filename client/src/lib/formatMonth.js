import { currentMonth as lagosCurrentMonth, todayString } from "../../../server/src/utils/lagosDate.js";

const DATE_LOCALE = "en-US";

export function monthKey(isoDate) {
  return isoDate.slice(0, 7);
}

/** The month the app considers current, resolved in Africa/Lagos. */
export function currentMonthKey() {
  return lagosCurrentMonth();
}

export function monthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(DATE_LOCALE, {
    month: "long",
    year: "numeric",
  });
}

export function shiftMonthKey(key, delta) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * The month dropdown choices: the current month plus the ones before it. The
 * list is built from the calendar, never from the rows that happen to have
 * loaded, so a month with no data is still selectable.
 */
export function monthOptions(count = 12, from = currentMonthKey()) {
  return Array.from({ length: Math.max(1, count) }, (_, index) => shiftMonthKey(from, -index));
}

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

export function formatDayMonth(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(DATE_LOCALE, { month: "short", day: "numeric" });
}

/** Today in Africa/Lagos as `YYYY-MM-DD`. */
export function todayISO() {
  return todayString();
}
