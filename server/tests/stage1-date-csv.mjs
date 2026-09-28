import assert from "node:assert/strict";
import {
  addDays,
  addMonths,
  isDateString,
  monthKey,
  nextRunFrom,
  normaliseDate,
  parseAmount,
  daysInMonth,
  todayString,
} from "../src/utils/dateMath.js";
import { parseCsv } from "../src/services/import.service.js";

let passed = 0;
const check = (name, fn) => {
  fn();
  passed += 1;
};

check("isDateString accepts real dates and rejects fake ones", () => {
  assert.equal(isDateString("2026-09-20"), true);
  assert.equal(isDateString("2026-02-29"), false, "2026 is not a leap year");
  assert.equal(isDateString("2024-02-29"), true, "2024 is a leap year");
  assert.equal(isDateString("2026-13-01"), false);
  assert.equal(isDateString("2026-09-31"), false);
  assert.equal(isDateString("2026-9-1"), false);
  assert.equal(isDateString(""), false);
  assert.equal(isDateString(null), false);
  assert.equal(isDateString(20260920), false);
});

check("daysInMonth knows every month length", () => {
  assert.equal(daysInMonth(2026, 1), 31);
  assert.equal(daysInMonth(2026, 2), 28);
  assert.equal(daysInMonth(2024, 2), 29);
  assert.equal(daysInMonth(2026, 4), 30);
  assert.equal(daysInMonth(2026, 12), 31);
});

check("addDays crosses months, years and leap days", () => {
  assert.equal(addDays("2026-09-20", 1), "2026-09-21");
  assert.equal(addDays("2026-09-30", 1), "2026-10-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
  assert.equal(addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(addDays("2026-02-28", 1), "2026-03-01");
  assert.equal(addDays("2026-09-20", 30), "2026-10-20");
});

check("addMonths clamps a short month instead of rolling over", () => {
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonths("2024-01-31", 1), "2024-02-29");
  assert.equal(addMonths("2026-01-31", 3), "2026-04-30");
  assert.equal(addMonths("2026-09-20", 1), "2026-10-20");
  assert.equal(addMonths("2026-12-15", 1), "2027-01-15");
  assert.equal(addMonths("2026-11-30", 1), "2026-12-30");
  assert.equal(addMonths("2026-09-20", 12), "2027-09-20");
});

check("nextRunFrom gives the right period for each frequency", () => {
  assert.equal(nextRunFrom("2026-09-20", "weekly"), "2026-09-27");
  assert.equal(nextRunFrom("2026-09-20", "monthly"), "2026-10-20");
  assert.equal(nextRunFrom("2026-09-20", "unknown"), "2026-10-20");
});

check("a weekly series always lands on the same weekday", () => {
  let date = "2026-09-20";
  for (let step = 0; step < 6; step += 1) {
    const next = nextRunFrom(date, "weekly");
    assert.equal(new Date(next).getUTCDay(), new Date(date).getUTCDay());
    date = next;
  }
  assert.equal(date, "2026-11-01");
});

check("monthKey slices the year and month", () => {
  assert.equal(monthKey("2026-09-20"), "2026-09");
  assert.equal(monthKey("2026-01-01"), "2026-01");
});

check("todayString is a valid date string", () => {
  assert.equal(isDateString(todayString()), true);
});

check("normaliseDate reads the formats a bank actually exports", () => {
  assert.equal(normaliseDate("2026-09-20"), "2026-09-20");
  assert.equal(normaliseDate(" 2026-09-20 "), "2026-09-20");
  assert.equal(normaliseDate("2026/09/20"), "2026-09-20");
  assert.equal(normaliseDate("20/09/2026"), "2026-09-20", "day over 12 must be day first");
  assert.equal(normaliseDate("09/20/2026"), "2026-09-20", "day under 12 is month first");
  assert.equal(normaliseDate("09-20-2026"), "2026-09-20");
  assert.equal(normaliseDate("20 Sep 2026"), "2026-09-20");
  assert.equal(normaliseDate("5 Jan 2026"), "2026-01-05");
});

check("normaliseDate refuses anything it cannot trust", () => {
  assert.equal(normaliseDate("not a date"), null);
  assert.equal(normaliseDate(""), null);
  assert.equal(normaliseDate(null), null);
  assert.equal(normaliseDate("2026-02-30"), null);
  assert.equal(normaliseDate("32/01/2026"), null);
  assert.equal(normaliseDate("13/13/2026"), null);
  assert.equal(normaliseDate("99/99/9999"), null);
});

check("parseAmount reads currency, separators and negatives", () => {
  assert.equal(parseAmount("1500"), 1500);
  assert.equal(parseAmount("1,500.50"), 1500.5);
  assert.equal(parseAmount("1500,50"), 1500.5, "comma as decimal separator");
  assert.equal(parseAmount("N1,500.50"), 1500.5);
  assert.equal(parseAmount("₦200"), 200);
  assert.equal(parseAmount("  300  "), 300);
  assert.equal(parseAmount("(250)"), -250, "accounting negative");
  assert.equal(parseAmount("-75"), -75);
  assert.equal(parseAmount(0), 0);
  assert.equal(parseAmount(""), null);
  assert.equal(parseAmount("abc"), null);
  assert.equal(parseAmount(null), null);
});

check("parseCsv reads a simple file", () => {
  const rows = parseCsv("date,description,amount\n2026-09-20,Campus Cafe,1500\n");
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], ["date", "description", "amount"]);
  assert.deepEqual(rows[1], ["2026-09-20", "Campus Cafe", "1500"]);
});

check("parseCsv handles quoted fields, embedded commas and newlines", () => {
  const text = 'date,description,amount\n2026-09-20,"Campus Cafe, Main Hall",1500\n';
  const rows = parseCsv(text);
  assert.deepEqual(rows[1], ["2026-09-20", "Campus Cafe, Main Hall", "1500"]);

  const escaped = parseCsv('a,b\n"he said ""hi""",2\n');
  assert.deepEqual(escaped[1], ['he said "hi"', "2"]);

  const multiline = parseCsv('a,b\n"line1\nline2",2\n');
  assert.deepEqual(multiline[1], ["line1\nline2", "2"]);
});

check("parseCsv copes with CRLF, a BOM and blank lines", () => {
  const rows = parseCsv("\uFEFFdate,amount\r\n2026-09-20,1500\r\n\r\n2026-09-21,900\r\n");
  assert.equal(rows.length, 3);
  assert.equal(rows[0][0].replace(/^\uFEFF/, ""), "date");
  assert.deepEqual(rows[2], ["2026-09-21", "900"]);
});

check("parseCsv keeps a row that is only a quoted empty field", () => {
  const rows = parseCsv('a,b,c\n2026-09-20,,\n');
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[1], ["2026-09-20", "", ""]);
});

check("parseCsv returns nothing for an empty or whitespace file", () => {
  assert.deepEqual(parseCsv(""), []);
  assert.deepEqual(parseCsv("\n\n"), []);
  assert.deepEqual(parseCsv("   \n  \n"), []);
});

process.stdout.write(`dateMath + csv: ${passed}/16 passed\n`);
