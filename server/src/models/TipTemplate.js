import mongoose from "mongoose";
import { defineSchema } from "../utils/idOptions.js";

const tipTemplateSchema = defineSchema(
    "tip_template_id",
    {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    text: { type: String, required: true, trim: true, maxlength: 400 },
    rule: { type: String, required: true },
    threshold: { type: Number, default: null },
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    savings_impact: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

tipTemplateSchema.index({ is_active: 1, savings_impact: -1 });

// Added for the admin typeahead. key is already uniquely indexed, but the search
// is $or over text and key, so the un-indexed text branch was enough to force a
// COLLSCAN. One index per $or branch: explain() plans IXSCAN key_1 + text_1.
tipTemplateSchema.index({ text: 1 });

export const TipTemplate = mongoose.model("TipTemplate", tipTemplateSchema);
