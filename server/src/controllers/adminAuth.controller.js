import { z } from "zod";
import bcrypt from "bcryptjs";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/index.js";
import { env } from "../config/env.js";
import { normaliseEmail } from "../services/auth.service.js";

const REMEMBER_TTL_SECONDS = 60 * 60 * 24 * 30;
const SHORT_TTL_SECONDS = 60 * 60 * 12;

const adminLoginSchema = z.object({
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

const GENERIC_FAIL = "Incorrect password.";

const DUMMY_HASH = "$2a$10$abcdefghijklmnopqrstuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu";

export const adminLogin = asyncHandler(async (req, res) => {
  const parsed = adminLoginSchema.safeParse(req.body);
  if (!parsed.success) throw ApiError.badRequest(GENERIC_FAIL);

  const { password, rememberMe } = parsed.data;

  const adminEmail = env.adminEmail ? normaliseEmail(env.adminEmail) : null;
  const admin = adminEmail
    ? await User.findOne({ email: adminEmail, role: "admin", is_active: true }).select("+password_hash")
    : null;

  if (!admin) {
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
