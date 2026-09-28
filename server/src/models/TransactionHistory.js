import mongoose from "mongoose";
import { defineSchema } from "../utils/idOptions.js";

const transactionHistorySchema = defineSchema(
  "history_id",
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    transaction: { type: mongoose.Schema.Types.Mixed, required: true },
    deleted_at: { type: Date, required: true, default: Date.now },
    restored_at: { type: Date, default: null },
    origin: { type: String, enum: ["delete", "import-undo"], default: "delete" },
  },
  { timestamps: true },
);

transactionHistorySchema.index({ user_id: 1, deleted_at: -1 });

export const TransactionHistory = mongoose.model(
  "TransactionHistory",
  transactionHistorySchema,
);
