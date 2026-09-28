import mongoose from "mongoose";
import { idOptions } from "../utils/idOptions.js";

const notificationSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 300 },
    icon: { type: String, default: "bell" },
    // An in-app route, e.g. /budgets. Kept as a path rather than a URL so a
    // notification can never point the student at another site.
    to: { type: String, default: "/" },
    is_read: { type: Boolean, default: false },
    read_at: { type: Date, default: null },
    // Identifies the thing that raised it, e.g. "budget-near:<budget_id>".
    // The unique index on (user_id, dedupe_key) is what stops a student who
    // logs ten transactions in a row from getting ten identical alerts.
    dedupe_key: { type: String, required: true },
  },
  { ...idOptions("notification_id"), timestamps: true },
);

notificationSchema.index({ user_id: 1, dedupe_key: 1 }, { unique: true });
notificationSchema.index({ user_id: 1, is_read: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);
