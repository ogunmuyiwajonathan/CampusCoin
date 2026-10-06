import { todayString as appTodayString } from "./lagosDate.js";

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const pad = (value) => String(value).padStart(2, "0");

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year, month) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return MONTH_DAYS[month - 1] ?? 0;
}

export function isDateString(value) {
  if (typeof value !== "string") return false;
  const match = DATE.exec(value.trim());
  if (!match) return false;
  const [, year, month, day] = match;
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (m < 1 || m > 12) return false;
  return d >= 1 && d <= daysInMonth(y, m);
}

export function todayString(now = new Date()) {
  return appTodayString(now);
}

export function addDays(dateString, days) {
  const [year, month, day] = dateString.split("-").map(Number);
  const base = new Date(Date.UTC(year, month - 1, day));
  base.setUTCDate(base.getUTCDate() + days);
  return `${base.getUTCFullYear()}-${pad(base.getUTCMonth() + 1)}-${pad(base.getUTCDate())}`;
}

export function addMonths(dateString, months) {
  const [year, month, day] = dateString.split("-").map(Number);
  const total = year * 12 + (month - 1) + months;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (total % 12) + 1;
  const nextDay = Math.min(day, daysInMonth(nextYear, nextMonth));
  return `${nextYear}-${pad(nextMonth)}-${pad(nextDay)}`;
}

export function nextRunFrom(dateString, frequency) {
  return frequency === "weekly" ? addDays(dateString, 7) : addMonths(dateString, 1);
}

export function monthKey(dateString) {
  return dateString.slice(0, 7);
}

export function normaliseDate(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (isDateString(text)) return text.replace(/\//g, "-");

  const slashed = /^(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})$/.exec(text);
  if (slashed) {
    const [, first, second, third] = slashed;
    const a = Number(first);
    const b = Number(second);
    const c = Number(third);
    const year = c < 100 ? 2000 + c : c;
    if (a > 999) {
      const candidate = `${a}-${pad(b)}-${pad(c)}`;
      return isDateString(candidate) ? candidate : null;
    }
    if (a > 31 || b > 31) return null;
    const dayFirst = a > 12 ? `${year}-${pad(b)}-${pad(a)}` : null;
    if (dayFirst && isDateString(dayFirst)) return dayFirst;
    const monthFirst = `${year}-${pad(a)}-${pad(b)}`;
    if (isDateString(monthFirst)) return monthFirst;
    return null;
  }

  const named = /^(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})$/.exec(text);
  if (named) {
    const monthIndex = MONTH_NAMES.indexOf(named[2].slice(0, 3).toLowerCase());
    if (monthIndex >= 0) {
      const candidate = `${Number(named[3])}-${pad(monthIndex + 1)}-${pad(Number(named[1]))}`;
      return isDateString(candidate) ? candidate : null;
    }
  }

  return null;
}

const MONTH_NAMES = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

export function parseAmount(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let text = String(value ?? "").trim();
  if (!text) return null;
  const negative = /^\(.*\)$/.test(text);
  text = text.replace(/[()]/g, "");
  text = text.replace(/[^\d.,-]/g, "");
  if (!text) return null;

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  if (lastComma > lastDot) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else {
    text = text.replace(/,/g, "");
  }

  const number = Number(text);
  if (!Number.isFinite(number)) return null;
  return negative ? -Math.abs(number) : number;
}
