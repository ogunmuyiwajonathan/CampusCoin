import crypto from "node:crypto";
import { z } from "zod";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { env } from "../config/env.js";

const REMEMBER_TTL_SECONDS = 60 * 60 * 24 * 30;
const SHORT_TTL_SECONDS = 60 * 60 * 12;

const adminLoginSchema = z.object({
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

const GENERIC_FAIL = "Incorrect password.";

function passwordMatches(password, expected) {
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function adminName() {
  const local = env.adminEmail?.split("@")[0]?.trim();
  return local || "Admin";
}

export const adminLogin = asyncHandler(async (req, res) => {
  const parsed = adminLoginSchema.safeParse(req.body);
  if (!parsed.success) throw ApiError.badRequest(GENERIC_FAIL);

  const { password, rememberMe } = parsed.data;
  const expected = env.adminSeedPassword || "";

  if (!expected || !passwordMatches(password, expected)) {
    if (!expected) {
      console.error("[auth] ADMIN_SEED_PASSWORD is not set, so no admin can sign in.");
    }
    throw ApiError.unauthorized(GENERIC_FAIL);
  }

  await new Promise((resolve, reject) => {
    req.session.regenerate((regenErr) => {
      if (regenErr) return reject(regenErr);
      req.session.isAdmin = true;
      req.session.cookie.maxAge =
        (rememberMe ? REMEMBER_TTL_SECONDS : SHORT_TTL_SECONDS) * 1000;
      return req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });

  res.json({
    user: {
      user_id: null,
      name: adminName(),
      email: env.adminEmail ?? "admin@campuscoin.test",
      role: "admin",
    },
  });
});
