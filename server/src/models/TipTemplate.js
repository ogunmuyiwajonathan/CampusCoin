import mongoose from "mongoose";
import { idOptions } from "../utils/idOptions.js";

// The admin-managed wording behind the tips engine. An admin edits the text and
// the rule here; the engine decides when a template applies and renders it
// against the student's own numbers. That split is why the admin panel never
// has to know anything about a specific student.
const tipTemplateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    text: { type: String, required: true, trim: true, maxlength: 400 },
    // A short machine-readable condition the engine understands, e.g.
    // "category_share_above" with threshold 30. Deliberately not a script:
    // admin-authored code is not something this project can defend.
    rule: { type: String, required: true },
    threshold: { type: Number, default: null },
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    savings_impact: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
  },
  { ...idOptions("tip_template_id"), timestamps: true },
);

tipTemplateSchema.index({ is_active: 1, savings_impact: -1 });

export const TipTemplate = mongoose.model("TipTemplate", tipTemplateSchema);
