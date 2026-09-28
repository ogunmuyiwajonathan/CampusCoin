import mongoose from "mongoose";
import { idOptions } from "../utils/idOptions.js";

// A student bookmarks an insight or a tip, optionally with their own note.
// Exactly one of insight_id / tip_id is set, which the route validates; both
// columns exist so a bookmark keeps pointing at the same thing even if the other
// kind is generated later.
const bookmarkSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    insight_id: { type: mongoose.Schema.Types.ObjectId, ref: "Insight", default: null },
    tip_id: { type: mongoose.Schema.Types.ObjectId, ref: "Tip", default: null },
    month: { type: String, default: null, match: /^\d{4}-\d{2}$/ },
    note: { type: String, default: "", trim: true, maxlength: 280 },
  },
  { ...idOptions("bookmark_id"), timestamps: true },
);

bookmarkSchema.index({ user_id: 1, createdAt: -1 });
bookmarkSchema.index({ user_id: 1, insight_id: 1 });
bookmarkSchema.index({ user_id: 1, tip_id: 1 });

export const Bookmark = mongoose.model("Bookmark", bookmarkSchema);
