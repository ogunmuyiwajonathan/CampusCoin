import mongoose from "mongoose";
import { defineSchema } from "../utils/idOptions.js";

const tipSchema = defineSchema(
    "tip_id",
    {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    insight_id: { type: mongoose.Schema.Types.ObjectId, ref: "Insight", default: null },
    text: { type: String, required: true, trim: true, maxlength: 400 },
    // Ranked by how much money the tip could save, so the engine can order tips
    // without ranking them again on every read.
    savings_impact: { type: Number, default: 0 },
    is_pinned: { type: Boolean, default: false },
    is_dismissed: { type: Boolean, default: false },
    dismissed_at: { type: Date, default: null },
  },
  { timestamps: true },
);

tipSchema.index({ user_id: 1, is_dismissed: 1, savings_impact: -1 });

export const Tip = mongoose.model("Tip", tipSchema);
