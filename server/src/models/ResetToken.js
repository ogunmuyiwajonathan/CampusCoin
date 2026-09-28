import mongoose from "mongoose";
import { defineSchema } from "../utils/idOptions.js";

// Only the hash of a reset token is stored. A database leak therefore does not
// hand an attacker a working password-reset link, and expires_at is a real TTL
// index so Mongo deletes stale rows instead of us sweeping them by hand.
const resetTokenSchema = defineSchema(
    "reset_token_id",
    {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    token_hash: { type: String, required: true, unique: true },
    expires_at: { type: Date, required: true },
    used_at: { type: Date, default: null },
  },
  { timestamps: true },
);

resetTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
resetTokenSchema.index({ user_id: 1, used_at: 1 });

export const ResetToken = mongoose.model("ResetToken", resetTokenSchema);
