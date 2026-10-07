import mongoose from "mongoose";
import { defineSchema } from "../utils/idOptions.js";

const announcementSchema = defineSchema(
  "announcement_id",
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

announcementSchema.index({ title: 1 });
announcementSchema.index({ body: 1 });

export const Announcement = mongoose.model("Announcement", announcementSchema);
