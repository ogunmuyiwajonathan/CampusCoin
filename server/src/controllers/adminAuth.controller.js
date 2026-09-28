import { z } from "zod";
import bcrypt from "bcryptjs";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/index.js";

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
