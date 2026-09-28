import mongoose from "mongoose";
import { defineSchema } from "../utils/idOptions.js";

// Only the hash of a reset code is stored. A database leak therefore does not
// hand an attacker a working password-reset code, and expires_at is a real TTL
// index so Mongo deletes stale rows instead of us sweeping them by hand.
// A 6 digit code has only a million possible values, so hashing on its own is
// weak protection; attempts is what actually stops the guessing.
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
