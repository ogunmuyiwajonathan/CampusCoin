import mongoose from "mongoose";
import { defineSchema } from "../utils/idOptions.js";

const announcementSchema = defineSchema(
  "announcement_id",
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const Announcement = mongoose.model("Announcement", announcementSchema);
