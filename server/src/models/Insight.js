import mongoose from "mongoose";
import { defineSchema } from "../utils/idOptions.js";

const insightSchema = defineSchema(
    "insight_id",
    {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    summary_text: { type: String, required: true },
    tip_text: { type: String, required: true },
    generated_at: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

insightSchema.index({ user_id: 1, month: 1 }, { unique: true });
insightSchema.index({ user_id: 1, generated_at: -1 });

export const Insight = mongoose.model("Insight", insightSchema);
