import mongoose from "mongoose";
import ApiError from "../utils/ApiError.js";
import { Category, Transaction, TransactionHistory } from "../models/index.js";
import { isDateString, monthKey, normaliseDate, parseAmount } from "../utils/dateMath.js";
import { evaluateBudgets, visibleCategories } from "./ledger.service.js";

export const CSV_MAX_BYTES = 2 * 1024 * 1024;
export const CSV_MAX_ROWS = 500;

const HEADER_ALIASES = {
  date: ["date", "transaction date", "posted date", "day", "value date"],
  amount: ["amount", "amount (ngn)", "amount ngn", "value", "total", "sum", "money"],
  description: [
    "description",
    "details",
    "memo",
    "narration",
    "notes",
    "note",
    "item",
    "merchant",
    "payee",
    "particulars",
  ],
  category: ["category", "category name", "budget category", "tag"],
  type: ["type", "kind", "transaction type", "direction", "flow", "income/expense"],
};

const FALLBACK_EXPENSE = ["others", "miscellaneous", "other"];
const FALLBACK_INCOME = ["allowance", "gifts", "other income", "other"];

function clean(value) {
  return String(value ?? "").replace(/^﻿/, "").trim();
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\r") continue;
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }

  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => clean(cell) !== ""));
}

function mapHeaders(headerRow) {
  const mapping = {};
  headerRow.forEach((raw, index) => {
    const header = clean(raw).toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (mapping[field] === undefined && aliases.includes(header)) mapping[field] = index;
    }
  });
  return mapping;
}

function pickFallback(categories, type) {
  const names = type === "income" ? FALLBACK_INCOME : FALLBACK_EXPENSE;
  const ofType = categories.filter((category) => category.type === type);
  for (const name of names) {
    const match = ofType.find((category) => category.name.toLowerCase() === name);
    if (match) return match;
  }
  const partial = ofType.find((category) => names.some((name) => category.name.toLowerCase().includes(name)));
  return partial ?? ofType[0] ?? null;
}

function saveFailureReason(error) {
  if (error?.name === "ValidationError") {
    const first = Object.values(error.errors ?? {})[0];
    return first?.message ? String(first.message) : "That row is not valid.";
  }
  if (error?.code === 11000) return "That row duplicates one you already have.";
  if (typeof error?.message === "string" && error.message) {
    return "That row could not be saved.";
  }
  return "That row could not be saved.";
}

function matchCategory(categories, raw) {
  const text = clean(raw).toLowerCase();
  if (!text) return null;
  const byId = categories.find((category) => String(category._id) === text);
  if (byId) return byId;
  return (
    categories.find((category) => category.name.toLowerCase() === text) ??
    categories.find((category) => category.name.toLowerCase().includes(text)) ??
    null
  );
}

export async function importTransactionsCsv(userId, buffer) {
  if (!buffer?.length) throw ApiError.badRequest("That file was empty.");

  const text = buffer.toString("utf8");
  const rows = parseCsv(text);
  if (rows.length < 2) {
    throw ApiError.badRequest(
      "That file needs a header row and at least one transaction row.",
    );
  }

  const mapping = mapHeaders(rows[0]);
  const missing = ["date", "amount"].filter((field) => mapping[field] === undefined);
  if (missing.length) {
    throw ApiError.badRequest(
      `That file is missing a ${missing.join(" and ")} column. Download the template to see the expected format.`,
    );
  }

  const dataRows = rows.slice(1);
  if (dataRows.length > CSV_MAX_ROWS) {
    throw ApiError.badRequest(
      `That file has ${dataRows.length} rows. Import up to ${CSV_MAX_ROWS} at a time.`,
    );
  }

  const categories = await Category.find(visibleCategories(userId)).lean();
  if (!categories.length) {
    throw ApiError.badRequest("There are no categories available yet.");
  }

  const batchId = new mongoose.Types.ObjectId();
  const report = [];
  const accepted = [];
  const budgetTargets = new Set();

  dataRows.forEach((cells, index) => {
    const lineNumber = index + 2;
    const cell = (field) =>
      mapping[field] === undefined ? "" : clean(cells[mapping[field]]);

    const base = { row: lineNumber };
    const date = normaliseDate(cell("date"));
    if (!date || !isDateString(date)) {
      report.push({ ...base, status: "rejected", reason: "That date is not a real date." });
      return;
    }

    const amount = parseAmount(cell("amount"));
    if (amount === null) {
      report.push({ ...base, status: "rejected", reason: "That amount is not a number." });
      return;
    }

    if (amount === 0) {
      report.push({ ...base, status: "rejected", reason: "That amount is zero." });
      return;
    }

    if (Math.abs(amount) > 100_000_000) {
      report.push({ ...base, status: "rejected", reason: "That amount is too large." });
      return;
    }

    const description = cell("description").slice(0, 140);
    const wantsIncome = /income|credit|inflow|\+/i.test(cell("type"));
    const wantsExpense = /expense|debit|outflow|dr\b|-/i.test(cell("type"));

    let category = matchCategory(categories, cell("category"));
    let fallback = false;
    if (!category) {
      const type = wantsIncome && !wantsExpense ? "income" : "expense";
      category = pickFallback(categories, type);
      fallback = true;
    }
    if (!category) {
      report.push({
        ...base,
        status: "rejected",
        reason: "No category could be worked out for that row.",
      });
      return;
    }

    const type = category.type;
    // Same rule as the transaction form: money is stored to the kobo.
    const value = Math.round(Math.abs(amount) * 100) / 100;
    budgetTargets.add(`${category._id}:${monthKey(date)}`);

    accepted.push({
      lineNumber,
      base,
      payload: {
        _id: new mongoose.Types.ObjectId(),
        user_id: userId,
        category_id: category._id,
        type,
        amount: value,
        description,
        date,
        is_recurring: false,
        frequency: null,
        next_run_at: null,
        import_batch_id: batchId,
      },
      display: {
        date,
        description,
        amount: value,
        category_name: category.name,
        fallback,
      },
    });
  });

  const failureReasons = new Map();
  if (accepted.length) {
    const documents = accepted.map((entry) => entry.payload);
    for (let index = 0; index < documents.length; index += 1) {
      try {
        await Transaction.create(documents[index]);
      } catch (error) {
        failureReasons.set(index, saveFailureReason(error));
      }
    }
  }

  for (let index = 0; index < accepted.length; index += 1) {
    const entry = accepted[index];
    const row = { ...entry.base, ...entry.display };
    if (failureReasons.has(index)) {
      report.push({ ...row, status: "rejected", reason: failureReasons.get(index) });
    } else {
      report.push({ ...row, status: "accepted", transaction_id: String(entry.payload._id) });
    }
  }

  report.sort((a, b) => a.row - b.row);

  for (const target of budgetTargets) {
    const [categoryId, month] = target.split(":");
    await evaluateBudgets(userId, {
      category_id: categoryId,
      type: "expense",
      date: `${month}-01`,
    });
  }

  const acceptedCount = report.filter((row) => row.status === "accepted").length;
  const fallbackNames = [
    ...new Set(
      report
        .filter((row) => row.status === "accepted" && row.fallback)
        .map((row) => row.category_name),
    ),
  ];

  return {
    batch_id: batchId.toString(),
    summary: {
      total: report.length,
      accepted: acceptedCount,
      rejected: report.length - acceptedCount,
    },
    fallback_categories: fallbackNames,
    rows: report,
  };
}

export async function undoImportBatch(userId, batchId) {
  const removed = await Transaction.find({ user_id: userId, import_batch_id: batchId }).lean();
  if (!removed.length) throw ApiError.notFound("That import was not found.");

  await TransactionHistory.insertMany(
    removed.map((transaction) => ({
      user_id: userId,
      transaction: {
        category_id: transaction.category_id,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        date: transaction.date,
        is_recurring: transaction.is_recurring,
        frequency: transaction.frequency,
        next_run_at: transaction.next_run_at,
        import_batch_id: transaction.import_batch_id,
      },
      deleted_at: new Date(),
      origin: "import-undo",
    })),
  );

  await Transaction.deleteMany({ user_id: userId, import_batch_id: batchId });
  return removed.length;
}
