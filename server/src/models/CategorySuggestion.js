import mongoose from "mongoose";
import { defineSchema } from "../utils/idOptions.js";

const categorySuggestionSchema = defineSchema(
    "category_suggestion_id",
    {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    description_key: { type: String, required: true, lowercase: true, trim: true },
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    hit_count: { type: Number, default: 1, min: 0 },
  },
  { timestamps: true },
);

categorySuggestionSchema.index({ user_id: 1, description_key: 1 }, { unique: true });

export const CategorySuggestion = mongoose.model(
  "CategorySuggestion",
  categorySuggestionSchema,
);
