import mongoose from "mongoose";
import { defineSchema } from "../utils/idOptions.js";

const categorySchema = defineSchema(
    "category_id",
    {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    type: { type: String, enum: ["income", "expense"], required: true },
    is_default: { type: Boolean, default: false },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    color: { type: String, default: null },
    icon: { type: String, default: null },
    icon_key: { type: String, default: null, trim: true, maxlength: 60 },
    icon_svg: { type: String, default: null, maxlength: 4096 },
  },
  { timestamps: true },
);

categorySchema.index({ user_id: 1, type: 1 });
categorySchema.index({ is_default: 1 });
categorySchema.index({ user_id: 1, name: 1, type: 1 }, { unique: true });

export const Category = mongoose.model("Category", categorySchema);
