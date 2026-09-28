import mongoose from "mongoose";
import { defineSchema } from "../utils/idOptions.js";

// date is stored as a YYYY-MM-DD string rather than a BSON Date on purpose.
// The client already passes dates as strings, ISO strings sort and range-query
// correctly as strings, and it removes every timezone bug from "which day is
// this transaction on" for a student logging today vs tomorrow.
const transactionSchema = defineSchema(
    "transaction_id",
    {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, default: "", trim: true, maxlength: 140 },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    is_recurring: { type: Boolean, default: false },
    // Set together with is_recurring. Only these two frequencies are supported.
    frequency: { type: String, enum: ["weekly", "monthly", null], default: null },
    next_run_at: { type: String, default: null, match: /^\d{4}-\d{2}-\d{2}$/ },
    // What the categoriser proposed, kept even when the student overrode it.
    ai_suggested_category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    // Groups the rows created by one CSV upload so the whole batch can be undone.
    import_batch_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    // Every row one recurring series has produced points back at the row it came
    // from, so a catch-up pass can tell a genuine new period from one it already
    // wrote. Both are left unset rather than defaulted to null, for the same
    // reason as request_id: the index below is sparse and only exempts rows that
    // omit the field.
    recurring_root: { type: mongoose.Schema.Types.ObjectId },
    generated_from: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
    // Client-generated key for one "save this transaction" click. A double click,
    // a retry after a dropped response and a duplicated tab all send the same
    // key, and the unique index below turns the second one into the first row
    // instead of a second expense.
    //
    // Deliberately no default. The index is sparse, which exempts documents that
    // omit the field but not documents that store an explicit null, so a null
    // default would make every transaction written without a request_id (the
    // seeder, a CSV import, a generated recurring row) collide with the previous
    // one and fail to save.
    request_id: { type: String },
  },
  { timestamps: true },
);

// Serves the monthly ledger read: one user, newest first.
transactionSchema.index({ user_id: 1, date: -1 });
// Serves per-category spend totals for budgets, insights and the donut, so the
// aggregation never has to scan the whole collection.
transactionSchema.index({ user_id: 1, category_id: 1 });
// Makes the double-click guard a database guarantee rather than a client
// promise. Sparse, so rows written without a request_id (the seeder, imports,
// generated recurring rows) are all exempt and do not collide with one another.
// This only holds while request_id is left unset rather than set to null.
transactionSchema.index({ user_id: 1, request_id: 1 }, { unique: true, sparse: true });
// Makes the recurring catch-up idempotent: the same series cannot write two rows
// for one date, so a pass that runs twice inserts nothing the second time.
transactionSchema.index({ user_id: 1, recurring_root: 1, date: 1 }, {
  sparse: true,
  unique: true,
});

export const Transaction = mongoose.model("Transaction", transactionSchema);
