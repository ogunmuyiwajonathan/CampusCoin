import mongoose from "mongoose";
import { defineSchema } from "../utils/idOptions.js";

const budgetSchema = defineSchema(
    "budget_id",
    {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    // YYYY-MM. A budget belongs to exactly one month and is never carried over.
    month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    limit_amount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

// One limit per category per month. Enforced by the database rather than by a
// route check, so a race between two requests cannot create a duplicate.
budgetSchema.index({ user_id: 1, category_id: 1, month: 1 }, { unique: true });

export const Budget = mongoose.model("Budget", budgetSchema);
