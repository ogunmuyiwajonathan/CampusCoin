import ApiError from "../utils/ApiError.js";
import { isTrustedOrigin } from "../utils/trustedOrigin.js";
import { env } from "../config/env.js";

function adminName() {
  const local = env.adminEmail?.split("@")[0]?.trim();
  return local || "Admin";
}

function adminPrincipal() {
  return Object.freeze({
    _id: null,
    user_id: null,
    name: adminName(),
    email: env.adminEmail ?? "admin@campuscoin.test",
    academic_year: null,
    allowance_baseline: null,
    monthly_savings_goal: null,
    role: "admin",
    profileOnboarded: true,
    is_active: true,
    profile_image_url: null,
    createdAt: null,
    created_at: null,
  });
}

export async function loadUser(req, _res, next) {
  req.user = null;
  if (req.session?.isAdmin) {
    req.user = adminPrincipal();
    return next();
  }
  const userId = req.session?.userId;
  if (!userId) return next();

  const { User } = await import("../models/index.js");
  const user = await User.findById(userId);
  if (!user || !user.is_active) {
    return next(ApiError.unauthorized("Your account is no longer active."));
  }
  req.user = user;
  return next();
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(ApiError.unauthorized("Please log in to continue."));
  return next();
}

export function requireAdmin(req, _res, next) {
  if (!req.user) return next(ApiError.unauthorized("Please log in to continue."));
  if (req.user.role !== "admin") {
    return next(ApiError.forbidden("This action is for administrators."));
  }
  return next();
}

export function requireTrustedOrigin(req, _res, next) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }
  if (isTrustedOrigin(req.get("origin"), req.get("host"))) return next();
  return next(ApiError.forbidden("Request origin is not allowed."));
}
