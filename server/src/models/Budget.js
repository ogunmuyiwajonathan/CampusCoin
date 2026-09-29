import mongoose from "mongoose";
import { defineSchema } from "../utils/idOptions.js";

const budgetSchema = defineSchema(
    "budget_id",
    {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    limit_amount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

budgetSchema.index({ user_id: 1, category_id: 1, month: 1 }, { unique: true });

export const Budget = mongoose.model("Budget", budgetSchema);
