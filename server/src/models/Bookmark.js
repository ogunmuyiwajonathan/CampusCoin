import mongoose from "mongoose";
import { defineSchema } from "../utils/idOptions.js";

const bookmarkSchema = defineSchema(
    "bookmark_id",
    {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    insight_id: { type: mongoose.Schema.Types.ObjectId, ref: "Insight", default: null },
    tip_id: { type: mongoose.Schema.Types.ObjectId, ref: "Tip", default: null },
    month: { type: String, default: null, match: /^\d{4}-\d{2}$/ },
    note: { type: String, default: "", trim: true, maxlength: 280 },
  },
  { timestamps: true },
);

bookmarkSchema.index({ user_id: 1, createdAt: -1 });
bookmarkSchema.index({ user_id: 1, insight_id: 1 });
bookmarkSchema.index({ user_id: 1, tip_id: 1 });

export const Bookmark = mongoose.model("Bookmark", bookmarkSchema);
