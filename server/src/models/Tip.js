import mongoose from "mongoose";
import { defineSchema } from "../utils/idOptions.js";

const tipSchema = defineSchema(
    "tip_id",
    {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    month: { type: String, match: /^\d{4}-\d{2}$/ },
    template_key: { type: String, lowercase: true, trim: true },
    insight_id: { type: mongoose.Schema.Types.ObjectId, ref: "Insight", default: null },
    text: { type: String, required: true, trim: true, maxlength: 400 },
    savings_impact: { type: Number, default: 0 },
    is_pinned: { type: Boolean, default: false },
    is_dismissed: { type: Boolean, default: false },
    dismissed_at: { type: Date, default: null },
  },
  { timestamps: true },
);

tipSchema.index({ user_id: 1, is_dismissed: 1, savings_impact: -1 });
tipSchema.index({ user_id: 1, month: 1, is_pinned: -1, savings_impact: -1 });
tipSchema.index({ user_id: 1, month: 1, template_key: 1 }, { unique: true, sparse: true });

export const Tip = mongoose.model("Tip", tipSchema);
