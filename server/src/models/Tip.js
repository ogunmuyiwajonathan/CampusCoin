import mongoose from "mongoose";
import { defineSchema } from "../utils/idOptions.js";

const tipSchema = defineSchema(
    "tip_id",
    {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // The month the numbers behind this tip came from, so a read can find them
    // again without the client having to remember what it asked for.
    month: { type: String, match: /^\d{4}-\d{2}$/ },
    // Which admin template produced it. The engine rewrites a month on every
    // read, so this is the only stable way for the client to tell one tip from
    // another across a regeneration.
    template_key: { type: String, lowercase: true, trim: true },
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
// Serves listTips for one month, which is the only read the dashboard makes.
tipSchema.index({ user_id: 1, month: 1, is_pinned: -1, savings_impact: -1 });
// One tip per template per month. This is what makes a regeneration an update of
// the same row rather than a delete and a fresh insert, so a pin the student set
// survives every later pass.
tipSchema.index({ user_id: 1, month: 1, template_key: 1 }, { unique: true, sparse: true });

export const Tip = mongoose.model("Tip", tipSchema);
