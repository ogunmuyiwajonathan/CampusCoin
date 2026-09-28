import session from "express-session";
import connectMongo from "connect-mongo";
import { env } from "./env.js";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

// Cookie sessions stored in MongoDB, so a server restart does not log every
// student out and two instances behind a load balancer see the same session.
//
// sameSite is "lax" rather than "strict" on purpose. A strict cookie is not
// sent on the top-level navigation that returns from a third-party login, so
// enabling Google sign-in later would silently fail with the student stuck on
// a blank callback. "lax" still blocks cross-site POSTs, which is where
// cookie-authenticated CSRF actually matters.
export function sessionMiddleware() {
  return session({
    name: "campuscoin.sid",
    secret: env.sessionSecret,
    store: connectMongo.create({
      mongoUrl: env.mongoUri,
      collectionName: "sessions",
      ttl: SESSION_TTL_SECONDS,
      autoRemove: "native",
    }),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.isProd,
      maxAge: SESSION_TTL_SECONDS * 1000,
    },
  });
}

// Where a password-reset link points. Falls back to the request host so it
// works on localhost, a preview URL, or the deployed domain without a redeploy.
export function appOrigin(req) {
  return env.appOrigin || `${req.protocol}://${req.get("host")}`;
}
