import mongoose from "mongoose";
import { idOptions } from "../utils/idOptions.js";

// This is the whole of "learns from corrections", honestly implemented: when a
// student overrides a suggestion, the description they typed and the category
// they chose are recorded here, and the suggester reads this table before it
// falls back to keyword matching. It is per student, so one person's habits
// never leak into another's suggestions.
const categorySuggestionSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Lower-cased description text or fragment, e.g. "bus fare".
    description_key: { type: String, required: true, lowercase: true, trim: true },
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    // How many times the student has confirmed this pairing. A single correction
    // is a weak signal; a repeated one is worth ranking above the keyword rules.
    hit_count: { type: Number, default: 1, min: 0 },
  },
  { ...idOptions("category_suggestion_id"), timestamps: true },
);

// Re-learning the same fragment updates the existing row instead of piling up
// near-duplicates, which is what keeps this table small enough to scan.
categorySuggestionSchema.index({ user_id: 1, description_key: 1 }, { unique: true });

export const CategorySuggestion = mongoose.model(
  "CategorySuggestion",
  categorySuggestionSchema,
);
