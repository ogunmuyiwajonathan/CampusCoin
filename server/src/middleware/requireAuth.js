import ApiError from "../utils/ApiError.js";
import { isTrustedOrigin } from "../utils/trustedOrigin.js";

// Reads the acting user off the session and puts it on the request. Never reads
// a user id from the body, the query string or a header: the session is the
// only thing that decides who the caller is. A route that accepted user_id
// from a request would let any student read anyone else's ledger.
export async function loadUser(req, _res, next) {
  req.user = null;
  const userId = req.session?.userId;
  if (!userId) return next();

  const { User } = await import("../models/index.js");
  const user = await User.findById(userId);
  // A disabled or deleted account keeps its cookie but loses access
  // immediately, which is what makes the admin disable button work at once
  // rather than at the next login.
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

// Cookie auth is only safe if a cross-site form cannot borrow the cookie.
// sameSite=lax already blocks cross-site POSTs in current browsers, but that is
// a browser setting we do not control, so a state-changing request from an
// origin that is not trusted is refused outright. The rules live in one place
// with the CORS check so the two can never drift apart: the CORS_ORIGIN
// allowlist everywhere, plus loopback and same-host origins while developing.
export function requireTrustedOrigin(req, _res, next) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }
  if (isTrustedOrigin(req.get("origin"), req.get("host"))) return next();
  return next(ApiError.forbidden("Request origin is not allowed."));
}
