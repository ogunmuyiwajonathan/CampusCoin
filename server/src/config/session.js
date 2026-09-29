import session from "express-session";
import connectMongo from "connect-mongo";
import { env } from "./env.js";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export const SESSION_STORE_TTL_SECONDS = 60 * 60 * 24 * 30;

export function sessionMiddleware() {
  return session({
    name: "campuscoin.sid",
    secret: env.sessionSecret,
    store: connectMongo.create({
      mongoUrl: env.mongoUri,
      collectionName: "sessions",
      ttl: SESSION_STORE_TTL_SECONDS,
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

export function appOrigin(req) {
  return env.appOrigin || `${req.protocol}://${req.get("host")}`;
}
