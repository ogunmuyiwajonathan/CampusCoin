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
    // Client-generated key for one "save this transaction" click. A double click,
    // a retry after a dropped response and a duplicated tab all send the same
    // key, and the unique index below turns the second one into the first row
    // instead of a second expense.
    request_id: { type: String, default: null },
  },
  { timestamps: true },
);

// Serves the monthly ledger read: one user, newest first.
transactionSchema.index({ user_id: 1, date: -1 });
// Serves per-category spend totals for budgets, insights and the donut, so the
// aggregation never has to scan the whole collection.
transactionSchema.index({ user_id: 1, category_id: 1 });
// Makes the double-click guard a database guarantee rather than a client
// promise. Sparse, so rows written without a request_id (the seeder, imports)
// are all exempt and do not collide with one another.
transactionSchema.index({ user_id: 1, request_id: 1 }, { unique: true, sparse: true });

export const Transaction = mongoose.model("Transaction", transactionSchema);
