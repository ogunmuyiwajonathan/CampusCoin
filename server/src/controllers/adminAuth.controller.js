import { z } from "zod";
import bcrypt from "bcryptjs";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/index.js";
import { env } from "../config/env.js";
import { normaliseEmail } from "../services/auth.service.js";

// "Remember me" trades convenience for a long-lived cookie. Both paths keep a
// real expiry, so an admin on a shared machine is never silently signed in
// forever.
const REMEMBER_TTL_SECONDS = 60 * 60 * 24 * 30;
const SHORT_TTL_SECONDS = 60 * 60 * 12;

// There is one admin account and the visitor is never asked to name it. Only a
// password is typed, so nothing in the request body can point the lookup at a
// different account.
const adminLoginSchema = z.object({
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

const GENERIC_FAIL = "Incorrect password.";

// Compared against when no admin matches, so a missing or unseeded ADMIN_EMAIL
// still costs the same time as a real password check and cannot be told apart
// from one by how long the response took.
const DUMMY_HASH = "$2a$10$abcdefghijklmnopqrstuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu";

export const adminLogin = asyncHandler(async (req, res) => {
  const parsed = adminLoginSchema.safeParse(req.body);
  if (!parsed.success) throw ApiError.badRequest(GENERIC_FAIL);

  const { password, rememberMe } = parsed.data;

  // The address is configuration, not input. It never travels from the browser,
  // so the login form cannot be used to probe for other admin accounts, and
  // there is no name to mistype.
  const adminEmail = env.adminEmail ? normaliseEmail(env.adminEmail) : null;
  const admin = adminEmail
    ? await User.findOne({ email: adminEmail, role: "admin", is_active: true }).select("+password_hash")
    : null;

  if (!admin) {
    // Still burn a bcrypt comparison so an unseeded or mistyped ADMIN_EMAIL does
    // not answer faster than a wrong password does.
    await bcrypt.compare(password, DUMMY_HASH);
    if (!adminEmail) {
      console.error("[auth] ADMIN_EMAIL is not set, so no admin can sign in.");
    }
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
