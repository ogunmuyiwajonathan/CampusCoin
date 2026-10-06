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

// Added for the admin typeahead, on the same evidence as User.name: the search
// is $or over title and body, and a single compound {title, body} still planned
// as COLLSCAN while one index per branch planned as IXSCAN title_1 + body_1.
// The compound form is measurably useless here, so these are two single-field
// indexes and the reason is recorded rather than guessed at next time.
announcementSchema.index({ title: 1 });
announcementSchema.index({ body: 1 });

export const Announcement = mongoose.model("Announcement", announcementSchema);
