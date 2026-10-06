/**
 * The one definition of "today" for the whole app.
 *
 * The app is built for students in Nigeria, and a transaction date is chosen in
 * the student's local day. Servers, however, usually run in UTC, and a browser
 * can run in any timezone, so `Date#getDate()` and `toISOString()` disagree for
 * the first hour of every day (UTC+1). Every "today" / "this month" value in
 * the app - server and client - is derived from this file so the Dashboard, the
 * Transactions list and Rix all quote the same day and the same month.
 *
 * The date is resolved with Intl in the Africa/Lagos zone, so no hardcoded UTC
 * offset is used anywhere.
 */

export const APP_TIME_ZONE = "Africa/Lagos";

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dayParts(now) {
  const parts = dayFormatter.formatToParts(now);
  const read = (type) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: read("year"), month: read("month"), day: read("day") };
}

/** Today in the app's timezone as `YYYY-MM-DD`. */
export function todayString(now = new Date()) {
  const { year, month, day } = dayParts(now);
  const pad = (value) => String(value).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** The current month in the app's timezone as `YYYY-MM`. */
export function currentMonth(now = new Date()) {
  return todayString(now).slice(0, 7);
}

/** Day of the month in the app's timezone (1-31). */
export function dayOfMonth(now = new Date()) {
  return dayParts(now).day;
}

/** Whole days in a `YYYY-MM` month. */
export function daysInMonth(month) {
  const [year, mon] = String(month).split("-").map(Number);
  if (!year || !mon) return 0;
  return new Date(Date.UTC(year, mon, 0)).getUTCDate();
}

/**
 * Whole days between today and `dateString` (`YYYY-MM-DD`).
 * Positive when the date is in the future, negative when it is in the past.
 */
export function daysFromToday(dateString, now = new Date()) {
  const [year, month, day] = String(dateString).split("-").map(Number);
  if (!year || !month || !day) return Number.NaN;
  const target = Date.UTC(year, month - 1, day);
  const { year: ty, month: tm, day: td } = dayParts(now);
  return Math.round((target - Date.UTC(ty, tm - 1, td)) / 86_400_000);
}
