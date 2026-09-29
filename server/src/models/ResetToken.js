import mongoose from "mongoose";
import { defineSchema } from "../utils/idOptions.js";

const resetTokenSchema = defineSchema(
    "reset_token_id",
    {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    token_hash: { type: String, required: true, unique: true },
    expires_at: { type: Date, required: true },
    used_at: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true },
);

resetTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
resetTokenSchema.index({ user_id: 1, used_at: 1 });

export const ResetToken = mongoose.model("ResetToken", resetTokenSchema);
