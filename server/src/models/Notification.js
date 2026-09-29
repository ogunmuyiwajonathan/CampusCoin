import mongoose from "mongoose";
import { defineSchema } from "../utils/idOptions.js";

const notificationSchema = defineSchema(
    "notification_id",
    {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 300 },
    icon: { type: String, default: "bell" },
    to: { type: String, default: "/" },
    is_read: { type: Boolean, default: false },
    read_at: { type: Date, default: null },
    dedupe_key: { type: String, required: true },
  },
  { timestamps: true },
);

notificationSchema.index({ user_id: 1, dedupe_key: 1 }, { unique: true });
notificationSchema.index({ user_id: 1, is_read: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);
