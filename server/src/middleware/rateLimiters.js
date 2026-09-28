import rateLimit from "express-rate-limit";

const JSON = (message) => ({ error: { message } });

function limiter({ windowMs, limit, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skipSuccessfulRequests,
    message: JSON(message),
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
