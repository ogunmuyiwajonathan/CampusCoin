import mongoose from "mongoose";
import { defineSchema } from "../utils/idOptions.js";

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
    frequency: { type: String, enum: ["weekly", "monthly", null], default: null },
    next_run_at: { type: String, default: null, match: /^\d{4}-\d{2}-\d{2}$/ },
    ai_suggested_category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    import_batch_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    recurring_root: { type: mongoose.Schema.Types.ObjectId },
    generated_from: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
    request_id: { type: String },
  },
  { timestamps: true },
);

transactionSchema.index({ user_id: 1, date: -1 });
transactionSchema.index({ user_id: 1, category_id: 1 });
transactionSchema.index(
  { user_id: 1, request_id: 1 },
  { unique: true, partialFilterExpression: { request_id: { $type: "string" } } },
);
transactionSchema.index(
  { user_id: 1, recurring_root: 1, date: 1 },
  {
    unique: true,
    partialFilterExpression: { recurring_root: { $type: "objectId" } },
  },
);

export const Transaction = mongoose.model("Transaction", transactionSchema);
