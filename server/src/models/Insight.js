import mongoose from "mongoose";
import { defineSchema } from "../utils/idOptions.js";

// One document per student per month. The SRS describes an Insight carrying a
// history array, but an array that grows every month is the wrong shape: it
// makes every read fetch all history, it can approach the 16 MB document limit,
// and two months can never be compared without reading both in full. History is
// therefore a query over past months (GET /api/insights/history), which is the
// same data with none of those costs.
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
