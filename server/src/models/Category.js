import mongoose from "mongoose";
import { defineSchema } from "../utils/idOptions.js";

// A system default category has user_id: null. A personal category belongs to
// exactly one student. That single field is the is_default story the SRS asks
// for, and it is also the ownership check: a student may only ever read or
// write categories where user_id matches their session.
const categorySchema = defineSchema(
    "category_id",
    {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    type: { type: String, enum: ["income", "expense"], required: true },
    is_default: { type: Boolean, default: false },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    // The client used to look these up from hardcoded maps keyed by c1..c11.
    // Once ids come from the database those maps miss, so the presentation
    // values travel with the category instead.
    color: { type: String, default: null },
    icon: { type: String, default: null },
  },
  { timestamps: true },
);

categorySchema.index({ user_id: 1, type: 1 });
categorySchema.index({ is_default: 1 });
// A student cannot create the same name twice for the same type, and the system
// defaults are unique among themselves because they all share user_id: null.
categorySchema.index({ user_id: 1, name: 1, type: 1 }, { unique: true });

export const Category = mongoose.model("Category", categorySchema);
