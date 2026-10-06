import rateLimit from "express-rate-limit";

const JSON = (message) => ({ error: { message } });

/**
 * `keyGenerator` used to be dropped here: the helper destructured only four
 * options and rebuilt the config from them, so a limiter that asked to be keyed
 * by account silently fell back to express-rate-limit's IP default. Spreading
 * the rest through means a new option cannot be quietly ignored again.
 */
function limiter({ windowMs, limit, message, skipSuccessfulRequests = false, ...rest }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skipSuccessfulRequests,
    message: JSON(message),
    ...rest,
  });
}

export const authLoginLimiter = limiter({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: "Too many failed sign-in attempts. Please wait 5 minutes and try again.",
});

export const authRegisterLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: "Too many accounts created from this network. Please try again later.",
});

export const forgotPasswordLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: "Too many password reset requests. Please try again in 15 minutes.",
});

export const adminLoginLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  message: "Too many admin sign-in attempts. Please try again in 15 minutes.",
});

export const apiLimiter = limiter({
  windowMs: 5 * 60 * 1000,
  limit: 300,
  message: "Too many requests. Please wait a moment and try again.",
});

/**
 * Search fires on every pause in typing, so it gets a budget per *account*
 * rather than per IP - a shared campus NAT would otherwise spend one student's
 * allowance for everybody. 60 a minute is far above a real typing burst (one
 * request per 250 ms pause, and only once the query is 2+ characters) while
 * still capping how hard one client can hammer the database.
 */
export const searchLimiter = limiter({
  windowMs: 60 * 1000,
  limit: 60,
  // One student's burst must not spend a housemate's allowance on the same
  // wifi, so the key is the account in the session. An anonymous caller (the
  // route is behind requireAuth, but this also covers the 401 path) falls back
  // to the address, which is the only thing available.
  keyGenerator: (req) => (req.session?.userId ? `user:${req.session.userId}` : `ip:${req.ip}`),
  message:
    "Too many searches in a row. Wait a few seconds and try again - your other pages still work.",
});
