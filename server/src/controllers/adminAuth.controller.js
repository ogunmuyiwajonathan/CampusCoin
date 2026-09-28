import { z } from "zod";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/index.js";
import { adminResetPasswordSchema } from "../validators/auth.schema.js";
import { sendPasswordResetEmail } from "../services/mail.service.js";
import {
  consumeResetCode,
  createResetCode,
  invalidateResetTokens,
  markResetTokenUsed,
  setPassword,
} from "../services/auth.service.js";

// "Remember me" trades convenience for a long-lived cookie. Both paths keep a
// real expiry, so an admin on a shared machine is never silently signed in
// forever.
const REMEMBER_TTL_SECONDS = 60 * 60 * 24 * 30;
const SHORT_TTL_SECONDS = 60 * 60 * 12;

const adminLoginSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

const GENERIC_FAIL = "Incorrect name or password.";

const adminForgotSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

// Compared against when no admin matches, so a wrong name costs the same time
// as a wrong password and cannot be told apart by timing.
const DUMMY_HASH = "$2a$10$abcdefghijklmnopqrstuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu";

// Case-insensitive exact match, so "Jonathan" finds "jonathan" without letting
// a student who happens to share an admin's name log in.
function nameMatcher(username) {
  const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}$`, "i");
}

export const adminLogin = asyncHandler(async (req, res) => {
  const parsed = adminLoginSchema.safeParse(req.body);
  if (!parsed.success) throw ApiError.badRequest(GENERIC_FAIL);

  const { username, password, rememberMe } = parsed.data;

  const admin = await User.findOne({
    name: nameMatcher(username),
    role: "admin",
    is_active: true,
  }).select("+password_hash");

  if (!admin) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw ApiError.unauthorized(GENERIC_FAIL);
  }

  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) throw ApiError.unauthorized(GENERIC_FAIL);

  await new Promise((resolve, reject) => {
    req.session.regenerate((regenErr) => {
      if (regenErr) return reject(regenErr);
      req.session.userId = admin.user_id;
      req.session.cookie.maxAge =
        (rememberMe ? REMEMBER_TTL_SECONDS : SHORT_TTL_SECONDS) * 1000;
      return req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });

  res.json({
    user: {
      user_id: admin.user_id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  });
});

// The same rule as a student's reset: whatever was typed, the answer is the
// same, so this endpoint cannot be used to discover which admin names exist.
const FORGOT_ANSWER = {
  ok: true,
  message: "If that admin name exists, a reset link is on its way.",
};

export const adminForgotPassword = asyncHandler(async (req, res) => {
  const parsed = adminForgotSchema.safeParse(req.body);
  if (!parsed.success) throw ApiError.badRequest(FORGOT_ANSWER.message);

  const admin = await User.findOne({
    name: nameMatcher(parsed.data.name),
    role: "admin",
    is_active: true,
  }).lean();

  if (admin) {
    // A fresh code supersedes any earlier one for this admin.
    await invalidateResetTokens(admin._id);
    const code = await createResetCode(admin._id);
    await sendPasswordResetEmail({ to: admin.email, firstName: admin.name, code });
  }

  res.json(FORGOT_ANSWER);
});

export const adminResetPassword = asyncHandler(async (req, res) => {
  const parsed = adminResetPasswordSchema.safeParse(req.body);
  if (!parsed.success) throw ApiError.badRequest("That code is not valid.");

  const admin = await User.findOne({
    name: nameMatcher(parsed.data.name),
    role: "admin",
    is_active: true,
  }).lean();

  // consumeResetCode throws on an unknown, expired, spent or exhausted code, so
  // this never sets a password without a live one behind it. An unknown name
  // falls through to exactly the same answer a wrong code gets.
  const token = await consumeResetCode(
    admin?._id ?? new mongoose.Types.ObjectId(),
    parsed.data.code,
  );

  await setPassword(admin._id, parsed.data.password);
  await markResetTokenUsed(token._id);
  // Every other outstanding code dies with the password.
  await invalidateResetTokens(admin._id);

  res.json({ ok: true });
});
