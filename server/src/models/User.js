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
    // Never selected by default. A query that forgets to ask for it must not be
    // able to leak the hash by accident.
    password_hash: { type: String, required: true, select: false },
    academic_year: { type: String, enum: ACADEMIC_YEARS, default: null },
    allowance_baseline: { type: Number, default: null, min: 0 },
    monthly_savings_goal: { type: Number, default: null, min: 0 },
    role: { type: String, enum: ["student", "admin"], default: "student" },
    // Set once the first-login profile card has been filled in or skipped, so it
    // is never shown twice. Seeded accounts ship with it already true.
    profileOnboarded: { type: Boolean, default: false },
    // An admin can disable an account; login refuses when this is false.
    is_active: { type: Boolean, default: true },
    profile_image_url: { type: String, default: null },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
