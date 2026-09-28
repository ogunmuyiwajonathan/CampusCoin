import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { env } from "./config/env.js";
import { sessionMiddleware } from "./config/session.js";
import { loadUser, requireTrustedOrigin } from "./middleware/requireAuth.js";
import routes from "./routes/index.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

// One reverse proxy in front of us in production (Render/Railway). Without this
// every request looks like it came from the proxy, so rate limiting would count
// all visitors as one client.
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

// Uploaded avatars. Served from here rather than the client bundle so the URL
// on the user record keeps working after a redeploy.
app.use(
  "/uploads",
  express.static(env.uploadDir, { maxAge: "7d", index: false, dotfiles: "deny" }),
);

if (!env.isProd) {
  app.use(morgan("dev"));
}

// Session first, then the user it identifies. Both have to sit above the
// routes, and loadUser has to sit above every route that reads req.user.
app.use(sessionMiddleware());
app.use(loadUser);
app.use(requireTrustedOrigin);

// Brute-force guard on the auth routes. The limit is per IP per window, and the
// message never says whether an account exists.
//
// The test run raises the ceiling so the suite's own deliberate bad-credential
// attempts do not throttle each other. Development and production keep the real
// limit of 5, because that is the behaviour worth having.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.nodeEnv === "test" ? 1000 : 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: { message: "Too many attempts. Please try again in 15 minutes." },
  },
});

app.use("/api/auth", authLimiter);

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
