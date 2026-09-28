import mongoose from "mongoose";
import { idOptions } from "../utils/idOptions.js";

export const ACADEMIC_YEARS = [
  "Year 1",
  "Year 2",
  "Year 3",
  "Year 4",
  "Year 5",
  "Postgraduate",
];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Never selected by default. A query that forgets to ask for it must not be
    // able to leak the hash by accident.
    password_hash: { type: String, required: true, select: false },
    academic_year: { type: String, enum: ACADEMIC_YEARS, default: null },
    allowance_baseline: { type: Number, default: null, min: 0 },
    monthly_savings_goal: { type: Number, default: null, min: 0 },
    role: { type: String, enum: ["student", "admin"], default: "student" },
    // An admin can disable an account; login refuses when this is false.
    is_active: { type: Boolean, default: true },
    profile_image_url: { type: String, default: null },
  },
  { ...idOptions("user_id"), timestamps: true },
);

export const User = mongoose.model("User", userSchema);
