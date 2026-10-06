import mongoose from "mongoose";
import { defineSchema } from "../utils/idOptions.js";

export const ACADEMIC_YEARS = [
  "100 Level",
  "200 Level",
  "300 Level",
  "400 Level",
  "500 Level",
  "Graduated",
  "Not a student",
];

const userSchema = defineSchema(
    "user_id",
    {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password_hash: { type: String, required: true, select: false },
    academic_year: { type: String, enum: ACADEMIC_YEARS, default: null },
    allowance_baseline: { type: Number, default: null, min: 0 },
    monthly_savings_goal: { type: Number, default: null, min: 0 },
    role: { type: String, enum: ["student", "admin"], default: "student" },
    profileOnboarded: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
    profile_image_url: { type: String, default: null },
  },
  { timestamps: true },
);

// Added for the admin typeahead. explain() showed the admin user search
// ($or over name and email) answering COLLSCAN while email_1 sat unused: one
// branch of the $or was indexed and the other was not, so the planner had no
// index-only plan and fell back to reading every account. With name_1 present
// the same query plans as IXSCAN email_1 + name_1. A compound {name, email}
// does NOT help - MongoDB needs one index per $or branch - so this is a single
// field index on purpose.
userSchema.index({ name: 1 });

export const User = mongoose.model("User", userSchema);
