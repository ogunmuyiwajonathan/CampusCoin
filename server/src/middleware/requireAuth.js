import ApiError from "../utils/ApiError.js";
import { isTrustedOrigin } from "../utils/trustedOrigin.js";

export async function loadUser(req, _res, next) {
  req.user = null;
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
